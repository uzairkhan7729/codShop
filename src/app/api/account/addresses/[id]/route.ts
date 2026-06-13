import { ok, parseBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { NotFoundError } from '@/lib/errors';
import { addressSchema } from '@/lib/validations';
import { repositories } from '@/server/repositories';

/** PUT /api/account/addresses/:id — update an address (ownership enforced). */
export const PUT = route(async (request: Request, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const existing = await repositories.users.findAddress(user.id, ctx.params.id);
  if (!existing) throw new NotFoundError('Address not found', 'ADDRESS_NOT_FOUND');

  const input = await parseBody(request, addressSchema.partial());
  if (input.isDefault && input.type) await repositories.users.clearDefault(user.id, input.type);
  return ok(await repositories.users.updateAddress(ctx.params.id, input));
});

/** DELETE /api/account/addresses/:id — remove an address. */
export const DELETE = route(async (_request: Request, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const existing = await repositories.users.findAddress(user.id, ctx.params.id);
  if (!existing) throw new NotFoundError('Address not found', 'ADDRESS_NOT_FOUND');
  await repositories.users.deleteAddress(ctx.params.id);
  return ok({ removed: true });
});
