import { route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { services } from '@/server/services';

export const dynamic = 'force-dynamic';

/** GET /api/orders/:id/invoice — plain-text invoice download. */
export const GET = route(async (_request: Request, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  await services.orders.getUserOrder(user.id, ctx.params.id); // ownership check
  const invoice = await services.orders.generateInvoice(ctx.params.id);
  return new Response(invoice, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="invoice-${ctx.params.id}.txt"`,
    },
  });
});
