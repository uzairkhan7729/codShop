import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Hash refresh tokens before storing them, so a DB leak can't replay sessions. */
export function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 8);
}

export function verifyToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash);
}
