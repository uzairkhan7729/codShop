import type { Category, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type CategoryWithChildren = Category & { children: Category[] };
export type MegaCategory = Category & {
  children: (Category & { children: Category[] })[];
};

/** ICategoryRepository — hierarchy reads + admin CRUD. */
export interface ICategoryRepository {
  findAll(): Promise<Category[]>;
  findTree(): Promise<CategoryWithChildren[]>;
  findMegaTree(): Promise<MegaCategory[]>;
  findBySlug(slug: string): Promise<Category | null>;
  findById(id: string): Promise<Category | null>;
  /** All descendant category ids (inclusive) for filtering products in a subtree. */
  descendantIds(categoryId: string): Promise<string[]>;
  create(data: Prisma.CategoryCreateInput): Promise<Category>;
  update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category>;
  delete(id: string): Promise<void>;
}

export class CategoryRepository implements ICategoryRepository {
  findAll(): Promise<Category[]> {
    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /** Top-level categories with their immediate children (two-level menu). */
  findTree(): Promise<CategoryWithChildren[]> {
    return prisma.category.findMany({
      // Top-level docs have no parentId field at all in MongoDB — match with isSet.
      where: { isActive: true, parentId: { isSet: false } },
      include: { children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /** Three-level hierarchy for the mega menu: department -> category -> subcategory. */
  findMegaTree(): Promise<MegaCategory[]> {
    return prisma.category.findMany({
      where: { isActive: true, parentId: { isSet: false } },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: { children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findBySlug(slug: string): Promise<Category | null> {
    return prisma.category.findUnique({ where: { slug } });
  }

  findById(id: string): Promise<Category | null> {
    return prisma.category.findUnique({ where: { id } });
  }

  async descendantIds(categoryId: string): Promise<string[]> {
    const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
    const childrenOf = new Map<string, string[]>();
    for (const c of all) {
      if (!c.parentId) continue;
      const list = childrenOf.get(c.parentId) ?? [];
      list.push(c.id);
      childrenOf.set(c.parentId, list);
    }
    const result: string[] = [];
    const stack = [categoryId];
    while (stack.length) {
      const current = stack.pop()!;
      result.push(current);
      stack.push(...(childrenOf.get(current) ?? []));
    }
    return result;
  }

  create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return prisma.category.create({ data });
  }

  update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return prisma.category.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.category.delete({ where: { id } });
  }
}
