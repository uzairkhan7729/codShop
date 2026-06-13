import { ok, parseBody, route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { productUpdateSchema } from '@/lib/validations';
import { services } from '@/server/services';

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
