import { ok, parseBody, route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { NotFoundError } from '@/lib/errors';
import { productUpdateSchema } from '@/lib/validations';
import { services } from '@/server/services';

export const dynamic = 'force-dynamic';

/** GET /api/admin/products/:id — single product (for the edit form). */
export const GET = route(async (_request: Request, ctx: { params: { id: string } }) => {
  await requireAdmin();
  const product = await services.products.getById(ctx.params.id);
  if (!product) throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
  return ok(product);
});

/** PUT /api/admin/products/:id — update a product (with variants). */
export const PUT = route(async (request: Request, ctx: { params: { id: string } }) => {
  await requireAdmin();
  const input = await parseBody(request, productUpdateSchema);
  return ok(await services.products.updateProduct(ctx.params.id, input));
});

/** DELETE /api/admin/products/:id — delete a product. */
export const DELETE = route(async (_request: Request, ctx: { params: { id: string } }) => {
  await requireAdmin();
  await services.products.deleteProduct(ctx.params.id);
  return ok({ deleted: true });
});
