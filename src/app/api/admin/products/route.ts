import { ok, parseBody, parseQuery, route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { productInputSchema, productQuerySchema } from '@/lib/validations';
import { services } from '@/server/services';

export const dynamic = 'force-dynamic';

/** GET /api/admin/products — admin listing (includes inactive). */
export const GET = route(async (request: Request) => {
  await requireAdmin();
  const q = parseQuery(request, productQuerySchema);
  const result = await services.products.listForAdmin(
    { search: q.search, categorySlug: q.category, brand: q.brand, sort: q.sort },
    { page: q.page, pageSize: q.pageSize },
  );
  return ok(result);
});

/** POST /api/admin/products — create a product (with variants). */
export const POST = route(async (request: Request) => {
  await requireAdmin();
  const input = await parseBody(request, productInputSchema);
  return ok(await services.products.createProduct(input), 201);
});
