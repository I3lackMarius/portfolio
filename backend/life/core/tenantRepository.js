import mongoose from 'mongoose';
import tenantSchema from './tenantSchema.js';

const Tenant =
  mongoose.models.Tenant || mongoose.model('Tenant', tenantSchema);

export const tenantRepository = {
  create(tenantData) {
    return Tenant.create(tenantData);
  },

  findById(id) {
    return Tenant.findById(id);
  },

  findPersonalByOwnerId(ownerId) {
    return Tenant.findOne({ personalOwnerId: ownerId, type: 'personal' });
  },

  updateStatus(id, status) {
    return Tenant.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true },
    );
  },
};

export { Tenant };
