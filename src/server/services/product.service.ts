import type { Product } from '@prisma/client';
import { CACHE_KEYS, CACHE_TTL, type ICache } from '@/lib/cache';
import { NotFoundError } from '@/lib/errors';
import type {
  ICategoryRepository,
  IProductRepository,
  Paginated,
  PaginationParams,
  ProductFilters,
  ProductWithRelations,
} from '@/server/repositories';

export interface ProductDetail {
  product: ProductWithRelations;
  related: Product[];
}

/**
 * ProductService — product reads with caching + stock mutation.
 * Depends on repository abstractions (Dependency Inversion).
 */
export class ProductService {
  constructor(
    private readonly products: IProductRepository,
    private readonly categories: ICategoryRepository,
    private readonly cache: ICache,
  ) {}

  /** Listing with filtering + pagination, cached for 5 minutes. */
  async getProducts(
    filters: ProductFilters,
    pagination: PaginationParams,
  ): Promise<Paginated<ProductWithRelations>> {
    // Resolve a category slug (and its subtree) to concrete ids before caching.
    const resolved: ProductFilters = { isActive: true, ...filters };
    if (filters.categorySlug && !filters.categoryId) {
      const category = await this.categories.findBySlug(filters.categorySlug);
      if (!category) {
        return { items: [], total: 0, page: pagination.page, pageSize: pagination.pageSize, totalPages: 1 };
      }
      resolved.categoryId = category.id;
    }

    const cacheKey = `${CACHE_KEYS.products}${JSON.stringify({ resolved, pagination })}`;
    const cached = await this.cache.get<Paginated<ProductWithRelations>>(cacheKey);
    if (cached) return cached;

    const result = await this.products.findMany(resolved, pagination);
    await this.cache.set(cacheKey, result, CACHE_TTL.productList);
    return result;
  }

  /** Single product by slug + related products (same category). */
  async getProductBySlug(slug: string): Promise<ProductDetail> {
    const cacheKey = `${CACHE_KEYS.product}${slug}`;
    const cached = await this.cache.get<ProductDetail>(cacheKey);
    if (cached) return cached;

    const product = await this.products.findBySlug(slug);
    if (!product || !product.isActive) throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');

    const related = await this.products.findRelated(product.id, product.categoryId, 8);
    const detail: ProductDetail = { product, related };
    await this.cache.set(cacheKey, detail, CACHE_TTL.product);
    return detail;
  }

  searchProducts(
    query: string,
    filters: ProductFilters,
    pagination: PaginationParams,
  ): Promise<Paginated<ProductWithRelations>> {
    return this.getProducts({ ...filters, search: query }, pagination);
  }

  getById(id: string): Promise<ProductWithRelations | null> {
    return this.products.findById(id);
  }

  /** Set absolute stock (admin inventory). Invalidates product caches. */
  async updateStock(productId: string, quantity: number): Promise<number> {
    const stock = await this.products.setStock(productId, quantity);
    await this.invalidate();
    return stock;
  }

  async listBrands(categoryId?: string): Promise<string[]> {
    return this.products.listBrands(categoryId);
  }

  /** Invalidate listing + detail caches after any mutation (Module 10). */
  async invalidate(): Promise<void> {
    await Promise.all([
      this.cache.delByPrefix(CACHE_KEYS.products),
      this.cache.delByPrefix(CACHE_KEYS.product),
    ]);
  }
}
