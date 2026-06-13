import { ok, parseBody, parseQuery, route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { couponInputSchema, paginationSchema } from '@/lib/validations';
import { services } from '@/server/services';

export const dynamic = 'force-dynamic';

/** GET /api/admin/coupons — list coupons. */
export const GET = route(async (request: Request) => {
  await requireAdmin();
  const { page, pageSize } = parseQuery(request, paginationSchema);
  return ok(await services.coupons.list({ page, pageSize }));
});

/** POST /api/admin/coupons — create a coupon. */
export const POST = route(async (request: Request) => {
  await requireAdmin();
  const input = await parseBody(request, couponInputSchema);
  return ok(await services.coupons.create(input), 201);
});
