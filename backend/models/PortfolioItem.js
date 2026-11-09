import mongoose from 'mongoose';

const portfolioItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  technologies: [{
    type: String
  }],
  link: {
    type: String
  },
  github: {
    type: String
  },
  category: {
    type: String,
    enum: ['web', 'mobile', 'game', 'design'],
    default: 'web'
  }
}, {
  timestamps: true
});

export default mongoose.model('PortfolioItem', portfolioItemSchema);