import { InsufficientStockError, NotFoundError } from '@/lib/errors';
import type { IProductRepository } from '@/server/repositories';

export interface StockLine {
  productId: string;
  quantity: number;
}

/**
 * InventoryService — stock reservation with a compensating-transaction strategy.
 *
 * Each product's stock is decremented atomically (MongoDB document-level guard,
 * see ProductRepository.decrementStock). If any line in a multi-item order
 * fails, the lines already decremented are released — so we never oversell and
 * never partially commit, without requiring a multi-document DB transaction.
 */
export class InventoryService {
  constructor(private readonly products: IProductRepository) {}

  async checkAvailability(productId: string, quantity: number): Promise<boolean> {
    const product = await this.products.findById(productId);
    if (!product) throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
    return product.stock >= quantity;
  }

  /**
   * Reserve stock for every line atomically-as-a-group. Throws
   * InsufficientStockError (after rolling back) if any line can't be satisfied.
   */
  async reserveStock(items: StockLine[]): Promise<void> {
    const reserved: StockLine[] = [];
    try {
      for (const item of items) {
        const remaining = await this.products.decrementStock(item.productId, item.quantity);
        if (remaining === null) {
          throw new InsufficientStockError(
            `Not enough stock for one or more items in your order`,
          );
        }
        reserved.push(item);
      }
    } catch (error) {
      // Compensate: put back everything we managed to reserve before failing.
      await this.releaseStock(reserved);
      throw error;
    }
  }

  /** Return stock to inventory (order cancelled / payment failed / refund). */
  async releaseStock(items: StockLine[]): Promise<void> {
    await Promise.all(
      items.map((item) =>
        this.products.incrementStock(item.productId, item.quantity).catch(() => undefined),
      ),
    );
  }
}
