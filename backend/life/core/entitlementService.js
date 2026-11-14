import { entitlementRepository } from './entitlementRepository.js';
import { getModuleDefinition } from './moduleRegistry.js';
import { membershipRepository } from './membershipRepository.js';
import { tenantRepository } from './tenantRepository.js';

export const createEntitlementService = ({
  getModule = getModuleDefinition,
} = {}) => ({
  async resolveEntitlementAccess(userId, tenantId, moduleKey) {
    const module = getModule(moduleKey);
    if (!module) return { allowed: false, reason: 'unknown_module' };

    const [tenant, membership] = await Promise.all([
      tenantRepository.findById(tenantId),
      membershipRepository.findByTenantAndUser(tenantId, userId),
    ]);

    if (!tenant || tenant.status !== 'active') {
      return { allowed: false, reason: 'inactive_tenant' };
    }

    if (!membership) {
      return { allowed: false, reason: 'missing_membership' };
    }

    if (membership.status !== 'active') {
      return { allowed: false, reason: 'inactive_membership' };
    }

    const entitlement = await entitlementRepository.findByTenantAndModule(
      tenantId,
      moduleKey,
    );

    if (!entitlement) {
      return { allowed: false, reason: 'missing_entitlement' };
    }

    if (entitlement.status !== 'active') {
      return { allowed: false, reason: 'inactive_entitlement' };
    }

    if (!module.implemented) {
      return { allowed: false, reason: 'unimplemented_module' };
    }

    return {
      allowed: true,
      tenantId: String(tenant._id),
      userId: String(userId),
      moduleKey,
      entitlementId: String(entitlement._id),
    };
  },

  createEntitlement(tenantId, moduleKey) {
    if (!getModule(moduleKey)) {
      throw new Error('Cannot create an entitlement for an unknown module');
    }

    return entitlementRepository.create({ tenantId, moduleKey });
  },
});

export const entitlementService = createEntitlementService();
