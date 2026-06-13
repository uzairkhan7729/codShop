import { ok, route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { services } from '@/server/services';

export const dynamic = 'force-dynamic';

/** GET /api/admin/dashboard/stats — KPI cards + charts data. */
export const GET = route(async () => {
  await requireAdmin();
  return ok(await services.analytics.getDashboardStats());
});
