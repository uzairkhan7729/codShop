import { z } from 'zod';
import { ok, parseQuery, route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { services } from '@/server/services';

export const dynamic = 'force-dynamic';

const querySchema = z.object({ days: z.coerce.number().int().min(1).max(365).default(30) });

/** GET /api/admin/analytics/revenue?days=30 — revenue time series. */
export const GET = route(async (request: Request) => {
  await requireAdmin();
  const { days } = parseQuery(request, querySchema);
  return ok(await services.analytics.getRevenue(days));
});
