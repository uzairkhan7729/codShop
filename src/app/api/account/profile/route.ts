import { z } from 'zod';
import { ok, parseBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { BadRequestError } from '@/lib/errors';
import { hashPassword, verifyPassword } from '@/lib/password';
import { repositories } from '@/server/repositories';

const profileSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    phone: z.string().min(5).max(20).optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8).max(72).optional(),
  })
  .refine((d) => !d.newPassword || d.currentPassword, {
    message: 'Current password is required to set a new password',
    path: ['currentPassword'],
  });

/** PUT /api/account/profile — update name/phone and optionally change password. */
export const PUT = route(async (request: Request) => {
  const sessionUser = await requireUser();
  const input = await parseBody(request, profileSchema);

  const data: { name?: string; phone?: string; password?: string } = {};
  if (input.name) data.name = input.name;
  if (input.phone) data.phone = input.phone;

  if (input.newPassword) {
    const user = await repositories.users.findById(sessionUser.id);
    if (!user) throw new BadRequestError('User not found');
    const ok2 = await verifyPassword(input.currentPassword!, user.password);
    if (!ok2) throw new BadRequestError('Current password is incorrect', 'WRONG_PASSWORD');
    data.password = await hashPassword(input.newPassword);
  }

  const updated = await repositories.users.update(sessionUser.id, data);
  return ok({ id: updated.id, name: updated.name, email: updated.email, phone: updated.phone });
});
