import { ok, parseQuery, route } from '@/lib/api';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { BadRequestError } from '@/lib/errors';
import { productQuerySchema } from '@/lib/validations';
import { services } from '@/server/services';

export const dynamic = 'force-dynamic';

/** GET /api/products — pagination, filtering, sorting (Module 4). */
export const GET = route(async (request: Request) => {
  const limit = await rateLimit(`products:${clientIp(request)}`);
  if (!limit.allowed) throw new BadRequestError('Rate limit exceeded', 'RATE_LIMITED');

  const q = parseQuery(request, productQuerySchema);
  const result = await services.products.getProducts(
    {
      search: q.search,
      categorySlug: q.category,
      brand: q.brand,
      minPrice: q.minPrice,
      maxPrice: q.maxPrice,
      minRating: q.minRating,
      isFeatured: q.featured,
      sort: q.sort,
    },
    { page: q.page, pageSize: q.pageSize },
  );
  return ok(result);
});
