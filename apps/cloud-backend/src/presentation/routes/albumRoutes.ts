import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { PrismaAlbumRepository } from '../../infrastructure/repositories/prismaAlbumRepository';
import { PrismaImageRepository } from '../../infrastructure/repositories/prismaImageRepository';
import { authenticate, requireRole, AuthenticatedRequest } from '../middlewares/authHandler';
import { enforceTenant, TenantedRequest } from '../middlewares/tenantHandler';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../domain/errors/AppError';
import bcrypt from 'bcryptjs';
import { prisma } from '../../infrastructure/database/prisma';

const albumRouter = Router();
const albumRepository = new PrismaAlbumRepository();
const imageRepository = new PrismaImageRepository();

const createAlbumSchema = z.object({
  name: z.string().min(2, 'Album name must be at least 2 characters'),
  description: z.string().optional(),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  isPrivate: z.boolean().default(true),
  passcode: z.string().min(4, 'Passcode must be at least 4 digits').optional(),
});

const updateAlbumSchema = createAlbumSchema.partial().extend({
  status: z.enum(['PENDING', 'SUBMITTED', 'COMPLETED']).optional(),
});

// 1. Create Album (Studio Owner / Employee)
albumRouter.post(
  '/',
  authenticate,
  requireRole([Role.STUDIO_OWNER, Role.EMPLOYEE]),
  enforceTenant,
  async (req: TenantedRequest, res: Response, next: NextFunction) => {
    try {
      const validated = createAlbumSchema.parse(req.body);
      const tenantId = req.tenantId!;

      const existingSlug = await albumRepository.findBySlug(validated.slug);
      if (existingSlug) {
        throw new BadRequestError('An album with this URL slug already exists');
      }

      let passcodeHash: string | undefined = undefined;
      if (validated.isPrivate && validated.passcode) {
        passcodeHash = await bcrypt.hash(validated.passcode, 6);
      }

      const album = await albumRepository.create({
        studioId: tenantId,
        name: validated.name,
        description: validated.description,
        slug: validated.slug,
        isPrivate: validated.isPrivate,
        passcodeHash,
      });

      res.status(201).json({ success: true, album });
    } catch (error) {
      next(error);
    }
  }
);

// 2. List Studio Albums (Studio Owner / Employee)
albumRouter.get(
  '/',
  authenticate,
  requireRole([Role.STUDIO_OWNER, Role.EMPLOYEE]),
  enforceTenant,
  async (req: TenantedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenantId!;
      const albums = await albumRepository.listByStudio(tenantId);
      res.status(200).json({ success: true, albums });
    } catch (error) {
      next(error);
    }
  }
);

// 3. Get Album Details with Images (Studio Owner / Employee)
albumRouter.get(
  '/:id',
  authenticate,
  requireRole([Role.STUDIO_OWNER, Role.EMPLOYEE]),
  enforceTenant,
  async (req: TenantedRequest, res: Response, next: NextFunction) => {
    try {
      const album = await albumRepository.findById(req.params.id);
      if (!album) {
        throw new NotFoundError('Album not found');
      }

      // Check tenant separation
      if (album.studioId !== req.tenantId) {
        throw new ForbiddenError('Access denied');
      }

      res.status(200).json({ success: true, album });
    } catch (error) {
      next(error);
    }
  }
);

// 4. Update Album (Studio Owner / Employee)
albumRouter.put(
  '/:id',
  authenticate,
  requireRole([Role.STUDIO_OWNER, Role.EMPLOYEE]),
  enforceTenant,
  async (req: TenantedRequest, res: Response, next: NextFunction) => {
    try {
      const album = await albumRepository.findById(req.params.id);
      if (!album || album.studioId !== req.tenantId) {
        throw new NotFoundError('Album not found');
      }

      const validated = updateAlbumSchema.parse(req.body);
      const updateData: Partial<typeof album> = {};

      if (validated.name !== undefined) updateData.name = validated.name;
      if (validated.description !== undefined) updateData.description = validated.description;
      if (validated.isPrivate !== undefined) updateData.isPrivate = validated.isPrivate;
      if (validated.status !== undefined) updateData.status = validated.status;

      if (validated.slug !== undefined && validated.slug !== album.slug) {
        const existingSlug = await albumRepository.findBySlug(validated.slug);
        if (existingSlug) {
          throw new BadRequestError('Album URL slug is already taken');
        }
        updateData.slug = validated.slug;
      }

      if (validated.passcode !== undefined) {
        updateData.passcodeHash = validated.passcode ? await bcrypt.hash(validated.passcode, 6) : null;
      }

      const updatedAlbum = await albumRepository.update(album.id, updateData);
      res.status(200).json({ success: true, album: updatedAlbum });
    } catch (error) {
      next(error);
    }
  }
);

