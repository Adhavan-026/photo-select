import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaStudioRepository } from '../../infrastructure/repositories/prismaStudioRepository';
import { authenticate, requireRole } from '../middlewares/authHandler';
import { enforceTenant, TenantedRequest } from '../middlewares/tenantHandler';
import { Role } from '@prisma/client';
import { NotFoundError } from '../../domain/errors/AppError';

const studioRouter = Router();
const studioRepository = new PrismaStudioRepository();

const settingsUpdateSchema = z.object({
  watermarkText: z.string().min(1, 'Watermark text cannot be empty').max(50).optional(),
  allowDownloads: z.boolean().optional(),
  theme: z.string().optional(),
});

// 1. Get studio settings
studioRouter.get(
  '/settings',
  authenticate,
  requireRole([Role.STUDIO_OWNER, Role.EMPLOYEE]),
  enforceTenant,
  async (req: TenantedRequest, res: Response, next: NextFunction) => {
    try {
      const settings = await studioRepository.getSettings(req.tenantId!);
      if (!settings) {
        throw new NotFoundError('Studio settings not found');
      }
      res.status(200).json({ success: true, settings });
    } catch (error) {
      next(error);
    }
  }
);

// 2. Update studio settings
studioRouter.put(
  '/settings',
  authenticate,
  requireRole([Role.STUDIO_OWNER]),
  enforceTenant,
  async (req: TenantedRequest, res: Response, next: NextFunction) => {
    try {
      const validated = settingsUpdateSchema.parse(req.body);
      const settings = await studioRepository.updateSettings(req.tenantId!, validated);
      res.status(200).json({ success: true, settings });
    } catch (error) {
      next(error);
    }
  }
);

export { studioRouter };
