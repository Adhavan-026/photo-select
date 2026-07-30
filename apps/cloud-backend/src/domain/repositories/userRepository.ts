import { User, Role } from '@prisma/client';

export interface CreateUserDTO {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: Role;
  studioId?: string;
  isVerified?: boolean;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserDTO): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
  listByStudio(studioId: string): Promise<User[]>;
}
