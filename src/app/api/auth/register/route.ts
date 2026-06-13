import { ok, parseBody, route } from '@/lib/api';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { BadRequestError } from '@/lib/errors';
import { registerSchema } from '@/lib/validations';
import { services } from '@/server/services';

export const POST = route(async (request: Request) => {
  const limit = await rateLimit(`register:${clientIp(request)}`, 10, 60);
  if (!limit.allowed) throw new BadRequestError('Too many attempts. Please try again later.', 'RATE_LIMITED');

  const input = await parseBody(request, registerSchema);
  const result = await services.auth.register(input, {
    userAgent: request.headers.get('user-agent') ?? undefined,
    ip: clientIp(request),
  });
  // Return the public user; the client then signs in via NextAuth to set the session cookie.
  return ok({ user: result.user }, 201);
});
