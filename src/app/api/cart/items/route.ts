import { ok, parseBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { addToCartSchema } from '@/lib/validations';
import { services } from '@/server/services';

/** POST /api/cart/items — add a product/variant to the cart. */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const input = await parseBody(request, addToCartSchema);
  const cart = await services.cart.addToCart(
    user.id,
    input.productId,
    input.quantity,
    input.variantId ?? null,
  );
  return ok(cart, 201);
});
