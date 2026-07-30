import { Session } from '@prisma/client';
import { ISessionRepository, CreateSessionDTO } from '../../domain/repositories/sessionRepository';
import { prisma } from '../database/prisma';

export class PrismaSessionRepository implements ISessionRepository {
  async findByToken(token: string): Promise<Session | null> {
    return prisma.session.findUnique({
      where: { refreshToken: token },
      include: { user: true },
    });
  }

  async create(data: CreateSessionDTO): Promise<Session> {
    return prisma.session.create({
      data: {
        userId: data.userId,
        refreshToken: data.refreshToken,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        expiresAt: data.expiresAt,
      },
    });
  }

  async deleteByToken(token: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { refreshToken: token },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { userId },
    });
  }
}
