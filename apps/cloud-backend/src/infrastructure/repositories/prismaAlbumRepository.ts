import { Album } from '@prisma/client';
import { IAlbumRepository, CreateAlbumDTO } from '../../domain/repositories/albumRepository';
import { prisma } from '../database/prisma';

export class PrismaAlbumRepository implements IAlbumRepository {
  async findById(id: string): Promise<Album | null> {
    return prisma.album.findUnique({
      where: { id },
      include: {
        images: {
          include: {
            selections: true,
            comments: true,
          },
          orderBy: { filename: 'asc' },
        },
      },
    });
  }

  async findBySlug(slug: string): Promise<Album | null> {
    return prisma.album.findUnique({
      where: { slug },
      include: {
        images: true,
      },
    });
  }

  async listByStudio(studioId: string): Promise<Album[]> {
    return prisma.album.findMany({
      where: { studioId },
      include: {
        _count: {
          select: { images: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: CreateAlbumDTO): Promise<Album> {
    return prisma.album.create({
      data: {
        studioId: data.studioId,
        name: data.name,
        description: data.description,
        slug: data.slug,
        isPrivate: data.isPrivate ?? true,
        passcodeHash: data.passcodeHash,
      },
    });
  }

  async update(id: string, data: Partial<Album>): Promise<Album> {
    return prisma.album.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.album.delete({ where: { id } });
  }
}
