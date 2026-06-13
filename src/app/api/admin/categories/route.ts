import { ok, parseBody, route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { categoryInputSchema } from '@/lib/validations';
import { services } from '@/server/services';

export const dynamic = 'force-dynamic';

/** POST /api/admin/categories — create a category. */
export const POST = route(async (request: Request) => {
  await requireAdmin();
  const input = await parseBody(request, categoryInputSchema);
  return ok(await services.categories.create(input), 201);
});
