import PortfolioItem from '../models/PortfolioItem.js';

// Get all portfolio items
export const getAllPortfolioItems = async (req, res) => {
  try {
    const portfolioItems = await PortfolioItem.find().sort({ createdAt: -1 });
    res.json(portfolioItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single portfolio item
export const getPortfolioItemById = async (req, res) => {
  try {
    const portfolioItem = await PortfolioItem.findById(req.params.id);
    if (!portfolioItem) {
      return res.status(404).json({ message: 'Portfolio item not found' });
    }
    res.json(portfolioItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new portfolio item
export const createPortfolioItem = async (req, res) => {
  try {
    const portfolioItem = new PortfolioItem(req.body);
    const savedItem = await portfolioItem.save();
    res.status(201).json(savedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update portfolio item
export const updatePortfolioItem = async (req, res) => {
  try {
    const portfolioItem = await PortfolioItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!portfolioItem) {
      return res.status(404).json({ message: 'Portfolio item not found' });
    }
    res.json(portfolioItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete portfolio item
export const deletePortfolioItem = async (req, res) => {
  try {
    const portfolioItem = await PortfolioItem.findByIdAndDelete(req.params.id);
    if (!portfolioItem) {
      return res.status(404).json({ message: 'Portfolio item not found' });
    }
    res.json({ message: 'Portfolio item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};