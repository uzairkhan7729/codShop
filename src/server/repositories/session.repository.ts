import type { Session } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** ISessionRepository — refresh-token session store (Module 11). */
export interface ISessionRepository {
  create(data: {
    userId: string;
    refreshToken: string;
    expiresAt: Date;
    userAgent?: string;
    ip?: string;
  }): Promise<Session>;
  findValidForUser(userId: string): Promise<Session[]>;
  deleteByToken(refreshToken: string): Promise<void>;
  deleteAllForUser(userId: string): Promise<void>;
  deleteExpired(): Promise<void>;
}

export class SessionRepository implements ISessionRepository {
  create(data: {
    userId: string;
    refreshToken: string;
    expiresAt: Date;
    userAgent?: string;
    ip?: string;
  }): Promise<Session> {
    return prisma.session.create({ data });
  }

  findValidForUser(userId: string): Promise<Session[]> {
    return prisma.session.findMany({ where: { userId, expiresAt: { gt: new Date() } } });
  }

  async deleteByToken(refreshToken: string): Promise<void> {
    await prisma.session.deleteMany({ where: { refreshToken } });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await prisma.session.deleteMany({ where: { userId } });
  }

  async deleteExpired(): Promise<void> {
    await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }
}
