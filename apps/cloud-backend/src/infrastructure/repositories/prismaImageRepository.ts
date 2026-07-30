import { Image, SyncState, Selection, Comment } from '@prisma/client';
import { IImageRepository, CreateImageDTO } from '../../domain/repositories/imageRepository';
import { prisma } from '../database/prisma';

export class PrismaImageRepository implements IImageRepository {
  async findById(id: string): Promise<Image | null> {
    return prisma.image.findUnique({
      where: { id },
      include: {
        selections: true,
        comments: true,
      },
    });
  }

  async createMany(images: CreateImageDTO[]): Promise<number> {
    // skipDuplicates is supported natively by Postgres
    const result = await prisma.image.createMany({
      data: images.map((img) => ({
        albumId: img.albumId,
        filename: img.filename,
        localPath: img.localPath,
        relativeStream: img.relativeStream,
        hash: img.hash,
        width: img.width,
        height: img.height,
        fileSize: img.fileSize,
        exifData: img.exifData ?? {},
        syncState: SyncState.SYNCED,
      })),
      skipDuplicates: true,
    });
    return result.count;
  }

  async delete(id: string): Promise<void> {
    await prisma.image.delete({ where: { id } });
  }

  async listByAlbum(albumId: string): Promise<Image[]> {
    return prisma.image.findMany({
      where: { albumId },
      include: {
        selections: true,
        _count: {
          select: { comments: true },
        },
      },
      orderBy: { filename: 'asc' },
    });
  }

  async updateSyncState(id: string, state: SyncState): Promise<Image> {
    return prisma.image.update({
      where: { id },
      data: { syncState: state },
    });
  }

  async upsertSelection(
    imageId: string,
    clientId: string,
    data: { isFavorite?: boolean; isSelected?: boolean }
  ): Promise<Selection> {
    return prisma.selection.upsert({
      where: {
        imageId_clientId: {
          imageId,
          clientId,
        },
      },
      update: data,
      create: {
        imageId,
        clientId,
        isFavorite: data.isFavorite ?? false,
        isSelected: data.isSelected ?? false,
      },
    });
  }

  async getSelections(albumId: string, clientId?: string): Promise<Selection[]> {
    return prisma.selection.findMany({
      where: {
        image: { albumId },
        ...(clientId ? { clientId } : {}),
      },
      include: {
        image: true,
      },
    });
  }

  async addComment(imageId: string, authorId: string, content: string): Promise<Comment> {
    return prisma.comment.create({
      data: {
        imageId,
        authorId,
        content,
      },
    });
  }

  async listComments(imageId: string): Promise<Comment[]> {
    return prisma.comment.findMany({
      where: { imageId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
