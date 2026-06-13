import { ok, parseBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { updateCartItemSchema } from '@/lib/validations';
import { services } from '@/server/services';

/** PUT /api/cart/items/:id — update quantity. */
export const PUT = route(async (request: Request, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const { quantity } = await parseBody(request, updateCartItemSchema);
  return ok(await services.cart.updateQuantity(user.id, ctx.params.id, quantity));
});

/** DELETE /api/cart/items/:id — remove item. */
export const DELETE = route(async (_request: Request, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  return ok(await services.cart.removeFromCart(user.id, ctx.params.id));
});
