import express from 'express';
import {
  getAllPortfolioItems,
  getPortfolioItemById
} from '../controllers/portfolioController.js';

const router = express.Router();

// Get all portfolio items
router.get('/', getAllPortfolioItems);

router.get('/:id', getPortfolioItemById);

export default router;