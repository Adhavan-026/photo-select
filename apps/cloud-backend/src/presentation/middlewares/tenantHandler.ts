import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authHandler';
import { ForbiddenError, BadRequestError } from '../../domain/errors/AppError';
import { Role } from '@prisma/client';

export interface TenantedRequest extends AuthenticatedRequest {
  tenantId?: string;
}

export const enforceTenant = (req: TenantedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new ForbiddenError('Authentication required'));
  }

  // Super Admin can override or specify the tenant ID via query param
  if (req.user.role === Role.SUPER_ADMIN) {
    const queryStudioId = req.query.studioId as string;
    if (queryStudioId) {
      req.tenantId = queryStudioId;
    }
    // Note: Super admins can bypass tenant filters when doing global tasks.
    return next();
  }

  // Regular tenants must have a valid studioId
  if (!req.user.studioId) {
    return next(new ForbiddenError('User is not associated with any studio tenant'));
  }

  req.tenantId = req.user.studioId;
  next();
};
