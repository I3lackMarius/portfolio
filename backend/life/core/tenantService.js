import { tenantRepository } from './tenantRepository.js';

const isPersonalOwnerDuplicate = (error) =>
  error?.code === 11000 &&
  (error.keyPattern?.personalOwnerId === 1 ||
    error.message?.includes('personalOwnerId'));

export const tenantService = {
  createPersonalTenant(ownerId, name) {
    return tenantRepository.create({
      name,
      type: 'personal',
      personalOwnerId: ownerId,
    });
  },

  createSharedTenant(name) {
    return tenantRepository.create({ name, type: 'shared' });
  },

  async getOrCreatePersonalTenant(ownerId, name) {
    const existing = await tenantRepository.findPersonalByOwnerId(ownerId);
    if (existing) return existing;

    try {
      return await this.createPersonalTenant(ownerId, name);
    } catch (error) {
      if (!isPersonalOwnerDuplicate(error)) throw error;

      const tenant = await tenantRepository.findPersonalByOwnerId(ownerId);
      if (tenant) return tenant;
      throw error;
    }
  },

  findTenantById(id) {
    return tenantRepository.findById(id);
  },
};
