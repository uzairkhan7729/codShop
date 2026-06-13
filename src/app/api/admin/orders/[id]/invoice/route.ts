import { route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { services } from '@/server/services';

export const dynamic = 'force-dynamic';

/** GET /api/admin/orders/:id/invoice — printable HTML invoice for any order (admin). */
export const GET = route(async (_request: Request, ctx: { params: { id: string } }) => {
  await requireAdmin();
  const html = await services.orders.generateInvoiceHtml(ctx.params.id);
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
});
