import { Studio, StudioSettings, Subscription, License } from '@prisma/client';

export interface CreateStudioDTO {
  name: string;
  subdomain: string;
  logoUrl?: string;
  ownerEmail: string;
  ownerPasswordHash: string;
  ownerFirstName: string;
  ownerLastName: string;
}

export interface IStudioRepository {
  findById(id: string): Promise<Studio | null>;
  findBySubdomain(subdomain: string): Promise<Studio | null>;
  createStudioWithDetails(data: CreateStudioDTO): Promise<Studio>;
  update(id: string, data: Partial<Studio>): Promise<Studio>;
  delete(id: string): Promise<void>;
  listAll(): Promise<Studio[]>;
  updateSettings(studioId: string, settings: Partial<StudioSettings>): Promise<StudioSettings>;
  getSettings(studioId: string): Promise<StudioSettings | null>;
}
