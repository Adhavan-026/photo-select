import { User } from '@prisma/client';
import { IUserRepository, CreateUserDTO } from '../../domain/repositories/userRepository';
import { prisma } from '../database/prisma';

export class PrismaUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async create(data: CreateUserDTO): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        studioId: data.studioId || null,
        isVerified: data.isVerified ?? false,
      },
    });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  async listByStudio(studioId: string): Promise<User[]> {
    return prisma.user.findMany({ where: { studioId } });
  }
}
