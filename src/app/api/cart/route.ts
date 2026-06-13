import { ok, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { services } from '@/server/services';

export const dynamic = 'force-dynamic';

/** GET /api/cart — current user's priced cart. */
export const GET = route(async () => {
  const user = await requireUser();
  return ok(await services.cart.getCart(user.id));
});
