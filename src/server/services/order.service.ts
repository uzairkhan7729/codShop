import type { Order, OrderStatus, Prisma } from '@prisma/client';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { calculatePricing } from '@/lib/pricing';
import type {
  ICartRepository,
  ICouponRepository,
  IOrderRepository,
  IProductRepository,
  IUserRepository,
  OrderWithRelations,
} from '@/server/repositories';
import type { CouponService } from './coupon.service';
import type { InventoryService, StockLine } from './inventory.service';
import type { NotificationService } from './notification.service';

export interface CreateOrderInput {
  addressId?: string;
  shippingAddress?: OrderAddressInput;
  billingAddress?: OrderAddressInput;
  shippingMethod?: 'STANDARD' | 'EXPRESS';
}

export interface OrderAddressInput {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/** Allowed forward status transitions (status workflow). */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

/**
 * OrderService — orchestrates checkout. Creates a PENDING order, reserves
 * stock, and leaves payment to PaymentService. The order is only marked PAID
 * once payment is confirmed (via markPaid, called from the webhook).
 */
export class OrderService {
  constructor(
    private readonly orders: IOrderRepository,
    private readonly carts: ICartRepository,
    private readonly products: IProductRepository,
    private readonly coupons: ICouponRepository,
    private readonly users: IUserRepository,
    private readonly inventory: InventoryService,
    private readonly couponService: CouponService,
    private readonly notifications: NotificationService,
  ) {}

  private async resolveAddress(
    userId: string,
    input: CreateOrderInput,
  ): Promise<OrderAddressInput> {
    if (input.shippingAddress) return input.shippingAddress;
    if (input.addressId) {
      const addr = await this.users.findAddress(userId, input.addressId);
      if (!addr) throw new NotFoundError('Address not found', 'ADDRESS_NOT_FOUND');
      return {
        fullName: addr.fullName,
        phone: addr.phone,
        line1: addr.line1,
        line2: addr.line2 ?? undefined,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postalCode,
        country: addr.country,
      };
    }
    throw new BadRequestError('A shipping address is required');
  }

