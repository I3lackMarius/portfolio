import { membershipRepository } from './membershipRepository.js';
import { tenantRepository } from './tenantRepository.js';

export const membershipService = {
  createMembership(userId, tenantId, role = 'member') {
    return membershipRepository.create({ userId, tenantId, role });
  },

  findMembershipByUserAndTenant(userId, tenantId) {
    return membershipRepository.findByTenantAndUser(tenantId, userId);
  },

  async resolveActiveMembershipAndTenant(userId, tenantId) {
    const [membership, tenant] = await Promise.all([
      membershipRepository.findByTenantAndUser(tenantId, userId),
      tenantRepository.findById(tenantId),
    ]);

    if (membership?.status !== 'active' || tenant?.status !== 'active') {
      return null;
    }

    return { membership, tenant };
  },
};
