import { ok, parseQuery, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { paginationSchema } from '@/lib/validations';
import { repositories } from '@/server/repositories';

export const dynamic = 'force-dynamic';

/** GET /api/orders — current user's orders. */
export const GET = route(async (request: Request) => {
  const user = await requireUser();
  const { page, pageSize } = parseQuery(request, paginationSchema);
  return ok(await repositories.orders.findByUser(user.id, { page, pageSize }));
});
