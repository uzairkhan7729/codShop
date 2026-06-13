import type { Role, User } from '@prisma/client';
import { ConflictError, ForbiddenError, UnauthorizedError } from '@/lib/errors';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/jwt';
import { hashPassword, hashToken, verifyPassword, verifyToken } from '@/lib/password';
import type { ISessionRepository, IUserRepository } from '@/server/repositories';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  image: string | null;
}

export interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

export interface RequestMeta {
  userAgent?: string;
  ip?: string;
}

function toPublic(user: User): PublicUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role, image: user.image };
}

/**
 * AuthService — registration, login, JWT issuance, and refresh-token rotation.
 * Refresh tokens are stored hashed (Module 11) so a DB leak can't replay sessions.
 */
export class AuthService {
  constructor(
    private readonly users: IUserRepository,
    private readonly sessions: ISessionRepository,
  ) {}

  private async issueTokens(user: User, meta: RequestMeta): Promise<AuthTokens> {
    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    const { token: refreshToken, expiresAt } = signRefreshToken(user.id);
    await this.sessions.create({
      userId: user.id,
      refreshToken: await hashToken(refreshToken),
      expiresAt,
      userAgent: meta.userAgent,
      ip: meta.ip,
    });
    return { accessToken, refreshToken, refreshExpiresAt: expiresAt };
  }

  async register(
    input: { name: string; email: string; password: string },
    meta: RequestMeta = {},
  ): Promise<AuthResult> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new ConflictError('An account with this email already exists', 'EMAIL_TAKEN');

    const user = await this.users.create({
      name: input.name,
      email: input.email,
      password: await hashPassword(input.password),
      role: 'CUSTOMER',
    });
    return { user: toPublic(user), tokens: await this.issueTokens(user, meta) };
  }

  async login(
    input: { email: string; password: string },
    meta: RequestMeta = {},
  ): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email);
    if (!user) throw new UnauthorizedError('Invalid email or password');
    if (user.isBlocked) throw new ForbiddenError('Your account has been suspended');

    const ok = await verifyPassword(input.password, user.password);
    if (!ok) throw new UnauthorizedError('Invalid email or password');

    return { user: toPublic(user), tokens: await this.issueTokens(user, meta) };
  }

  /** Validate the credentials only (used by the NextAuth Credentials provider). */
  async validateCredentials(email: string, password: string): Promise<PublicUser> {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedError('Invalid email or password');
    if (user.isBlocked) throw new ForbiddenError('Your account has been suspended');
    const ok = await verifyPassword(password, user.password);
    if (!ok) throw new UnauthorizedError('Invalid email or password');
    return toPublic(user);
  }

  /** Rotate: verify the refresh token, delete the old session, issue a new pair. */
  async refresh(refreshToken: string, meta: RequestMeta = {}): Promise<AuthResult> {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await this.users.findById(decoded.sub);
    if (!user || user.isBlocked) throw new UnauthorizedError('Session no longer valid');

    const sessions = await this.sessions.findValidForUser(user.id);
    let matched = false;
    for (const session of sessions) {
      if (await verifyToken(refreshToken, session.refreshToken)) {
        await this.sessions.deleteByToken(session.refreshToken);
        matched = true;
        break;
      }
    }
    if (!matched) throw new UnauthorizedError('Refresh token has been revoked');

    return { user: toPublic(user), tokens: await this.issueTokens(user, meta) };
  }

  async logout(userId: string): Promise<void> {
    await this.sessions.deleteAllForUser(userId);
  }

  /**
   * Find an existing user by email or create a lightweight "guest" account with
   * a random password. Used by guest checkout so orders still have an owner and
   * the customer can later register with the same email to claim their history.
   */
  async findOrCreateGuest(email: string, name?: string): Promise<User> {
    const existing = await this.users.findByEmail(email);
    if (existing) {
      if (existing.isBlocked) throw new ForbiddenError('Your account has been suspended');
      return existing;
    }
    const randomPassword = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    return this.users.create({
      name: name?.trim() || 'Guest',
      email,
      password: await hashPassword(randomPassword),
      role: 'CUSTOMER',
    });
  }
}