  async createOrder(userId: string, input: CreateOrderInput): Promise<OrderWithRelations> {
    const cart = await this.carts.getOrCreate(userId);
    if (cart.items.length === 0) throw new BadRequestError('Your cart is empty', 'CART_EMPTY');

    const shippingMethod = input.shippingMethod ?? 'STANDARD';
    const shippingAddress = await this.resolveAddress(userId, input);

    // Snapshot line items at current price.
    const lineItems = cart.items.map((line) => {
      const unitPrice = line.variant?.price ?? line.product.price;
      return {
        productId: line.productId,
        variantId: line.variantId,
        name: line.product.name,
        image: line.variant?.image ?? line.product.images[0] ?? null,
        sku: line.variant?.sku ?? line.product.sku,
        price: unitPrice,
        quantity: line.quantity,
        total: Math.round(unitPrice * line.quantity * 100) / 100,
      };
    });

    const subtotal = lineItems.reduce((sum, i) => sum + i.total, 0);

    // Re-validate coupon at order time (price may have changed since it was applied).
    let discount = 0;
    let couponCode: string | null = null;
    let couponId: string | null = null;
    if (cart.coupon) {
      const validation = await this.couponService.validate(cart.coupon.code, userId, subtotal);
      discount = validation.discount;
      couponCode = validation.coupon.code;
      couponId = validation.coupon.id;
    }

    const pricing = calculatePricing(subtotal, discount, shippingMethod);

    // Reserve stock (atomic, with rollback) BEFORE persisting the order.
    const stockLines: StockLine[] = lineItems.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
    }));
    await this.inventory.reserveStock(stockLines);

    try {
      const seq = await this.orders.nextSequence();
      const orderNumber = `ORD-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;

      const data: Prisma.OrderCreateInput = {
        orderNumber,
        user: { connect: { id: userId } },
        status: 'PENDING',
        subtotal: pricing.subtotal,
        discount: pricing.discount,
        tax: pricing.tax,
        shippingCost: pricing.shippingCost,
        total: pricing.total,
        couponCode,
        shippingMethod,
        shippingAddress,
        billingAddress: input.billingAddress ?? shippingAddress,
        items: {
          create: lineItems.map((i) => ({
            product: { connect: { id: i.productId } },
            ...(i.variantId ? { variant: { connect: { id: i.variantId } } } : {}),
            name: i.name,
            image: i.image,
            sku: i.sku,
            price: i.price,
            quantity: i.quantity,
            total: i.total,
          })),
        },
      };

      const order = await this.orders.create(data);

      // Reserve coupon redemption now to honour per-user limits across concurrent
      // checkouts; it is rolled back if the order is later cancelled.
      if (couponId) await this.couponService.redeem(couponId, userId, order.id);

      // NOTE: the cart is intentionally NOT cleared here. It is emptied only once
      // payment succeeds (markPaid), so an abandoned/failed checkout keeps the cart.
      return order;
    } catch (error) {
      // Persisting failed after stock was reserved — give it back.
      await this.inventory.releaseStock(stockLines);
      throw error;
    }
  }

  /** Mark an order PAID after payment confirmation; sends confirmation + bumps sold counts. */
  async markPaid(orderId: string): Promise<Order> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    if (order.status !== 'PENDING') return order; // idempotent — webhook may retry

    const updated = await this.orders.updateStatus(orderId, 'PAID');
    await Promise.all(
      order.items.map((i) => this.products.update(i.productId, { soldCount: { increment: i.quantity } })),
    );
    // Empty the cart now that payment is confirmed.
    try {
      const cart = await this.carts.getOrCreate(order.userId);
      await this.carts.clear(cart.id);
    } catch {
      // non-fatal
    }
    await this.notifications.sendOrderConfirmationEmail(orderId).catch(() => undefined);
    return updated;
  }

  /** Admin status transition with workflow validation + shipping notification. */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    extra?: { trackingNumber?: string; carrier?: string },
  ): Promise<Order> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');

    if (!TRANSITIONS[order.status].includes(status)) {
      throw new BadRequestError(
        `Cannot change status from ${order.status} to ${status}`,
        'INVALID_STATUS_TRANSITION',
      );
    }

    if (status === 'CANCELLED' || status === 'REFUNDED') {
      return this.cancelOrder(orderId, `Status changed to ${status}`, status);
    }

    const updated = await this.orders.updateStatus(orderId, status, {
      ...(extra?.trackingNumber ? { trackingNumber: extra.trackingNumber } : {}),
      ...(extra?.carrier ? { carrier: extra.carrier } : {}),
    });
    if (status === 'SHIPPED' || status === 'DELIVERED') {
      await this.notifications.sendShippingUpdate(orderId).catch(() => undefined);
    }
    return updated;
  }

  /** Cancel/refund: release stock back to inventory and record the reason. */
  async cancelOrder(
    orderId: string,
    reason: string,
    finalStatus: 'CANCELLED' | 'REFUNDED' = 'CANCELLED',
  ): Promise<Order> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') return order;

    await this.inventory.releaseStock(
      order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    );
    return this.orders.updateStatus(orderId, finalStatus, { cancelReason: reason });
  }

  async getUserOrder(userId: string, orderId: string): Promise<OrderWithRelations> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    if (order.userId !== userId) throw new ForbiddenError('This order does not belong to you');
    return order;
  }

  /** Plain-text invoice. (A PDF renderer can be layered on without changing callers.) */
  async generateInvoice(orderId: string): Promise<string> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    const lines = order.items
      .map((i) => `  ${i.name} x${i.quantity}  ${i.price.toFixed(2)}  =  ${i.total.toFixed(2)}`)
      .join('\n');
    return [
      `INVOICE — ${order.orderNumber}`,
      `Date: ${order.createdAt.toISOString().slice(0, 10)}`,
      `Customer: ${order.user.name} <${order.user.email}>`,
      '',
      'Items:',
      lines,
      '',
      `Subtotal:  ${order.subtotal.toFixed(2)}`,
      `Discount:  ${order.discount.toFixed(2)}`,
      `Tax:       ${order.tax.toFixed(2)}`,
      `Shipping:  ${order.shippingCost.toFixed(2)}`,
      `TOTAL:     ${order.total.toFixed(2)}`,
    ].join('\n');
  }
}
