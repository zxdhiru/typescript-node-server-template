import { Request, Response, NextFunction } from 'express';
import { AdminModel } from '@/modules/admin/admin.schema';
import { AuthenticationError, AuthorizationError } from '@/shared/utils/errors';
import { USER_ROLES } from '@/shared/constants';
import { IAdminPermissions } from '@/modules/admin/admin.schema';

/**
 * Extended Express Request with admin data
 */
declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        email: string;
        adminRole: string;
        permissions: IAdminPermissions;
      };
    }
  }
}

/**
 * Verify that authenticated user is an admin
 */
export const requireAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Not authenticated');
    }

    // Verify user is admin role
    if (req.user.role !== USER_ROLES.ADMIN) {
      throw new AuthorizationError('Admin access required');
    }

    // Get admin details
    const admin = await AdminModel.findById(req.user.userId);

    if (!admin) {
      throw new AuthenticationError('Admin account not found');
    }

    if (!admin.isActive) {
      throw new AuthorizationError('Admin account is deactivated');
    }

    // Attach admin data to request
    req.admin = {
      id: admin._id.toString(),
      email: admin.email,
      adminRole: admin.adminRole,
      permissions: admin.permissions,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require specific admin permission
 */
export const requirePermission = (permission: keyof IAdminPermissions) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.admin) {
        throw new AuthenticationError('Admin authentication required');
      }

      // Super admin has all permissions
      if (req.admin.adminRole === 'super_admin') {
        return next();
      }

      // Check specific permission
      if (!req.admin.permissions[permission]) {
        throw new AuthorizationError(`Permission denied. Required permission: ${permission}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require super admin role
 */
export const requireSuperAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    if (!req.admin) {
      throw new AuthenticationError('Admin authentication required');
    }

    if (req.admin.adminRole !== 'super_admin') {
      throw new AuthorizationError('Super admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};
