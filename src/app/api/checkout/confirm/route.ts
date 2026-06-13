import { z } from 'zod';
import { ok, parseBody, route } from '@/lib/api';
import { BadRequestError } from '@/lib/errors';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { services } from '@/server/services';

const confirmSchema = z.object({ orderId: z.string().min(1) });

/**
 * POST /api/checkout/confirm — public confirmation fallback (the webhook is the
 * source of truth). Works for guests too: it verifies the payment with Stripe
 * and only marks the order PAID if Stripe says the charge succeeded.
 */
export const POST = route(async (request: Request) => {
  const limit = await rateLimit(`confirm:${clientIp(request)}`, 60, 60);
  if (!limit.allowed) throw new BadRequestError('Too many attempts. Please try again later.', 'RATE_LIMITED');

  const { orderId } = await parseBody(request, confirmSchema);
  return ok(await services.payments.confirmPayment(orderId));
});