// 5. Delete Album (Studio Owner)
albumRouter.delete(
  '/:id',
  authenticate,
  requireRole([Role.STUDIO_OWNER]),
  enforceTenant,
  async (req: TenantedRequest, res: Response, next: NextFunction) => {
    try {
      const album = await albumRepository.findById(req.params.id);
      if (!album || album.studioId !== req.tenantId) {
        throw new NotFoundError('Album not found');
      }

      await albumRepository.delete(album.id);
      res.status(200).json({ success: true, message: 'Album deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// 5.5. Get Public Album details by slug
albumRouter.get('/slug/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const album = await albumRepository.findBySlug(req.params.slug);
    if (!album) {
      throw new NotFoundError('Album not found');
    }

    const images = await imageRepository.listByAlbum(album.id);

    // Fetch active stream tunnel URL
    const latestHeartbeat = await prisma.event.findFirst({
      where: { 
        studioId: album.studioId, 
        name: 'AGENT_HEARTBEAT' 
      },
      orderBy: { createdAt: 'desc' },
    });

    const metadata = latestHeartbeat?.metadata as any;
    const tunnelUrl = metadata?.tunnelUrl || 'http://localhost:8082';

    const isAgentOnline = latestHeartbeat 
      ? (Date.now() - new Date(latestHeartbeat.createdAt).getTime()) < 3 * 60 * 1000
      : false;

    res.status(200).json({
      success: true,
      album: {
        ...album,
        images,
      },
      tunnelUrl,
      isAgentOnline,
    });
  } catch (error) {
    next(error);
  }
});

// 6. Public/Client Album Access via slug (Protected with Passcode if configured)
albumRouter.post('/slug/:slug/access', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { passcode } = req.body;
    const album = await albumRepository.findBySlug(req.params.slug);
    if (!album) {
      throw new NotFoundError('Album not found');
    }

    if (!album.isPrivate) {
      return res.status(200).json({ success: true, authenticated: true });
    }

    if (!album.passcodeHash) {
      // Private but has no passcode yet (requires normal Client Login check)
      return res.status(200).json({ success: true, authenticated: false, message: 'Requires client login' });
    }

    if (!passcode) {
      return res.status(400).json({ success: false, authenticated: false, message: 'Passcode is required' });
    }

    const isValid = await bcrypt.compare(passcode, album.passcodeHash);
    if (!isValid) {
      return res.status(401).json({ success: false, authenticated: false, message: 'Incorrect passcode' });
    }

    res.status(200).json({ success: true, authenticated: true });
  } catch (error) {
    next(error);
  }
});

// 6.5. Get Real Audit Events logged for the Studio
albumRouter.get(
  '/studio/events',
  authenticate,
  requireRole([Role.STUDIO_OWNER, Role.EMPLOYEE]),
  enforceTenant,
  async (req: TenantedRequest, res: Response, next: NextFunction) => {
    try {
      const events = await prisma.event.findMany({
        where: { studioId: req.tenantId! },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          album: {
            select: {
              name: true,
            },
          },
        },
      });

      res.status(200).json({ success: true, events });
    } catch (error) {
      next(error);
    }
  }
);

// 7. Submit client album selection
albumRouter.post('/slug/:slug/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clientId, selectedCount } = req.body;
    const album = await albumRepository.findBySlug(req.params.slug);
    if (!album) {
      throw new NotFoundError('Album not found');
    }

    // Update album status to SUBMITTED
    await prisma.album.update({
      where: { id: album.id },
      data: { status: 'SUBMITTED' },
    });

    await prisma.event.create({
      data: {
        studioId: album.studioId,
        albumId: album.id,
        name: 'SELECTION_COMPLETED',
        type: 'CLIENT_ACTION',
        metadata: {
          clientId,
          selectedCount,
          submittedAt: new Date().toISOString(),
        },
      },
    });

    res.status(200).json({ success: true, message: 'Selection submitted successfully' });
  } catch (error) {
    next(error);
  }
});

export { albumRouter };
