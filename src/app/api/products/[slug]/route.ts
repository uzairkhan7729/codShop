import { ok, route } from '@/lib/api';
import { services } from '@/server/services';

export const dynamic = 'force-dynamic';

/** GET /api/products/:slug — single product + related. */
export const GET = route(async (_request: Request, ctx: { params: { slug: string } }) => {
  const detail = await services.products.getProductBySlug(ctx.params.slug);
  return ok(detail);
});
