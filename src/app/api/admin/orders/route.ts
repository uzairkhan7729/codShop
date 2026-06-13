import { z } from 'zod';
import { ok, parseQuery, route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { paginationSchema } from '@/lib/validations';
import { repositories } from '@/server/repositories';

export const dynamic = 'force-dynamic';

const querySchema = paginationSchema.extend({
  status: z
    .enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'])
    .optional(),
  search: z.string().trim().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

/** GET /api/admin/orders — all orders with filters. */
export const GET = route(async (request: Request) => {
  await requireAdmin();
  const q = parseQuery(request, querySchema);
  return ok(
    await repositories.orders.findMany(
      { status: q.status, search: q.search, dateFrom: q.dateFrom, dateTo: q.dateTo },
      { page: q.page, pageSize: q.pageSize },
    ),
  );
});
