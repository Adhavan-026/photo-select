import { Session } from '@prisma/client';

export interface CreateSessionDTO {
  userId: string;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}

export interface ISessionRepository {
  findByToken(token: string): Promise<Session | null>;
  create(data: CreateSessionDTO): Promise<Session>;
  deleteByToken(token: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}
