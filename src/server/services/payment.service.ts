import { BadRequestError, NotFoundError, PaymentError } from '@/lib/errors';
import { PRICING } from '@/lib/pricing';
import type { IOrderRepository, IPaymentRepository, OrderWithRelations } from '@/server/repositories';
import type { IPaymentGateway, NormalizedWebhookEvent } from '@/server/payments';
import type { OrderService } from './order.service';

export interface InitiatePaymentResult {
  clientSecret: string | null;
  paymentIntentId: string;
  amount: number;
}

/**
 * PaymentService — orchestrates payments through the IPaymentGateway abstraction.
 * It never references Stripe directly, so swapping the gateway requires no change
 * here (Open/Closed). Order state changes are delegated to OrderService.
 */
export class PaymentService {
  constructor(
    private readonly gateway: IPaymentGateway,
    private readonly payments: IPaymentRepository,
    private readonly orders: IOrderRepository,
    private readonly orderService: OrderService,
  ) {}

  /**
   * Create (or reuse) a payment intent for a PENDING order and return its client
   * secret. Accepts an optional preloaded order to avoid a redundant DB read
   * right after order creation.
   */
  async initiatePayment(
    orderId: string,
    userId: string,
    preloaded?: OrderWithRelations,
  ): Promise<InitiatePaymentResult> {
    const order = preloaded && preloaded.id === orderId ? preloaded : await this.orders.findById(orderId);
    if (!order) throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    if (order.userId !== userId) throw new BadRequestError('Order does not belong to you');
    if (order.status !== 'PENDING') {
      throw new BadRequestError('This order is not awaiting payment', 'ORDER_NOT_PAYABLE');
    }

    const intent = await this.gateway.createPaymentIntent({
      amount: order.total,
      currency: PRICING.currency,
      orderId: order.id,
      customerEmail: order.user.email,
    });

    await this.payments.upsertForOrder(order.id, {
      orderId: order.id,
      provider: this.gateway.provider,
      status: 'PENDING',
      amount: order.total,
      currency: PRICING.currency,
      stripePaymentIntentId: intent.id,
    });

    return { clientSecret: intent.clientSecret, paymentIntentId: intent.id, amount: order.total };
  }

  /**
   * Verify the payment with the gateway and finalize (fallback to the webhook).
   * Safe to call without an authenticated user: it only marks the order PAID if
   * Stripe confirms the intent actually succeeded, so it merely reflects reality.
   * When userId is provided, ownership is still enforced.
   */
  async confirmPayment(orderId: string, userId?: string): Promise<{ status: string; paid: boolean }> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    if (userId && order.userId !== userId) throw new BadRequestError('Order does not belong to you');

    const payment = await this.payments.findByOrder(orderId);
    if (!payment?.stripePaymentIntentId) {
      throw new BadRequestError('No payment in progress for this order');
    }

    const result = await this.gateway.confirmPayment(payment.stripePaymentIntentId);
    if (result.succeeded) {
      await this.payments.updateStatus(payment.id, 'SUCCEEDED');
      await this.orderService.markPaid(orderId);
      return { status: result.status, paid: true };
    }
    return { status: result.status, paid: false };
  }

  /** Apply a normalized webhook event (signature already verified by the gateway). */
  async applyWebhookEvent(event: NormalizedWebhookEvent): Promise<void> {
    if (!event.paymentIntentId) return;
    const payment = await this.payments.findByIntent(event.paymentIntentId);
    if (!payment) return;

    switch (event.type) {
      case 'payment_succeeded':
        if (payment.status !== 'SUCCEEDED') {
          await this.payments.updateStatus(payment.id, 'SUCCEEDED');
          await this.orderService.markPaid(payment.orderId);
        }
        break;
      case 'payment_failed':
        await this.payments.updateStatus(payment.id, 'FAILED', {
          failureReason: event.failureMessage,
        });
        await this.orderService.cancelOrder(
          payment.orderId,
          event.failureMessage ?? 'Payment failed',
        );
        break;
      case 'refunded':
        await this.payments.updateStatus(payment.id, 'REFUNDED', {
          refundedAmount: event.amount ?? payment.amount,
        });
        break;
      default:
        break;
    }
  }

  /** Admin refund — refunds via the gateway, marks the order REFUNDED, releases stock. */
  async refund(orderId: string, amount?: number): Promise<void> {
    const payment = await this.payments.findByOrder(orderId);
    if (!payment?.stripePaymentIntentId) throw new NotFoundError('No payment found for this order');
    if (payment.status !== 'SUCCEEDED' && payment.status !== 'PARTIALLY_REFUNDED') {
      throw new BadRequestError('Only a successful payment can be refunded', 'NOT_REFUNDABLE');
    }
    if (amount != null && amount > payment.amount - payment.refundedAmount) {
      throw new BadRequestError('Refund exceeds remaining refundable amount');
    }

    const result = await this.gateway.refundPayment({
      paymentIntentId: payment.stripePaymentIntentId,
      amount,
    });
    if (result.status !== 'succeeded' && result.status !== 'pending') {
      throw new PaymentError(`Refund failed with status ${result.status}`);
    }

    const newRefunded = Math.round((payment.refundedAmount + result.amount) * 100) / 100;
    const fullyRefunded = newRefunded >= payment.amount;
    await this.payments.updateStatus(payment.id, fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED', {
      refundedAmount: newRefunded,
    });
    if (fullyRefunded) {
      await this.orderService.cancelOrder(orderId, 'Refunded by admin', 'REFUNDED');
    }
  }
}
