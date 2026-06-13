import { ok, parseBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { checkoutSchema } from '@/lib/validations';
import { services } from '@/server/services';

/**
 * POST /api/checkout — create a PENDING order (reserving stock) and a Stripe
 * PaymentIntent. Returns the order + client secret for Stripe Elements.
 */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const input = await parseBody(request, checkoutSchema);

  const order = await services.orders.createOrder(user.id, {
    addressId: input.addressId,
    shippingAddress: input.shippingAddress,
    billingAddress: input.billingAddress,
    shippingMethod: input.shippingMethod,
  });

  const payment = await services.payments.initiatePayment(order.id, user.id, order);

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
