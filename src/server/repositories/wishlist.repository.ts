import type { Prisma, Product } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type WishlistEntry = Prisma.WishlistItemGetPayload<{ include: { product: true } }>;

/** IWishlistRepository — per-user saved products. */
export interface IWishlistRepository {
  list(userId: string): Promise<Product[]>;
  exists(userId: string, productId: string): Promise<boolean>;
  add(userId: string, productId: string): Promise<void>;
  remove(userId: string, productId: string): Promise<void>;
}

export class WishlistRepository implements IWishlistRepository {
  async list(userId: string): Promise<Product[]> {
    const entries = await prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
    return entries.map((e) => e.product);
  }

  async exists(userId: string, productId: string): Promise<boolean> {
    const found = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return Boolean(found);
  }

  async add(userId: string, productId: string): Promise<void> {
    // Idempotent — unique compound index prevents duplicates.
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
  }

  async remove(userId: string, productId: string): Promise<void> {
    await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
  }
}
