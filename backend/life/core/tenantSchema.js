import { Schema } from 'mongoose';

const tenantSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['personal', 'shared'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
      required: true,
    },
    personalOwnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
);

tenantSchema.pre('validate', function validatePersonalOwner() {
  if (this.type === 'personal' && !this.personalOwnerId) {
    this.invalidate('personalOwnerId', 'Personal tenants require an owner.');
  }
});

tenantSchema.index(
  { personalOwnerId: 1 },
  {
    unique: true,
    partialFilterExpression: { type: 'personal' },
  },
);

export default tenantSchema;
