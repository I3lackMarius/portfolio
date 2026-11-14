import { Schema } from 'mongoose';
import { getModuleDefinition } from './moduleRegistry.js';

const entitlementSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    moduleKey: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (moduleKey) => Boolean(getModuleDefinition(moduleKey)),
        message: 'Unknown Life2.0 module',
      },
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'revoked'],
      default: 'active',
      required: true,
    },
  },
  { timestamps: true },
);

entitlementSchema.index({ tenantId: 1, moduleKey: 1 }, { unique: true });

export default entitlementSchema;
