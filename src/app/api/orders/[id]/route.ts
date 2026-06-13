import { ok, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { services } from '@/server/services';

export const dynamic = 'force-dynamic';

/** GET /api/orders/:id — order details (ownership enforced). */
export const GET = route(async (_request: Request, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  return ok(await services.orders.getUserOrder(user.id, ctx.params.id));
});
