import { z } from 'zod';
import { ok, parseBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { services } from '@/server/services';

export const dynamic = 'force-dynamic';

const toggleSchema = z.object({ productId: z.string().min(1) });

/** GET /api/wishlist — saved products. */
export const GET = route(async () => {
  const user = await requireUser();
  return ok(await services.wishlist.list(user.id));
});

/** POST /api/wishlist — toggle a product in the wishlist. */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const { productId } = await parseBody(request, toggleSchema);
  return ok(await services.wishlist.toggle(user.id, productId));
});
