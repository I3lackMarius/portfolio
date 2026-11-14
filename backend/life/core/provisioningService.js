import mongoose from 'mongoose';
import { membershipRepository } from './membershipRepository.js';
import { tenantService } from './tenantService.js';

const isDuplicateKeyError = (error) => error?.code === 11000;

export const provisioningService = {
  async provisionPersonalWorkspace(userId) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new TypeError('A valid user ID is required for provisioning');
    }

    const tenant = await tenantService.getOrCreatePersonalTenant(
      userId,
      'Personal workspace',
    );
    let membership = await membershipRepository.findByTenantAndUser(
      tenant._id,
      userId,
    );

    if (!membership) {
      try {
        membership = await membershipRepository.create({
          userId,
          tenantId: tenant._id,
          role: 'owner',
        });
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;

        membership = await membershipRepository.findByTenantAndUser(
          tenant._id,
          userId,
        );
        if (!membership) throw error;
      }
    }

    return { tenant, membership };
  },
};
