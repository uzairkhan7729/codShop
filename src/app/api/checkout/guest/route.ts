import { ok, parseBody, route } from '@/lib/api';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { BadRequestError } from '@/lib/errors';
import { guestCheckoutSchema } from '@/lib/validations';
import { services } from '@/server/services';

/**
 * POST /api/checkout/guest — guest checkout (no session required).
 * Creates/reuses a lightweight account from the email, syncs the provided cart
 * items into it, creates the order + Stripe PaymentIntent, and returns the
 * client secret. The customer can later register with the same email.
 */
export const POST = route(async (request: Request) => {
  const limit = await rateLimit(`guest-checkout:${clientIp(request)}`, 20, 60);
  if (!limit.allowed) throw new BadRequestError('Too many attempts. Please try again later.', 'RATE_LIMITED');

  const input = await parseBody(request, guestCheckoutSchema);

  const user = await services.auth.findOrCreateGuest(input.email, input.name);
  await services.cart.syncCart(
    user.id,
    input.items.map((i) => ({ productId: i.productId, variantId: i.variantId ?? null, quantity: i.quantity })),
  );

  const order = await services.orders.createOrder(user.id, {
    shippingAddress: input.shippingAddress,
    shippingMethod: input.shippingMethod,
  });
  const payment = await services.payments.initiatePayment(order.id, user.id);

  return ok(
    {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      clientSecret: payment.clientSecret,
      paymentIntentId: payment.paymentIntentId,
    },
    201,
  );
});
