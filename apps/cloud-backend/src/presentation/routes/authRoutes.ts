import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../../application/services/authService';
import { PrismaUserRepository } from '../../infrastructure/repositories/prismaUserRepository';
import { PrismaStudioRepository } from '../../infrastructure/repositories/prismaStudioRepository';
import { PrismaSessionRepository } from '../../infrastructure/repositories/prismaSessionRepository';
import { errorHandler } from '../middlewares/errorHandler';

const authRouter = Router();

const userRepository = new PrismaUserRepository();
const studioRepository = new PrismaStudioRepository();
const sessionRepository = new PrismaSessionRepository();
const authService = new AuthService(userRepository, studioRepository, sessionRepository);

// Zod schemas for input validation
const studioRegisterSchema = z.object({
  name: z.string().min(2, 'Studio name must be at least 2 characters'),
  subdomain: z.string().min(2, 'Subdomain must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and dashes'),
  logoUrl: z.string().url().optional(),
  ownerEmail: z.string().email('Invalid email address'),
  ownerPasswordHash: z.string().min(6, 'Password must be at least 6 characters'),
  ownerFirstName: z.string().min(1, 'First name is required'),
  ownerLastName: z.string().min(1, 'Last name is required'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

const requestResetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// 1. Studio Onboarding / Registration
authRouter.post('/register/studio', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = studioRegisterSchema.parse(req.body);
    const user = await authService.registerStudio({
      name: validated.name,
      subdomain: validated.subdomain,
      logoUrl: validated.logoUrl,
      ownerEmail: validated.ownerEmail,
      ownerPasswordHash: validated.ownerPasswordHash,
      ownerFirstName: validated.ownerFirstName,
      ownerLastName: validated.ownerLastName,
    });

    res.status(201).json({
      success: true,
      message: 'Studio registered successfully. Verification OTP sent.',
      userId: user.id,
    });
  } catch (error) {
    next(error);
  }
});

// 2. Authentication Login
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = loginSchema.parse(req.body);
    const ipAddress = req.ip || undefined;
    const userAgent = req.headers['user-agent'] || undefined;

    const result = await authService.login(
      validated.email,
      validated.password,
      ipAddress,
      userAgent
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// 3. Token Refresh
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    const ipAddress = req.ip || undefined;
    const userAgent = req.headers['user-agent'] || undefined;

    const tokens = await authService.refresh(refreshToken, ipAddress, userAgent);

    res.status(200).json({
      success: true,
      ...tokens,
    });
  } catch (error) {
    next(error);
  }
});

// 4. Logout Session
authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
});

// 5. Verify email with OTP
authRouter.post('/verify-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = verifyOtpSchema.parse(req.body);
    await authService.verifyOTP(validated.email, validated.otp);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    next(error);
  }
});

// 6. Request password reset OTP
authRouter.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = requestResetSchema.parse(req.body);
    await authService.initiatePasswordReset(validated.email);

    // Always return success to prevent email enumeration
    res.status(200).json({
      success: true,
      message: 'If the email exists, a password reset code has been sent.',
    });
  } catch (error) {
    next(error);
  }
});

// 7. Complete password reset
authRouter.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(validated.email, validated.otp, validated.password);

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
});

export { authRouter };
