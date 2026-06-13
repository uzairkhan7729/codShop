import { ok, parseQuery, route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { paginationSchema } from '@/lib/validations';
import { z } from 'zod';
import { repositories } from '@/server/repositories';

export const dynamic = 'force-dynamic';

const querySchema = paginationSchema.extend({ search: z.string().trim().optional() });

/** GET /api/admin/users — customers with order counts. */
export const GET = route(async (request: Request) => {
  await requireAdmin();
  const q = parseQuery(request, querySchema);
  return ok(await repositories.users.findManyCustomers(q.search, { page: q.page, pageSize: q.pageSize }));
});
