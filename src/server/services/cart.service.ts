import { BadRequestError, NotFoundError } from '@/lib/errors';
import { calculatePricing, type PriceBreakdown } from '@/lib/pricing';
import type {
  CartWithItems,
  ICartRepository,
  ICouponRepository,
  IProductRepository,
} from '@/server/repositories';
import type { CouponService } from './coupon.service';

export interface CartLine {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  slug: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  inStock: boolean;
  maxQuantity: number;
}

export interface CartView {
  id: string;
  items: CartLine[];
  itemCount: number;
  couponCode: string | null;
  pricing: PriceBreakdown;
}

export interface GuestCartItem {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

/**
 * CartService — owns cart mutations and total calculation.
 * Prices are taken live from the product (variant override wins) so a stale
 * cart always reflects current pricing.
 */
export class CartService {
  constructor(
    private readonly carts: ICartRepository,
    private readonly products: IProductRepository,
    private readonly coupons: ICouponRepository,
    private readonly couponService: CouponService,
  ) {}

  private unitPrice(line: CartWithItems['items'][number]): number {
    return line.variant?.price ?? line.product.price;
  }

  private maxQuantity(line: CartWithItems['items'][number]): number {
    return line.variant ? line.variant.stock : line.product.stock;
  }

  /** Build the enriched, priced view of a user's cart. */
  async getCart(userId: string): Promise<CartView> {
    const cart = await this.carts.getOrCreate(userId);
    const items: CartLine[] = cart.items.map((line) => {
      const unitPrice = this.unitPrice(line);
      const max = this.maxQuantity(line);
      return {
        id: line.id,
        productId: line.productId,
        variantId: line.variantId,
        name: line.product.name,
        slug: line.product.slug,
        image: line.variant?.image ?? line.product.images[0] ?? null,
        unitPrice,
        quantity: line.quantity,
        lineTotal: Math.round(unitPrice * line.quantity * 100) / 100,
        inStock: max > 0,
        maxQuantity: max,
      };
    });

    const subtotal = items.reduce((sum, l) => sum + l.lineTotal, 0);

    // Re-validate any attached coupon against the live subtotal.
    let discount = 0;
    let couponCode: string | null = null;
    if (cart.coupon) {
      try {
        const validation = await this.couponService.validate(cart.coupon.code, userId, subtotal);
        discount = validation.discount;
        couponCode = cart.coupon.code;
      } catch {
        // Coupon no longer valid for this cart — silently detach it.
        await this.carts.attachCoupon(cart.id, null);
      }
    }

    return {
      id: cart.id,
      items,
      itemCount: items.reduce((sum, l) => sum + l.quantity, 0),
      couponCode,
      pricing: calculatePricing(subtotal, discount),
    };
  }

  async addToCart(
    userId: string,
    productId: string,
    quantity: number,
    variantId: string | null = null,
  ): Promise<CartView> {
    if (quantity < 1) throw new BadRequestError('Quantity must be at least 1');

    const product = await this.products.findById(productId);
    if (!product || !product.isActive) throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');

    const variant = variantId ? product.variants.find((v) => v.id === variantId) ?? null : null;
    if (variantId && !variant) throw new BadRequestError('Selected variant is unavailable');

    const available = variant ? variant.stock : product.stock;
    const cart = await this.carts.getOrCreate(userId);
    const existing = await this.carts.findItem(cart.id, productId, variantId);
    const desired = (existing?.quantity ?? 0) + quantity;
    if (desired > available) {
      throw new BadRequestError(`Only ${available} unit(s) available`, 'INSUFFICIENT_STOCK');
    }

    if (existing) {
      await this.carts.updateItemQuantity(existing.id, desired);
    } else {
      await this.carts.addItem(cart.id, productId, variantId, quantity);
    }
    return this.getCart(userId);
  }

  async updateQuantity(userId: string, itemId: string, quantity: number): Promise<CartView> {
    if (quantity < 1) throw new BadRequestError('Quantity must be at least 1');
    const cart = await this.carts.getOrCreate(userId);
    const line = cart.items.find((i) => i.id === itemId);
    if (!line) throw new NotFoundError('Cart item not found', 'CART_ITEM_NOT_FOUND');

    const available = line.variant ? line.variant.stock : line.product.stock;
    if (quantity > available) {
      throw new BadRequestError(`Only ${available} unit(s) available`, 'INSUFFICIENT_STOCK');
    }
    await this.carts.updateItemQuantity(itemId, quantity);
    return this.getCart(userId);
  }

  async removeFromCart(userId: string, itemId: string): Promise<CartView> {
    const cart = await this.carts.getOrCreate(userId);
    const line = cart.items.find((i) => i.id === itemId);
    if (!line) throw new NotFoundError('Cart item not found', 'CART_ITEM_NOT_FOUND');
    await this.carts.removeItem(itemId);
    return this.getCart(userId);
  }

  /** Validate + attach a coupon to the cart. */
  async applyCoupon(userId: string, code: string): Promise<CartView> {
    const cart = await this.carts.getOrCreate(userId);
    const subtotal = cart.items.reduce((sum, l) => sum + this.unitPrice(l) * l.quantity, 0);
    const { coupon } = await this.couponService.validate(code, userId, subtotal);
    await this.carts.attachCoupon(cart.id, coupon.id);
    return this.getCart(userId);
  }

  async removeCoupon(userId: string): Promise<CartView> {
    const cart = await this.carts.getOrCreate(userId);
    await this.carts.attachCoupon(cart.id, null);
    return this.getCart(userId);
  }

  /** Merge a guest cart (from localStorage) into the user's server cart on login. */
  async syncCart(userId: string, guestItems: GuestCartItem[]): Promise<CartView> {
    const cart = await this.carts.getOrCreate(userId);
    for (const item of guestItems) {
      if (item.quantity < 1) continue;
      const product = await this.products.findById(item.productId);
      if (!product || !product.isActive) continue;
      const variantId = item.variantId ?? null;
      const available = variantId
        ? product.variants.find((v) => v.id === variantId)?.stock ?? 0
        : product.stock;
      const existing = await this.carts.findItem(cart.id, item.productId, variantId);
      const merged = Math.min((existing?.quantity ?? 0) + item.quantity, available);
      if (merged < 1) continue;
      if (existing) await this.carts.updateItemQuantity(existing.id, merged);
      else await this.carts.addItem(cart.id, item.productId, variantId, merged);
    }
    return this.getCart(userId);
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.carts.getOrCreate(userId);
    await this.carts.clear(cart.id);
  }
}
