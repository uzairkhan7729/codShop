import type { Prisma } from '@prisma/client';

/** Generic pagination input shared across repositories. */
export interface PaginationParams {
  page: number; // 1-based
  pageSize: number;
}

/** Generic paginated result wrapper. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function toPaginated<T>(
  items: T[],
  total: number,
  { page, pageSize }: PaginationParams,
): Paginated<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export type ProductSort =
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'rating'
  | 'best_selling';

/** Filters accepted by IProductRepository.findMany. */
export interface ProductFilters {
  search?: string;
  categoryId?: string;
  /** Match products in any of these categories (a category subtree). */
  categoryIds?: string[];
  categorySlug?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  isFeatured?: boolean;
  isActive?: boolean;
  sort?: ProductSort;
}

/** Filters accepted by IOrderRepository.findMany (admin). */
export interface OrderFilters {
  userId?: string;
  status?: Prisma.EnumOrderStatusFilter['equals'];
  search?: string; // order number or customer email
  dateFrom?: Date;
  dateTo?: Date;
}

// Domain entity shapes returned by repositories — derived from Prisma so they
// stay in sync, with relations expanded where the service layer needs them.
export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: { category: true; variants: true };
}>;

export type CartWithItems = Prisma.CartGetPayload<{
  include: {
    coupon: true;
    items: { include: { product: true; variant: true } };
  };
}>;

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    items: true;
    payment: true;
    user: { select: { id: true; name: true; email: true } };
  };
}>;

export type ReviewWithUser = Prisma.ReviewGetPayload<{
  include: { user: { select: { id: true; name: true; image: true } } };
}>;

export type UserWithCounts = Prisma.UserGetPayload<{
  include: { _count: { select: { orders: true } } };
}>;
