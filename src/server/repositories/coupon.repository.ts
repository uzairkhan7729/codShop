import type { Coupon, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  type Paginated,
  type PaginationParams,
  toPaginated,
} from './types';

/** ICouponRepository — validation lookups + admin CRUD. */
export interface ICouponRepository {
  findByCode(code: string): Promise<Coupon | null>;
  findById(id: string): Promise<Coupon | null>;
  countUserRedemptions(couponId: string, userId: string): Promise<number>;
  recordRedemption(couponId: string, userId: string, orderId: string): Promise<void>;
  incrementUsage(couponId: string): Promise<void>;
  findMany(pagination: PaginationParams): Promise<Paginated<Coupon>>;
  create(data: Prisma.CouponCreateInput): Promise<Coupon>;
  update(id: string, data: Prisma.CouponUpdateInput): Promise<Coupon>;
  delete(id: string): Promise<void>;
}

export class CouponRepository implements ICouponRepository {
  findByCode(code: string): Promise<Coupon | null> {
    return prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  }

  findById(id: string): Promise<Coupon | null> {
    return prisma.coupon.findUnique({ where: { id } });
  }

  countUserRedemptions(couponId: string, userId: string): Promise<number> {
    return prisma.couponRedemption.count({ where: { couponId, userId } });
  }

  async recordRedemption(couponId: string, userId: string, orderId: string): Promise<void> {
    await prisma.couponRedemption.create({ data: { couponId, userId, orderId } });
  }

  async incrementUsage(couponId: string): Promise<void> {
    await prisma.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
  }

  async findMany(pagination: PaginationParams): Promise<Paginated<Coupon>> {
    const [items, total] = await Promise.all([
      prisma.coupon.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.coupon.count(),
    ]);
    return toPaginated(items, total, pagination);
  }

  create(data: Prisma.CouponCreateInput): Promise<Coupon> {
    return prisma.coupon.create({ data: { ...data, code: data.code.toUpperCase() } });
  }

  update(id: string, data: Prisma.CouponUpdateInput): Promise<Coupon> {
    return prisma.coupon.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.coupon.delete({ where: { id } });
  }
}
