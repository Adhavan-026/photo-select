import { Album } from '@prisma/client';

export interface CreateAlbumDTO {
  studioId: string;
  name: string;
  description?: string;
  slug: string;
  isPrivate?: boolean;
  passcodeHash?: string;
}

export interface IAlbumRepository {
  findById(id: string): Promise<Album | null>;
  findBySlug(slug: string): Promise<Album | null>;
  listByStudio(studioId: string): Promise<Album[]>;
  create(data: CreateAlbumDTO): Promise<Album>;
  update(id: string, data: Partial<Album>): Promise<Album>;
  delete(id: string): Promise<void>;
}
