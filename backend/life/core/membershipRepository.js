import mongoose from 'mongoose';
import membershipSchema from './membershipSchema.js';

const Membership =
  mongoose.models.Membership ||
  mongoose.model('Membership', membershipSchema);

export const membershipRepository = {
  create(membershipData) {
    return Membership.create(membershipData);
  },

  findById(id) {
    return Membership.findById(id);
  },

  findByUserId(userId) {
    return Membership.find({ userId });
  },

  findActiveByUserId(userId) {
    return Membership.find({ userId, status: 'active' });
  },

  findByTenantAndUser(tenantId, userId) {
    return Membership.findOne({ tenantId, userId });
  },

  findActiveByTenantId(tenantId) {
    return Membership.find({ tenantId, status: 'active' });
  },

  updateStatus(id, status) {
    return Membership.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true },
    );
  },
};

export { Membership };
