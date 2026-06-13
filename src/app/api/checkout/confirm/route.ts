import { z } from 'zod';
import { ok, parseBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { services } from '@/server/services';

const confirmSchema = z.object({ orderId: z.string().min(1) });

/**
 * POST /api/checkout/confirm — fallback confirmation (the webhook is the source
 * of truth, but this lets the success page verify immediately after redirect).
 */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const { orderId } = await parseBody(request, confirmSchema);
  return ok(await services.payments.confirmPayment(orderId, user.id));
});
