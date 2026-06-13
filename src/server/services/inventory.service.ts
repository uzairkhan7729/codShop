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
   * Reserve stock for every line atomically-as-a-group. Quantities are first
   * aggregated per product (a cart may hold two variants of one product), then
   * each product is decremented once — in parallel across distinct products for
   * speed, which is safe because each is a separate atomic document update. If
   * any product can't be satisfied, the successful ones are rolled back.
   */
  async reserveStock(items: StockLine[]): Promise<void> {
    const byProduct = new Map<string, number>();
    for (const item of items) {
      byProduct.set(item.productId, (byProduct.get(item.productId) ?? 0) + item.quantity);
    }
    const lines: StockLine[] = [...byProduct.entries()].map(([productId, quantity]) => ({ productId, quantity }));

    const results = await Promise.all(
      lines.map((line) =>
        this.products.decrementStock(line.productId, line.quantity).then((r) => ({ line, ok: r !== null })),
      ),
    );

    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      const succeeded = results.filter((r) => r.ok).map((r) => r.line);
      await this.releaseStock(succeeded);
      throw new InsufficientStockError('Not enough stock for one or more items in your order');
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
