// routes/supermarkets.js
import express from 'express';
import Supermarket from '../models/Supermarket.js';

const router = express.Router();

// GET /api/supermarkets?q=...
router.get('/', async (req, res) => {
  try {
    const q = req.query.q?.trim();
    const filter = q
      ? { name: { $regex: q, $options: 'i' } }
      : {};

    const markets = await Supermarket.find(filter)
      .sort({ rating: -1, createdAt: -1 });

    res.json(markets);
  } catch (err) {
    console.error('Error fetching supermarkets:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/supermarkets/:id
router.get('/:id', async (req, res) => {
  try {
    const market = await Supermarket.findById(req.params.id);
    if (!market) {
      return res.status(404).json({ error: 'Supermarket not found' });
    }
    res.json(market);
  } catch (err) {
    console.error('Error fetching supermarket:', err);
    res.status(500).json({ error: err.message });
  }
});

// (Optional, for seeding/admin) POST /api/supermarkets
router.post('/', async (req, res) => {
  try {
    const { name, address, description, imageUrl, deliveryFee, etaMins, tags } = req.body;
    if (!name || !address) {
      return res.status(400).json({ error: 'name and address are required' });
    }

    const created = await Supermarket.create({
      name,
      address,
      description,
      imageUrl,
      deliveryFee,
      etaMins,
      tags
    });

    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating supermarket:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
