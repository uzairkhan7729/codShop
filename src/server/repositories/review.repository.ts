import type { Prisma, Review } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  type Paginated,
  type PaginationParams,
  type ReviewWithUser,
  toPaginated,
} from './types';

export interface RatingAggregate {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

/** IReviewRepository — CRUD + ratings aggregation. */
export interface IReviewRepository {
  findByProduct(productId: string, pagination: PaginationParams): Promise<Paginated<ReviewWithUser>>;
  findUserReviewForProduct(userId: string, productId: string): Promise<Review | null>;
  listByUser(userId: string): Promise<ReviewWithUser[]>;
  create(data: Prisma.ReviewCreateInput): Promise<Review>;
  update(id: string, data: Prisma.ReviewUpdateInput): Promise<Review>;
  delete(id: string): Promise<void>;
  aggregateForProduct(productId: string): Promise<RatingAggregate>;
}

export class ReviewRepository implements IReviewRepository {
  async findByProduct(
    productId: string,
    pagination: PaginationParams,
  ): Promise<Paginated<ReviewWithUser>> {
    const where: Prisma.ReviewWhereInput = { productId, isApproved: true };
    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.review.count({ where }),
    ]);
    return toPaginated(items, total, pagination);
  }

  findUserReviewForProduct(userId: string, productId: string): Promise<Review | null> {
    return prisma.review.findFirst({ where: { userId, productId } });
  }

  listByUser(userId: string): Promise<ReviewWithUser[]> {
    return prisma.review.findMany({
      where: { userId },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: Prisma.ReviewCreateInput): Promise<Review> {
    return prisma.review.create({ data });
  }

  update(id: string, data: Prisma.ReviewUpdateInput): Promise<Review> {
    return prisma.review.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.review.delete({ where: { id } });
  }

  /** Compute average, count, and 1–5 star distribution for a product. */
  async aggregateForProduct(productId: string): Promise<RatingAggregate> {
    const grouped = await prisma.review.groupBy({
      by: ['rating'],
      where: { productId, isApproved: true },
      _count: { rating: true },
    });

    const distribution: RatingAggregate['distribution'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    let count = 0;
    for (const row of grouped) {
      const star = row.rating as 1 | 2 | 3 | 4 | 5;
      const c = row._count.rating;
      distribution[star] = c;
      sum += star * c;
      count += c;
    }

    return {
      average: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
      count,
      distribution,
    };
  }
}
