import { Schema } from 'mongoose';

const membershipSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'member'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'disabled'],
      default: 'active',
      required: true,
    },
  },
  { timestamps: true },
);

membershipSchema.index({ tenantId: 1, userId: 1 }, { unique: true });

export default membershipSchema;
