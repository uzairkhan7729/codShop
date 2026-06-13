/**
 * Payment gateway abstraction (Open/Closed + Interface Segregation, Module 9).
 *
 * Services depend on IPaymentGateway, never on Stripe directly. Adding PayPal
 * later means writing a PayPalPaymentGateway that implements this interface —
 * no service code changes.
 *
 * Types are provider-neutral on purpose (no Stripe types leak through).
 */

export interface CreateIntentParams {
  amount: number; // major units, e.g. 149.99 AED
  currency: string; // ISO 4217, lowercased by the gateway
  orderId: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  id: string; // provider payment-intent id
  clientSecret: string | null; // for client-side confirmation (Stripe Elements)
  status: string;
  amount: number;
}

export interface ConfirmResult {
  id: string;
  status: string;
  succeeded: boolean;
  amountReceived: number;
}

export interface RefundParams {
  paymentIntentId: string;
  amount?: number; // omit for full refund
  reason?: string;
}

export interface RefundResult {
  id: string;
  status: string;
  amount: number;
}

export type NormalizedWebhookType =
  | 'payment_succeeded'
  | 'payment_failed'
  | 'refunded'
  | 'unknown';

export interface NormalizedWebhookEvent {
  id: string;
  type: NormalizedWebhookType;
  paymentIntentId?: string;
  orderId?: string;
  amount?: number;
  failureMessage?: string;
}

export interface IPaymentGateway {
  readonly provider: 'STRIPE' | 'PAYPAL';
  createPaymentIntent(params: CreateIntentParams): Promise<PaymentIntentResult>;
  confirmPayment(paymentIntentId: string): Promise<ConfirmResult>;
  refundPayment(params: RefundParams): Promise<RefundResult>;
  /** Verify the signature and normalize the provider event into our shape. */
  handleWebhook(rawBody: string | Buffer, signature: string): NormalizedWebhookEvent;
}
