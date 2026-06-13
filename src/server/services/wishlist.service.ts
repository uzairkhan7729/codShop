import type { Product } from '@prisma/client';
import { NotFoundError } from '@/lib/errors';
import type { IProductRepository, IWishlistRepository } from '@/server/repositories';

/** WishlistService — toggle/list saved products. */
export class WishlistService {
  constructor(
    private readonly wishlist: IWishlistRepository,
    private readonly products: IProductRepository,
  ) {}

  list(userId: string): Promise<Product[]> {
    return this.wishlist.list(userId);
  }

  async toggle(userId: string, productId: string): Promise<{ added: boolean }> {
    const product = await this.products.findById(productId);
    if (!product) throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');

    if (await this.wishlist.exists(userId, productId)) {
      await this.wishlist.remove(userId, productId);
      return { added: false };
    }
    await this.wishlist.add(userId, productId);
    return { added: true };
  }

  async remove(userId: string, productId: string): Promise<void> {
    await this.wishlist.remove(userId, productId);
  }
}
