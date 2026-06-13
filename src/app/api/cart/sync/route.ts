import { z } from 'zod';
import { ok, parseBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { services } from '@/server/services';

const syncSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1).nullable().optional(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .max(100),
});

/** POST /api/cart/sync — merge a guest cart into the user's cart on login. */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const { items } = await parseBody(request, syncSchema);
  return ok(await services.cart.syncCart(user.id, items));
});
