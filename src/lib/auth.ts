import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { env } from '@/lib/env';
import { ForbiddenError, UnauthorizedError } from '@/lib/errors';
import { services } from '@/server/services';

/**
 * NextAuth (Credentials + JWT strategy). The signed JWT is stored in an
 * HTTP-only cookie (NextAuth default) and carries the user's id + role so API
 * routes can authorize without a DB round-trip. 7-day expiry (Module 11).
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  secret: env.NEXTAUTH_SECRET,
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        try {
          const user = await services.auth.validateCredentials(
            credentials.email,
            credentials.password,
          );
          return { id: user.id, email: user.email, name: user.name, role: user.role, image: user.image };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'ADMIN';
  image: string | null;
}

/** Resolve the current session user or throw 401. */
export async function requireUser(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new UnauthorizedError();
  return session.user as SessionUser;
}

/** Resolve the current user and require ADMIN role, or throw 401/403. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'ADMIN') throw new ForbiddenError('Admin access required');
  return user;
}

/** Optional auth — returns null instead of throwing. */
export async function getOptionalUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as SessionUser | undefined) ?? null;
}
