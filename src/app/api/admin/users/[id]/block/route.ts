import { z } from 'zod';
import { ok, parseBody, route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { repositories } from '@/server/repositories';

const blockSchema = z.object({ blocked: z.boolean() });

/** PUT /api/admin/users/:id/block — block or unblock a customer. */
export const PUT = route(async (request: Request, ctx: { params: { id: string } }) => {
  await requireAdmin();
  const { blocked } = await parseBody(request, blockSchema);
  const user = await repositories.users.setBlocked(ctx.params.id, blocked);
  return ok({ id: user.id, isBlocked: user.isBlocked });
});
