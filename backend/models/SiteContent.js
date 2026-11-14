import mongoose from 'mongoose';

const siteContentSchema = new mongoose.Schema(
  {
    locale: {
      type: String,
      required: true,
      enum: ['it', 'gb'],
      unique: true,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model('SiteContent', siteContentSchema);