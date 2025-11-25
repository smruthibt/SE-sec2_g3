// routes/supermarketMenu.js
import express from 'express';
import SupermarketItem from '../models/SupermarketItem.js';

const router = express.Router();

// GET /api/supermarket-menu?supermarketId=...
router.get('/', async (req, res) => {
  try {
    const { supermarketId, category, q } = req.query;
    if (!supermarketId) {
      return res.status(400).json({ error: 'supermarketId is required' });
    }

    const filter = { supermarketId, isAvailable: true };
    if (category) filter.category = category;
    if (q) filter.name = { $regex: q, $options: 'i' };

    const items = await SupermarketItem.find(filter).sort({ name: 1 });
    res.json(items);
  } catch (err) {
    console.error('Error fetching supermarket menu:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/supermarket-menu
router.post('/', async (req, res) => {
  try {
    const {
      supermarketId,
      name,
      price,
      description,
      imageUrl,
      category,
      unit,
      stockQuantity
    } = req.body;

    if (!supermarketId || !name || !price) {
      return res.status(400).json({ error: 'supermarketId, name, and price are required' });
    }

    const item = await SupermarketItem.create({
      supermarketId,
      name,
      price,
      description,
      imageUrl,
      category,
      unit,
      stockQuantity
    });

    res.status(201).json({
      message: 'Supermarket item created successfully',
      item
    });
  } catch (err) {
    console.error('Error creating supermarket item:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
