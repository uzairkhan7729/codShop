import { ok, parseQuery, route } from '@/lib/api';
import { paginationSchema } from '@/lib/validations';
import { services } from '@/server/services';

export const dynamic = 'force-dynamic';

/** GET /api/products/:slug/reviews — paginated reviews + rating summary. */
export const GET = route(async (request: Request, ctx: { params: { slug: string } }) => {
  const { product } = await services.products.getProductBySlug(ctx.params.slug);
  const { page, pageSize } = parseQuery(request, paginationSchema);
  const [reviews, summary] = await Promise.all([
    services.reviews.listForProduct(product.id, { page, pageSize }),
    services.reviews.ratingSummary(product.id),
  ]);
  return ok({ reviews, summary });
});
