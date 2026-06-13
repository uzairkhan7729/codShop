import { z } from 'zod';
import { ok, parseQuery, route } from '@/lib/api';
import { NotFoundError } from '@/lib/errors';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { BadRequestError } from '@/lib/errors';
import { repositories } from '@/server/repositories';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  orderNumber: z.string().min(1),
  email: z.string().email(),
});

/**
 * GET /api/track?orderNumber=&email= — public order lookup (no login).
 * Returns a safe subset only when the order number AND email match, so guests
 * can track orders tied to an account they can't log into.
 */
export const GET = route(async (request: Request) => {
  const limit = await rateLimit(`track:${clientIp(request)}`, 30, 60);
  if (!limit.allowed) throw new BadRequestError('Too many attempts. Please try again later.', 'RATE_LIMITED');

  const { orderNumber, email } = parseQuery(request, querySchema);
  const order = await repositories.orders.findByNumber(orderNumber.trim());

  // Same not-found message whether the order or the email is wrong (no enumeration).
  if (!order || order.user.email.toLowerCase() !== email.trim().toLowerCase()) {
    throw new NotFoundError('No order found for that order number and email', 'ORDER_NOT_FOUND');
  }

  return ok({
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt,
    total: order.total,
    trackingNumber: order.trackingNumber,
    carrier: order.carrier,
    items: order.items.map((i) => ({ name: i.name, image: i.image, quantity: i.quantity, total: i.total })),
    shippingTo: { city: order.shippingAddress.city, country: order.shippingAddress.country },
  });
});
