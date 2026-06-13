import { ok, parseQuery, route } from '@/lib/api';
import { z } from 'zod';
import { services } from '@/server/services';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  tree: z.coerce.boolean().optional(),
  mega: z.coerce.boolean().optional(),
});

/** GET /api/categories — flat list, ?tree=true (2-level) or ?mega=true (3-level). */
export const GET = route(async (request: Request) => {
  const { tree, mega } = parseQuery(request, querySchema);
  const data = mega
    ? await services.categories.getMegaTree()
    : tree
      ? await services.categories.getTree()
      : await services.categories.getAll();
  return ok(data);
});
