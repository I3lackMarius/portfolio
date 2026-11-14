import mongoose from 'mongoose';
import entitlementSchema from './entitlementSchema.js';

const Entitlement =
  mongoose.models.Entitlement ||
  mongoose.model('Entitlement', entitlementSchema);

export const entitlementRepository = {
  create(entitlementData) {
    return Entitlement.create(entitlementData);
  },

  findByTenantAndModule(tenantId, moduleKey) {
    return Entitlement.findOne({ tenantId, moduleKey });
  },

  findByTenantId(tenantId) {
    return Entitlement.find({ tenantId });
  },

  updateStatus(id, status) {
    return Entitlement.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true },
    );
  },
};

export { Entitlement };
