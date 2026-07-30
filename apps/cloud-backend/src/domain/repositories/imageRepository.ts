import { Image, SyncState, Selection, Comment } from '@prisma/client';

export interface CreateImageDTO {
  albumId: string;
  filename: string;
  localPath: string;
  relativeStream: string;
  hash: string;
  width: number;
  height: number;
  fileSize: bigint;
  exifData?: any;
}

export interface IImageRepository {
  findById(id: string): Promise<Image | null>;
  createMany(images: CreateImageDTO[]): Promise<number>;
  delete(id: string): Promise<void>;
  listByAlbum(albumId: string): Promise<Image[]>;
  updateSyncState(id: string, state: SyncState): Promise<Image>;
  upsertSelection(imageId: string, clientId: string, data: { isFavorite?: boolean; isSelected?: boolean }): Promise<Selection>;
  getSelections(albumId: string, clientId?: string): Promise<Selection[]>;
  addComment(imageId: string, authorId: string, content: string): Promise<Comment>;
  listComments(imageId: string): Promise<Comment[]>;
}
