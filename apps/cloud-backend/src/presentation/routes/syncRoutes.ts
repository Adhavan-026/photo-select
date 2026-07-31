import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role, SyncState } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma';
import { PrismaImageRepository } from '../../infrastructure/repositories/prismaImageRepository';
import { PrismaStudioRepository } from '../../infrastructure/repositories/prismaStudioRepository';
import { authenticate, requireRole, AuthenticatedRequest } from '../middlewares/authHandler';
import { enforceTenant, TenantedRequest } from '../middlewares/tenantHandler';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../domain/errors/AppError';

const syncRouter = Router();
const imageRepository = new PrismaImageRepository();
const studioRepository = new PrismaStudioRepository();

// Validation Schemas
const heartbeatSchema = z.object({
  status: z.enum(['online', 'syncing', 'idle']),
  watchedFoldersCount: z.number(),
  localImagesCount: z.number(),
  cpuUsage: z.number().optional(),
  memoryUsage: z.number().optional(),
  tunnelUrl: z.string().url('Invalid tunnel URL format'),
  progress: z.array(
    z.object({
      albumId: z.string(),
      total: z.number(),
      synced: z.number(),
    })
  ).optional(),
});

const imageMetaSchema = z.object({
  filename: z.string().min(1),
  localPath: z.string().min(1),
  relativeStream: z.string().min(1),
  hash: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fileSize: z.coerce.bigint(),
  exifData: z.any().optional(),
});

const syncImagesSchema = z.object({
  images: z.array(imageMetaSchema),
});

const validateLicenseSchema = z.object({
  licenseKey: z.string().min(8),
});

// 1. Validate License (from Local Agent)
syncRouter.post('/license/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = validateLicenseSchema.parse(req.body);
    const license = await prisma.license.findUnique({
      where: { key: validated.licenseKey },
      include: { studio: true },
    });

    if (!license || !license.isActive) {
      throw new ForbiddenError('License key is invalid or suspended');
    }

    if (license.expiresAt && license.expiresAt < new Date()) {
      throw new ForbiddenError('License key has expired');
    }

    res.status(200).json({
      success: true,
      studioId: license.studioId,
      studioName: license.studio.name,
      maxStorage: license.maxStorage.toString(),
    });
  } catch (error) {
    next(error);
  }
});

// 2. Local Agent Heartbeat & Remote Tunnel Registration
// Uses owner/employee authentication since agent uses a config token (JWT representing the studio user)
syncRouter.post(
  '/heartbeat',
  authenticate,
  requireRole([Role.STUDIO_OWNER, Role.EMPLOYEE]),
  enforceTenant,
  async (req: TenantedRequest, res: Response, next: NextFunction) => {
    try {
      const validated = heartbeatSchema.parse(req.body);
      const studioId = req.tenantId!;

      // Update studio with new remote tunnel URL & update settings/audit logs if needed
      await prisma.studio.update({
        where: { id: studioId },
        data: {
          // Store the tunnel URL as settings metadata or event log
          // Let's create an audit log or save it under settings
          settings: {
            upsert: {
              create: {
                watermarkText: 'PhotoSelect',
                theme: 'dark',
              },
              update: {},
            },
          },
        },
      });

      // Record a system event log
      await prisma.event.create({
        data: {
          studioId,
          albumId: null, // System log
          name: 'AGENT_HEARTBEAT',
          type: 'SYSTEM',
          metadata: {
            status: validated.status,
            watchedFoldersCount: validated.watchedFoldersCount,
            localImagesCount: validated.localImagesCount,
            tunnelUrl: validated.tunnelUrl,
            timestamp: new Date().toISOString(),
          },
        },
      });

      // Update totalImages on Album records based on heartbeat progress breakdown
      if (validated.progress) {
        for (const item of validated.progress) {
          await prisma.album.updateMany({
            where: { id: item.albumId, studioId },
            data: { totalImages: item.total },
          });
        }
      }

      // Fetch studio settings to return to the agent
      const settings = await prisma.studioSettings.findUnique({
        where: { studioId },
      });

      res.status(200).json({
        success: true,
        message: 'Heartbeat received successfully',
        settings: {
          watermarkText: settings?.watermarkText || 'PhotoSelect',
          allowDownloads: settings?.allowDownloads || false,
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 3. Batch Image Sync from Local Agent
syncRouter.post(
  '/album/:albumId/images',
  authenticate,
  requireRole([Role.STUDIO_OWNER, Role.EMPLOYEE]),
  enforceTenant,
  async (req: TenantedRequest, res: Response, next: NextFunction) => {
    try {
      const { albumId } = req.params;
      const studioId = req.tenantId!;

      // Confirm album belongs to the tenant
      const album = await prisma.album.findUnique({ where: { id: albumId } });
      if (!album || album.studioId !== studioId) {
        throw new NotFoundError('Album not found or access denied');
      }

      const validated = syncImagesSchema.parse(req.body);

      // Map to CreateImageDTO format
      const formattedImages = validated.images.map((img) => ({
        albumId,
        filename: img.filename,
        localPath: img.localPath,
        relativeStream: img.relativeStream,
        hash: img.hash,
        width: img.width,
        height: img.height,
        fileSize: img.fileSize,
        exifData: img.exifData,
      }));

      const syncCount = await imageRepository.createMany(formattedImages);

      // Accumulate storage metrics on the Studio level
      const totalBytes = validated.images.reduce((acc, img) => acc + BigInt(img.fileSize.toString()), BigInt(0));
      await prisma.studio.update({
        where: { id: studioId },
        data: {
          storageUsage: {
            increment: totalBytes,
          },
        },
      });

      res.status(200).json({
        success: true,
        message: `Synced ${syncCount} new images metadata successfully`,
        totalSynced: syncCount,
      });
    } catch (error) {
      next(error);
    }
  }
);

export { syncRouter };
