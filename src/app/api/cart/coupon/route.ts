import { ok, parseBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { couponApplySchema } from '@/lib/validations';
import { services } from '@/server/services';

/** POST /api/cart/coupon — apply a coupon code. */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const { code } = await parseBody(request, couponApplySchema);
  return ok(await services.cart.applyCoupon(user.id, code));
});

/** DELETE /api/cart/coupon — remove the applied coupon. */
export const DELETE = route(async () => {
  const user = await requireUser();
  return ok(await services.cart.removeCoupon(user.id));
});
