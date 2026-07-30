import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma';
import { PrismaImageRepository } from '../../infrastructure/repositories/prismaImageRepository';
import { authenticate, requireRole, AuthenticatedRequest } from '../middlewares/authHandler';
import { enforceTenant, TenantedRequest } from '../middlewares/tenantHandler';
import { NotFoundError, BadRequestError } from '../../domain/errors/AppError';

const clientRouter = Router();
const imageRepository = new PrismaImageRepository();

// Validation schemas
const selectionSchema = z.object({
  isFavorite: z.boolean().optional(),
  isSelected: z.boolean().optional(),
  clientId: z.string(), // Unique ID representing the client user
});

const commentSchema = z.object({
  content: z.string().min(1, 'Comment text cannot be empty'),
  authorId: z.string(),
});

// 1. Client Action: Update selection/favorite status
clientRouter.post('/images/:imageId/select', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { imageId } = req.params;
    const validated = selectionSchema.parse(req.body);

    const image = await imageRepository.findById(imageId);
    if (!image) {
      throw new NotFoundError('Image not found');
    }

    const selection = await imageRepository.upsertSelection(imageId, validated.clientId, {
      isFavorite: validated.isFavorite,
      isSelected: validated.isSelected,
    });

    // Create an audit event for selection changes
    const album = await prisma.album.findUnique({ where: { id: image.albumId } });
    if (album) {
      await prisma.event.create({
        data: {
          studioId: album.studioId,
          albumId: album.id,
          name: 'SELECTION_UPDATED',
          type: 'CLIENT_ACTION',
          metadata: {
            imageId,
            clientId: validated.clientId,
            isFavorite: validated.isFavorite,
            isSelected: validated.isSelected,
          },
        },
      });
    }

    res.status(200).json({ success: true, selection });
  } catch (error) {
    next(error);
  }
});

// 2. Client Action: Post comment to image
clientRouter.post('/images/:imageId/comments', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { imageId } = req.params;
    const validated = commentSchema.parse(req.body);

    const image = await imageRepository.findById(imageId);
    if (!image) {
      throw new NotFoundError('Image not found');
    }

    const comment = await imageRepository.addComment(imageId, validated.authorId, validated.content);

    // Create log/audit event
    const album = await prisma.album.findUnique({ where: { id: image.albumId } });
    if (album) {
      await prisma.event.create({
        data: {
          studioId: album.studioId,
          albumId: album.id,
          name: 'COMMENT_ADDED',
          type: 'CLIENT_ACTION',
          metadata: {
            imageId,
            commentId: comment.id,
            authorId: validated.authorId,
          },
        },
      });
    }

    res.status(201).json({ success: true, comment });
  } catch (error) {
    next(error);
  }
});

// 3. Client Action: Get comments for image
clientRouter.get('/images/:imageId/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageId } = req.params;
    const comments = await imageRepository.listComments(imageId);
    res.status(200).json({ success: true, comments });
  } catch (error) {
    next(error);
  }
});

// 4. Studio Owner / Client: List selections for album
clientRouter.get('/albums/:albumId/selections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { albumId } = req.params;
    const { clientId } = req.query;

    const selections = await imageRepository.getSelections(
      albumId,
      clientId ? (clientId as string) : undefined
    );

    res.status(200).json({ success: true, selections });
  } catch (error) {
    next(error);
  }
});

export { clientRouter };
