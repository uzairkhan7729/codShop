import { ok, parseBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { addressSchema } from '@/lib/validations';
import { repositories } from '@/server/repositories';

export const dynamic = 'force-dynamic';

/** GET /api/account/addresses — list the user's addresses. */
export const GET = route(async () => {
  const user = await requireUser();
  return ok(await repositories.users.listAddresses(user.id));
});

/** POST /api/account/addresses — add a new address. */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const input = await parseBody(request, addressSchema);
  if (input.isDefault) await repositories.users.clearDefault(user.id, input.type);
  const address = await repositories.users.createAddress(user.id, input);
  return ok(address, 201);
});
