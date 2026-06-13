import { ok, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { services } from '@/server/services';

/** DELETE /api/wishlist/:productId — remove a saved product. */
export const DELETE = route(async (_request: Request, ctx: { params: { productId: string } }) => {
  const user = await requireUser();
  await services.wishlist.remove(user.id, ctx.params.productId);
  return ok({ removed: true });
});
