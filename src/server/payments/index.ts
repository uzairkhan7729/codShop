import type { IPaymentGateway } from './payment-gateway';
import { StripePaymentGateway } from './stripe-gateway';

/**
 * Payment gateway factory. Swap the default here (or branch on config) to add
 * PayPal without touching any service — Open/Closed in practice.
 */
const globalForGateway = globalThis as unknown as { paymentGateway?: IPaymentGateway };

export const paymentGateway: IPaymentGateway =
  globalForGateway.paymentGateway ?? new StripePaymentGateway();

if (process.env.NODE_ENV !== 'production') {
  globalForGateway.paymentGateway = paymentGateway;
}

export * from './payment-gateway';
