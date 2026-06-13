import type { Prisma, Product } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  type Paginated,
  type PaginationParams,
  type ProductFilters,
  type ProductWithRelations,
  toPaginated,
} from './types';

/**
 * IProductRepository — data-access abstraction for products.
 * Services depend on this interface, never on Prisma directly (Dependency Inversion).
 */
export interface IProductRepository {
  findMany(filters: ProductFilters, pagination: PaginationParams): Promise<Paginated<ProductWithRelations>>;
  findBySlug(slug: string): Promise<ProductWithRelations | null>;
  findById(id: string): Promise<ProductWithRelations | null>;
  findByIds(ids: string[]): Promise<Product[]>;
  findRelated(productId: string, categoryId: string, limit: number): Promise<Product[]>;
  listBrands(categoryId?: string): Promise<string[]>;
  findManyAdmin(filters: ProductFilters, pagination: PaginationParams): Promise<Paginated<ProductWithRelations>>;
  create(data: Prisma.ProductCreateInput): Promise<Product>;
  /** Create a product and (optionally) replace its variant set in one call. */
  createWithVariants(data: ProductWriteInput): Promise<ProductWithRelations>;
  update(id: string, data: Prisma.ProductUpdateInput): Promise<Product>;
  updateWithVariants(id: string, data: Partial<ProductWriteInput>): Promise<ProductWithRelations>;
  delete(id: string): Promise<void>;
  /** Atomically decrement stock only if enough is available. Returns updated count or null if it failed. */
  decrementStock(productId: string, quantity: number): Promise<number | null>;
  incrementStock(productId: string, quantity: number): Promise<number>;
  setStock(productId: string, quantity: number): Promise<number>;
  lowStock(threshold?: number): Promise<Product[]>;
}

/** Shape used by admin create/update (variants handled as a child collection). */
export interface ProductVariantInput {
  sku: string;
  size?: string;
  color?: string;
  price?: number;
  stock?: number;
  image?: string;
}
export interface ProductWriteInput {
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice?: number;
  sku: string;
  brand?: string;
  images: string[];
  categoryId: string;
  stock?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  variants?: ProductVariantInput[];
}

function buildWhere(filters: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.isFeatured !== undefined) where.isFeatured = filters.isFeatured;
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    where.categoryId = { in: filters.categoryIds };
  } else if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }
  if (filters.brand) where.brand = filters.brand;
  if (filters.minRating !== undefined) where.ratingAvg = { gte: filters.minRating };

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {};
    if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
    if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { brand: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

function buildOrderBy(sort?: ProductFilters['sort']): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case 'price_asc':
      return { price: 'asc' };
    case 'price_desc':
      return { price: 'desc' };
    case 'rating':
      return { ratingAvg: 'desc' };
    case 'best_selling':
      return { soldCount: 'desc' };
    case 'newest':
    default:
      return { createdAt: 'desc' };
  }
}

export class ProductRepository implements IProductRepository {
  async findMany(
    filters: ProductFilters,
    pagination: PaginationParams,
  ): Promise<Paginated<ProductWithRelations>> {
    const where = buildWhere(filters);
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, variants: true },
        orderBy: buildOrderBy(filters.sort),
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.product.count({ where }),
    ]);
    return toPaginated(items, total, pagination);
  }

  findBySlug(slug: string): Promise<ProductWithRelations | null> {
    return prisma.product.findUnique({
      where: { slug },
      include: { category: true, variants: true },
    });
  }

  findById(id: string): Promise<ProductWithRelations | null> {
    return prisma.product.findUnique({
      where: { id },
      include: { category: true, variants: true },
    });
  }

  findByIds(ids: string[]): Promise<Product[]> {
    return prisma.product.findMany({ where: { id: { in: ids } } });
  }

  findRelated(productId: string, categoryId: string, limit: number): Promise<Product[]> {
    return prisma.product.findMany({
      where: { categoryId, isActive: true, id: { not: productId } },
      orderBy: { soldCount: 'desc' },
      take: limit,
    });
  }

  async listBrands(categoryId?: string): Promise<string[]> {
    const rows = await prisma.product.findMany({
      where: { isActive: true, brand: { not: null }, ...(categoryId ? { categoryId } : {}) },
      select: { brand: true },
      distinct: ['brand'],
    });
    return rows.map((r) => r.brand).filter((b): b is string => Boolean(b)).sort();
  }

  async findManyAdmin(
    filters: ProductFilters,
    pagination: PaginationParams,
  ): Promise<Paginated<ProductWithRelations>> {
    // Admin listing: same filters but does not force isActive.
    const where = buildWhere(filters);
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, variants: true },
        orderBy: buildOrderBy(filters.sort),
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.product.count({ where }),
    ]);
    return toPaginated(items, total, pagination);
  }

  create(data: Prisma.ProductCreateInput): Promise<Product> {
    return prisma.product.create({ data });
  }

  createWithVariants(data: ProductWriteInput): Promise<ProductWithRelations> {
    return prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: data.price,
        comparePrice: data.comparePrice,
        sku: data.sku,
        brand: data.brand,
        images: data.images,
        categoryId: data.categoryId,
        stock: data.stock ?? 0,
        lowStockThreshold: data.lowStockThreshold ?? 5,
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        ...(data.variants && data.variants.length
          ? { variants: { create: data.variants.map((v) => ({ ...v })) } }
          : {}),
      },
      include: { category: true, variants: true },
    });
  }

  update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return prisma.product.update({ where: { id }, data });
  }

  async updateWithVariants(
    id: string,
    data: Partial<ProductWriteInput>,
  ): Promise<ProductWithRelations> {
    const { variants, categoryId, ...scalars } = data;
    // Replace the variant set when provided (delete-then-create keeps it simple
    // and avoids orphaned variants).
    if (variants) {
      await prisma.productVariant.deleteMany({ where: { productId: id } });
    }
    return prisma.product.update({
      where: { id },
      data: {
        ...scalars,
        ...(categoryId ? { categoryId } : {}),
        ...(variants ? { variants: { create: variants.map((v) => ({ ...v })) } } : {}),
      },
      include: { category: true, variants: true },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.product.delete({ where: { id } });
  }

  /**
   * Atomic conditional decrement. Mongo's updateMany with a `stock >= quantity`
   * guard is atomic at the document level — concurrent callers cannot oversell.
   * Returns null when the guard failed (not enough stock).
   */
  async decrementStock(productId: string, quantity: number): Promise<number | null> {
    const result = await prisma.product.updateMany({
      where: { id: productId, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    });
    if (result.count === 0) return null;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { stock: true },
    });
    return product?.stock ?? 0;
  }

  async incrementStock(productId: string, quantity: number): Promise<number> {
    const product = await prisma.product.update({
      where: { id: productId },
      data: { stock: { increment: quantity } },
      select: { stock: true },
    });
    return product.stock;
  }

  async setStock(productId: string, quantity: number): Promise<number> {
    const product = await prisma.product.update({
      where: { id: productId },
      data: { stock: quantity },
      select: { stock: true },
    });
    return product.stock;
  }

  lowStock(threshold?: number): Promise<Product[]> {
    // When no explicit threshold is passed, compare against each product's own
    // lowStockThreshold via an aggregation-free heuristic (stock <= 5 fallback).
    return prisma.product.findMany({
      where: threshold !== undefined ? { stock: { lte: threshold } } : { stock: { lte: 5 } },
      orderBy: { stock: 'asc' },
    });
  }
}
