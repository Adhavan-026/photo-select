import { Studio, StudioSettings, Role, SubscriptionStatus } from '@prisma/client';
import { IStudioRepository, CreateStudioDTO } from '../../domain/repositories/studioRepository';
import { prisma } from '../database/prisma';

export class PrismaStudioRepository implements IStudioRepository {
  async findById(id: string): Promise<Studio | null> {
    return prisma.studio.findUnique({
      where: { id },
      include: { settings: true, subscription: true, license: true },
    });
  }

  async findBySubdomain(subdomain: string): Promise<Studio | null> {
    return prisma.studio.findUnique({ where: { subdomain } });
  }

  async createStudioWithDetails(data: CreateStudioDTO): Promise<Studio> {
    return prisma.$transaction(async (tx) => {
      // 1. Create Studio
      const studio = await tx.studio.create({
        data: {
          name: data.name,
          subdomain: data.subdomain,
          logoUrl: data.logoUrl,
        },
      });

      // 2. Create Owner User
      const user = await tx.user.create({
        data: {
          email: data.ownerEmail,
          passwordHash: data.ownerPasswordHash,
          firstName: data.ownerFirstName,
          lastName: data.ownerLastName,
          role: Role.STUDIO_OWNER,
          studioId: studio.id,
          isVerified: false, // OTP needed
        },
      });

      // 3. Link User to Employee Table
      await tx.employee.create({
        data: {
          userId: user.id,
          studioId: studio.id,
        },
      });

      // 4. Create Studio Settings
      await tx.studioSettings.create({
        data: {
          studioId: studio.id,
          watermarkText: data.name,
          watermarkAlpha: 0.3,
          allowDownloads: false,
          theme: 'dark',
        },
      });

      // 5. Create Default Subscription (14-day trial)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);

      await tx.subscription.create({
        data: {
          studioId: studio.id,
          planId: 'trial',
          priceId: 'free',
          status: SubscriptionStatus.TRIALING,
          endDate: trialEndDate,
        },
      });

      return studio;
    });
  }

  async update(id: string, data: Partial<Studio>): Promise<Studio> {
    return prisma.studio.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.studio.delete({ where: { id } });
  }

  async listAll(): Promise<Studio[]> {
    return prisma.studio.findMany({
      include: {
        subscription: true,
        users: {
          where: { role: Role.STUDIO_OWNER },
        },
      },
    });
  }

  async updateSettings(studioId: string, settings: Partial<StudioSettings>): Promise<StudioSettings> {
    return prisma.studioSettings.update({
      where: { studioId },
      data: settings,
    });
  }

  async getSettings(studioId: string): Promise<StudioSettings | null> {
    return prisma.studioSettings.findUnique({ where: { studioId } });
  }
}
