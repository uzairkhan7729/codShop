import { z } from 'zod';
import { ok, parseBody, route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { services } from '@/server/services';

const stockSchema = z.object({
  productId: z.string().min(1),
  stock: z.number().int().min(0),
});

const bulkSchema = z.object({
  updates: z.array(stockSchema).min(1).max(500),
});

/** PUT /api/admin/inventory — set absolute stock for a single product. */
export const PUT = route(async (request: Request) => {
  await requireAdmin();
  const { productId, stock } = await parseBody(request, stockSchema);
  const newStock = await services.products.updateStock(productId, stock);
  return ok({ productId, stock: newStock });
});

/** POST /api/admin/inventory — bulk stock update (e.g. CSV import). */
export const POST = route(async (request: Request) => {
  await requireAdmin();
  const { updates } = await parseBody(request, bulkSchema);
  const results = [];
  for (const u of updates) {
    const stock = await services.products.updateStock(u.productId, u.stock);
    results.push({ productId: u.productId, stock });
  }
  return ok({ updated: results.length, results });
});
