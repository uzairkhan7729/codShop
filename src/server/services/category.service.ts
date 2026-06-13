import type { Category } from '@prisma/client';
import { CACHE_KEYS, CACHE_TTL, type ICache } from '@/lib/cache';
import { NotFoundError } from '@/lib/errors';
import type { CategoryWithChildren, ICategoryRepository } from '@/server/repositories';

/** CategoryService — hierarchy reads (cached) + admin CRUD. */
export class CategoryService {
  constructor(
    private readonly categories: ICategoryRepository,
    private readonly cache: ICache,
  ) {}

  async getAll(): Promise<Category[]> {
    const cached = await this.cache.get<Category[]>(`${CACHE_KEYS.categories}all`);
    if (cached) return cached;
    const all = await this.categories.findAll();
    await this.cache.set(`${CACHE_KEYS.categories}all`, all, CACHE_TTL.categories);
    return all;
  }

  async getTree(): Promise<CategoryWithChildren[]> {
    const cached = await this.cache.get<CategoryWithChildren[]>(`${CACHE_KEYS.categories}tree`);
    if (cached) return cached;
    const tree = await this.categories.findTree();
    await this.cache.set(`${CACHE_KEYS.categories}tree`, tree, CACHE_TTL.categories);
    return tree;
  }

  async getBySlug(slug: string): Promise<Category> {
    const category = await this.categories.findBySlug(slug);
    if (!category) throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
    return category;
  }

  async create(data: {
    name: string;
    slug: string;
    description?: string;
    image?: string;
    parentId?: string;
  }): Promise<Category> {
    const category = await this.categories.create({
      name: data.name,
      slug: data.slug,
      description: data.description,
      image: data.image,
      ...(data.parentId ? { parent: { connect: { id: data.parentId } } } : {}),
    });
    await this.invalidate();
    return category;
  }

  async update(
    id: string,
    data: Partial<{ name: string; slug: string; description: string; image: string; isActive: boolean }>,
  ): Promise<Category> {
    const category = await this.categories.update(id, data);
    await this.invalidate();
    return category;
  }

  async delete(id: string): Promise<void> {
    await this.categories.delete(id);
    await this.invalidate();
  }

  private async invalidate(): Promise<void> {
    await this.cache.delByPrefix(CACHE_KEYS.categories);
  }
}
