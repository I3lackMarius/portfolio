import express from 'express';
import {
  getAllPortfolioItems,
  getPortfolioItemById,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem
} from '../controllers/portfolioController.js';

const router = express.Router();

// Get all portfolio items
router.get('/', getAllPortfolioItems);

// Get single portfolio item
router.get('/:id', getPortfolioItemById);

// Create new portfolio item (admin only)
router.post('/', createPortfolioItem);

// Update portfolio item (admin only)
router.put('/:id', updatePortfolioItem);

// Delete portfolio item (admin only)
router.delete('/:id', deletePortfolioItem);

export default router;