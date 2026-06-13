import { ok, parseBody, route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { orderStatusSchema } from '@/lib/validations';
import { services } from '@/server/services';

/** PUT /api/admin/orders/:id/status — transition status (+ tracking info). */
export const PUT = route(async (request: Request, ctx: { params: { id: string } }) => {
  await requireAdmin();
  const input = await parseBody(request, orderStatusSchema);
  const order = await services.orders.updateOrderStatus(ctx.params.id, input.status, {
    trackingNumber: input.trackingNumber,
    carrier: input.carrier,
  });
  return ok(order);
});
