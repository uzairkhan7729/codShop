import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '@/lib/env';
import { UnauthorizedError } from '@/lib/errors';

export interface AccessTokenPayload extends JwtPayload {
  sub: string; // user id
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
}

const ACCESS_TTL = '15m';
const REFRESH_TTL_DAYS = 7;

export function signAccessToken(payload: Omit<AccessTokenPayload, keyof JwtPayload>): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(userId: string): { token: string; expiresAt: Date } {
  const token = jwt.sign({ sub: userId, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${REFRESH_TTL_DAYS}d`,
  });
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, expiresAt };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired session');
  }
}

export function verifyRefreshToken(token: string): { sub: string } {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

export const REFRESH_TOKEN_TTL_DAYS = REFRESH_TTL_DAYS;
