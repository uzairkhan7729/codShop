import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { sanitizeText } from '@/lib/sanitize';
import type {
  IProductRepository,
  IReviewRepository,
  Paginated,
  PaginationParams,
  RatingAggregate,
  ReviewWithUser,
} from '@/server/repositories';
import type { ProductService } from './product.service';

export interface CreateReviewInput {
  productId: string;
  rating: number;
  title?: string;
  comment?: string;
}

/**
 * ReviewService — review CRUD + keeps the denormalized product rating in sync.
 */
export class ReviewService {
  constructor(
    private readonly reviews: IReviewRepository,
    private readonly products: IProductRepository,
    private readonly productService: ProductService,
  ) {}

  listForProduct(
    productId: string,
    pagination: PaginationParams,
  ): Promise<Paginated<ReviewWithUser>> {
    return this.reviews.findByProduct(productId, pagination);
  }

  ratingSummary(productId: string): Promise<RatingAggregate> {
    return this.reviews.aggregateForProduct(productId);
  }

  listByUser(userId: string): Promise<ReviewWithUser[]> {
    return this.reviews.listByUser(userId);
  }

  async addReview(userId: string, input: CreateReviewInput): Promise<void> {
    if (input.rating < 1 || input.rating > 5) {
      throw new BadRequestError('Rating must be between 1 and 5');
    }
    const product = await this.products.findById(input.productId);
    if (!product) throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');

    const existing = await this.reviews.findUserReviewForProduct(userId, input.productId);
    if (existing) throw new ConflictError('You have already reviewed this product', 'ALREADY_REVIEWED');

    await this.reviews.create({
      rating: input.rating,
      title: sanitizeText(input.title),
      comment: sanitizeText(input.comment),
      product: { connect: { id: input.productId } },
      user: { connect: { id: userId } },
    });
    await this.syncProductRating(input.productId);
  }

  async deleteReview(userId: string, reviewId: string, isAdmin: boolean): Promise<void> {
    const review = await this.reviews.findById(reviewId);
    if (!review) throw new NotFoundError('Review not found', 'REVIEW_NOT_FOUND');
    if (review.userId !== userId && !isAdmin) {
      throw new ForbiddenError('You cannot delete this review');
    }
    await this.reviews.delete(reviewId);
    await this.syncProductRating(review.productId);
  }

  /** Recompute and persist the product's ratingAvg/ratingCount, then bust caches. */
  private async syncProductRating(productId: string): Promise<void> {
    const agg = await this.reviews.aggregateForProduct(productId);
    await this.products.update(productId, { ratingAvg: agg.average, ratingCount: agg.count });
    await this.productService.invalidate();
  }
}
