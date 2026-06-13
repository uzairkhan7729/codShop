import Stripe from 'stripe';
import { env } from '@/lib/env';
import { PaymentError } from '@/lib/errors';
import type {
  ConfirmResult,
  CreateIntentParams,
  IPaymentGateway,
  NormalizedWebhookEvent,
  PaymentIntentResult,
  RefundParams,
  RefundResult,
} from './payment-gateway';

/**
 * Stripe implementation of IPaymentGateway (Module 9).
 * Converts between Stripe's smallest-currency-unit integers and our major-unit
 * floats, and verifies webhook signatures.
 */
export class StripePaymentGateway implements IPaymentGateway {
  readonly provider = 'STRIPE' as const;
  private readonly stripe: Stripe;

  constructor(secretKey: string = env.STRIPE_SECRET_KEY) {
    if (!secretKey) {
      // Constructed lazily; methods will throw a clear error if actually used.
      this.stripe = new Stripe('sk_test_placeholder', { apiVersion: '2025-02-24.acacia' });
    } else {
      this.stripe = new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' });
    }
  }

  private static toMinor(amount: number): number {
    return Math.round(amount * 100);
  }

  private static toMajor(amount: number): number {
    return Math.round(amount) / 100;
  }

  async createPaymentIntent(params: CreateIntentParams): Promise<PaymentIntentResult> {
    try {
      const intent = await this.stripe.paymentIntents.create({
        amount: StripePaymentGateway.toMinor(params.amount),
        currency: params.currency.toLowerCase(),
        receipt_email: params.customerEmail,
        automatic_payment_methods: { enabled: true },
        metadata: { orderId: params.orderId, ...params.metadata },
      });
      return {
        id: intent.id,
        clientSecret: intent.client_secret,
        status: intent.status,
        amount: StripePaymentGateway.toMajor(intent.amount),
      };
    } catch (error) {
      throw new PaymentError(
        error instanceof Error ? error.message : 'Failed to create payment intent',
      );
    }
  }

  async confirmPayment(paymentIntentId: string): Promise<ConfirmResult> {
    try {
      const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return {
        id: intent.id,
        status: intent.status,
        succeeded: intent.status === 'succeeded',
        amountReceived: StripePaymentGateway.toMajor(intent.amount_received),
      };
    } catch (error) {
      throw new PaymentError(
        error instanceof Error ? error.message : 'Failed to confirm payment',
      );
    }
  }

  async refundPayment(params: RefundParams): Promise<RefundResult> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: params.paymentIntentId,
        ...(params.amount != null ? { amount: StripePaymentGateway.toMinor(params.amount) } : {}),
      });
      return {
        id: refund.id,
        status: refund.status ?? 'unknown',
        amount: StripePaymentGateway.toMajor(refund.amount),
      };
    } catch (error) {
      throw new PaymentError(
        error instanceof Error ? error.message : 'Failed to refund payment',
      );
    }
  }

  handleWebhook(rawBody: string | Buffer, signature: string): NormalizedWebhookEvent {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      throw new PaymentError(
        `Webhook signature verification failed: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
        'WEBHOOK_SIGNATURE_INVALID',
      );
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        return {
          id: event.id,
          type: 'payment_succeeded',
          paymentIntentId: intent.id,
          orderId: intent.metadata?.orderId,
          amount: StripePaymentGateway.toMajor(intent.amount_received || intent.amount),
        };
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        return {
          id: event.id,
          type: 'payment_failed',
          paymentIntentId: intent.id,
          orderId: intent.metadata?.orderId,
          failureMessage: intent.last_payment_error?.message ?? 'Payment failed',
        };
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        return {
          id: event.id,
          type: 'refunded',
          paymentIntentId:
            typeof charge.payment_intent === 'string' ? charge.payment_intent : undefined,
          amount: StripePaymentGateway.toMajor(charge.amount_refunded),
        };
      }
      default:
        return { id: event.id, type: 'unknown' };
    }
  }
}
