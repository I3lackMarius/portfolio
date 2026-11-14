import { entitlementRepository } from '../core/entitlementRepository.js';
import { listModuleDefinitions } from '../core/moduleRegistry.js';
import { membershipRepository } from '../core/membershipRepository.js';
import { tenantRepository } from '../core/tenantRepository.js';

const publicTenant = (tenant) => ({
  id: String(tenant._id),
  name: tenant.name,
  type: tenant.type,
});

export const createLifeController = ({
  entitlementRepository: entitlementStore = entitlementRepository,
  membershipRepository: memberships = membershipRepository,
  tenantRepository: tenants = tenantRepository,
  getModules = listModuleDefinitions,
} = {}) => ({
  workspaces: async (req, res, next) => {
    try {
      const activeMemberships = await memberships.findActiveByUserId(
        req.user._id,
      );
      const workspaces = await Promise.all(
        activeMemberships.map(async (membership) => {
          const tenant = await tenants.findById(membership.tenantId);
          if (!tenant || tenant.status !== 'active') return null;

          return {
            ...publicTenant(tenant),
            role: membership.role,
          };
        }),
      );

      res.set('Cache-Control', 'no-store');
      return res.json({
        workspaces: workspaces
          .filter(Boolean)
          .sort((left, right) => left.name.localeCompare(right.name)),
      });
    } catch (error) {
      return next(error);
    }
  },

  context: async (req, res, next) => {
    try {
      const tenantId = req.life.tenant._id;
      const tenantEntitlements =
        await entitlementStore.findByTenantId(tenantId);
      const entitlementByModule = new Map(
        tenantEntitlements.map((entitlement) => [
          entitlement.moduleKey,
          entitlement,
        ]),
      );
      const modules = getModules().map((module) => {
        const entitlement = entitlementByModule.get(module.key);
        const entitled = entitlement?.status === 'active';
        return {
          key: module.key,
          name: module.name,
          implemented: module.implemented,
          entitled,
          available: module.implemented && entitled,
        };
      });

      res.set('Cache-Control', 'no-store');
      return res.json({
        tenant: publicTenant(req.life.tenant),
        membership: { role: req.life.membership.role },
        modules,
      });
    } catch (error) {
      return next(error);
    }
  },
});
