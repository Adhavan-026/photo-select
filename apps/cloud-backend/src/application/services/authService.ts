import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Role, Session } from '@prisma/client';
import { env } from '../../infrastructure/config/env';
import { IUserRepository, CreateUserDTO } from '../../domain/repositories/userRepository';
import { IStudioRepository, CreateStudioDTO } from '../../domain/repositories/studioRepository';
import { ISessionRepository } from '../../domain/repositories/sessionRepository';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from '../../domain/errors/AppError';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    studioId: string | null;
    isVerified: boolean;
  };
}

export class AuthService {
  constructor(
    private userRepository: IUserRepository,
    private studioRepository: IStudioRepository,
    private sessionRepository: ISessionRepository
  ) {}

  private generateAccessToken(user: User): string {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      studioId: user.studioId,
    };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  }

  private generateRefreshToken(user: User): string {
    const payload = {
      id: user.id,
    };
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  }

  async registerStudio(dto: CreateStudioDTO): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(dto.ownerEmail);
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists');
    }

    const existingStudio = await this.studioRepository.findBySubdomain(dto.subdomain);
    if (existingStudio) {
      throw new ConflictError('This studio subdomain is already taken');
    }

    const passwordHash = await bcrypt.hash(dto.ownerPasswordHash, 10);

    const studio = await this.studioRepository.createStudioWithDetails({
      ...dto,
      ownerPasswordHash: passwordHash,
    });

    const user = await this.userRepository.findByEmail(dto.ownerEmail);
    if (!user) {
      throw new NotFoundError('Error creating user profile during registration');
    }

    // Trigger OTP (log to console)
    await this.sendVerificationOTP(user);

    return user;
  }

  async registerClientOrEmployee(
    dto: Omit<CreateUserDTO, 'passwordHash'> & { passwordPlain: string }
  ): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(dto.passwordPlain, 10);

    const user = await this.userRepository.create({
      ...dto,
      passwordHash,
    });

    return user;
  }

  async login(
    email: string,
    passwordPlain: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenResponse> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.sessionRepository.create({
      userId: user.id,
      refreshToken,
      ipAddress,
      userAgent,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        studioId: user.studioId,
        isVerified: user.isVerified,
      },
    };
  }

  async refresh(
    token: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const session = await this.sessionRepository.findByToken(token);
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await this.sessionRepository.deleteByToken(token);
      }
      throw new UnauthorizedError('Session expired or invalid');
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      throw new UnauthorizedError('User associated with session not found');
    }

    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user);

    // Delete old session and write new one
    await this.sessionRepository.deleteByToken(token);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.sessionRepository.create({
      userId: user.id,
      refreshToken: newRefreshToken,
      ipAddress,
      userAgent,
      expiresAt,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(token: string): Promise<void> {
    await this.sessionRepository.deleteByToken(token);
  }

  async sendVerificationOTP(user: User): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const otpHash = await bcrypt.hash(otp, 6);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.userRepository.update(user.id, {
      otpHash,
      otpExpiresAt,
    });

    // Simulated email dispatch
    console.log(`✉️ [SIMULATED EMAIL] Verification OTP for ${user.email}: ${otp}`);

    return otp;
  }

  async verifyOTP(email: string, otp: string): Promise<boolean> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || !user.otpHash || !user.otpExpiresAt) {
      throw new BadRequestError('Verification request invalid or expired');
    }

    if (user.otpExpiresAt < new Date()) {
      throw new BadRequestError('Verification code has expired');
    }

    const isValid = await bcrypt.compare(otp, user.otpHash);
    if (!isValid) {
      throw new BadRequestError('Incorrect verification code');
    }

    await this.userRepository.update(user.id, {
      isVerified: true,
      otpHash: null,
      otpExpiresAt: null,
    });

    return true;
  }

  async initiatePasswordReset(email: string): Promise<string | null> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return null; // Return null but do not expose User enumeration to frontend
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 6);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.userRepository.update(user.id, {
      otpHash,
      otpExpiresAt,
    });

    console.log(`✉️ [SIMULATED EMAIL] Password Reset OTP for ${user.email}: ${otp}`);
    return otp;
  }

  async resetPassword(email: string, otp: string, passwordPlain: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || !user.otpHash || !user.otpExpiresAt) {
      throw new BadRequestError('Invalid reset attempt');
    }

    if (user.otpExpiresAt < new Date()) {
      throw new BadRequestError('Reset code expired');
    }

    const isValid = await bcrypt.compare(otp, user.otpHash);
    if (!isValid) {
      throw new BadRequestError('Invalid reset code');
    }

    const passwordHash = await bcrypt.hash(passwordPlain, 10);

    await this.userRepository.update(user.id, {
      passwordHash,
      otpHash: null,
      otpExpiresAt: null,
    });
  }
}
