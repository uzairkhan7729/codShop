import { ok, parseBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { reviewSchema } from '@/lib/validations';
import { services } from '@/server/services';

/** POST /api/reviews — add a product review (authenticated, one per product). */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const input = await parseBody(request, reviewSchema);
  await services.reviews.addReview(user.id, input);
  return ok({ created: true }, 201);
});
