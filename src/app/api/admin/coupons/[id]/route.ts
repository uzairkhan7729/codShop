import { ok, parseBody, route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { couponInputSchema } from '@/lib/validations';
import { services } from '@/server/services';

/** PUT /api/admin/coupons/:id — update a coupon. */
export const PUT = route(async (request: Request, ctx: { params: { id: string } }) => {
  await requireAdmin();
  const input = await parseBody(request, couponInputSchema.partial());
  return ok(await services.coupons.update(ctx.params.id, input));
});

/** DELETE /api/admin/coupons/:id — delete a coupon. */
export const DELETE = route(async (_request: Request, ctx: { params: { id: string } }) => {
  await requireAdmin();
  await services.coupons.delete(ctx.params.id);
  return ok({ deleted: true });
});
