import mongoose from 'mongoose';
import { entitlementService as defaultEntitlementService } from '../core/entitlementService.js';
import { membershipService as defaultMembershipService } from '../core/membershipService.js';

const respond = (res, status, code, details) =>
  res.status(status).json({
    success: false,
    code,
    ...(details ? { details } : {}),
  });

export const createTenantAuthorization = ({
  membershipService = defaultMembershipService,
  entitlementService = defaultEntitlementService,
} = {}) => {
  const resolveContext = async (req, res) => {
    if (!req.user?._id) {
      respond(res, 401, 'AUTHENTICATION_REQUIRED');
      return null;
    }

    const tenantId = req.query?.tenantId;
    if (typeof tenantId !== 'string' || tenantId.length === 0) {
      respond(res, 400, 'TENANT_CONTEXT_REQUIRED');
      return null;
    }

    if (!mongoose.isValidObjectId(tenantId)) {
      respond(res, 400, 'TENANT_ID_INVALID');
      return null;
    }

    const context =
      await membershipService.resolveActiveMembershipAndTenant(
        req.user._id,
        tenantId,
      );
    if (!context) {
      respond(res, 403, 'TENANT_ACCESS_DENIED');
      return null;
    }

    req.life = {
      tenant: context.tenant,
      membership: context.membership,
    };
    return context;
  };

  const requireTenantMembership = async (req, res, next) => {
    try {
      const context = await resolveContext(req, res);
      if (!context) return;
      return next();
    } catch (error) {
      return next(error);
    }
  };

  const requireModuleEntitlement = (moduleKey) => async (req, res, next) => {
    try {
      const context = await resolveContext(req, res);
      if (!context) return;

      const access = await entitlementService.resolveEntitlementAccess(
        req.user._id,
        context.tenant._id,
        moduleKey,
      );
      if (!access.allowed) {
        return respond(res, 403, 'MODULE_ACCESS_DENIED', access.reason);
      }

      req.life.entitlement = access;
      return next();
    } catch (error) {
      return next(error);
    }
  };

  return { requireTenantMembership, requireModuleEntitlement };
};

const { requireTenantMembership, requireModuleEntitlement } =
  createTenantAuthorization();

export { requireTenantMembership, requireModuleEntitlement };
