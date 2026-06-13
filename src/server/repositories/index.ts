/**
 * Repository composition root.
 *
 * Repositories are the ONLY place Prisma is touched. Services receive these
 * abstractions (the I* interfaces) via the container, never concrete classes
 * or Prisma itself — this is the Dependency Inversion seam.
 */
import { CartRepository, type ICartRepository } from './cart.repository';
import { CategoryRepository, type ICategoryRepository } from './category.repository';
import { CouponRepository, type ICouponRepository } from './coupon.repository';
import { OrderRepository, type IOrderRepository } from './order.repository';
import { ProductRepository, type IProductRepository } from './product.repository';
import { ReviewRepository, type IReviewRepository } from './review.repository';
import { UserRepository, type IUserRepository } from './user.repository';

export interface RepositoryContainer {
  products: IProductRepository;
  orders: IOrderRepository;
  users: IUserRepository;
  carts: ICartRepository;
  reviews: IReviewRepository;
  coupons: ICouponRepository;
  categories: ICategoryRepository;
}

const globalForRepos = globalThis as unknown as { repositories?: RepositoryContainer };

export const repositories: RepositoryContainer =
  globalForRepos.repositories ?? {
    products: new ProductRepository(),
    orders: new OrderRepository(),
    users: new UserRepository(),
    carts: new CartRepository(),
    reviews: new ReviewRepository(),
    coupons: new CouponRepository(),
    categories: new CategoryRepository(),
  };

if (process.env.NODE_ENV !== 'production') {
  globalForRepos.repositories = repositories;
}

export * from './types';
export type { ICartRepository } from './cart.repository';
export type { ICategoryRepository, CategoryWithChildren } from './category.repository';
export type { ICouponRepository } from './coupon.repository';
export type { IOrderRepository } from './order.repository';
export type { IProductRepository } from './product.repository';
export type { IReviewRepository, RatingAggregate } from './review.repository';
export type { IUserRepository } from './user.repository';
