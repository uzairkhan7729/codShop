import { ok, parseQuery, route } from '@/lib/api';
import { z } from 'zod';
import { services } from '@/server/services';

export const dynamic = 'force-dynamic';

const querySchema = z.object({ tree: z.coerce.boolean().optional() });

/** GET /api/categories — flat list, or ?tree=true for nested hierarchy. */
export const GET = route(async (request: Request) => {
  const { tree } = parseQuery(request, querySchema);
  const data = tree ? await services.categories.getTree() : await services.categories.getAll();
  return ok(data);
});
