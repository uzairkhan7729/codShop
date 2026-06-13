import { ok, parseBody, route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { refundSchema } from '@/lib/validations';
import { services } from '@/server/services';

/** POST /api/admin/orders/:id/refund — full or partial refund via the gateway. */
export const POST = route(async (request: Request, ctx: { params: { id: string } }) => {
  await requireAdmin();
  const { amount } = await parseBody(request, refundSchema);
  await services.payments.refund(ctx.params.id, amount);
  return ok({ refunded: true });
});
