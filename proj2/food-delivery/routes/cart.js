import express from 'express';
import CartItem from '../models/CartItem.js';
import MenuItem from '../models/MenuItem.js';

const router = express.Router();

// GET /api/cart
router.get('/', async (req, res) => {
  try {
    const items = await CartItem.find({ userId: req.userId }).populate('menuItemId').lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cart
// body: { menuItemId, restaurantId, quantity }
router.post('/', async (req, res) => {
  try {
    const { menuItemId, restaurantId, quantity = 1 } = req.body;
    if (!menuItemId || !restaurantId) return res.status(400).json({ error: 'menuItemId and restaurantId required' });

    // Ensure the menu item exists
    const mi = await MenuItem.findById(menuItemId);
    if (!mi) return res.status(404).json({ error: 'Menu item not found' });

    // Upsert cart item
    const item = await CartItem.findOneAndUpdate(
      { userId: req.userId, menuItemId, restaurantId },
      { $inc: { quantity: Number(quantity) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/cart/:id  body: { quantity }
router.patch('/:id', async (req, res) => {
  try {
    const { quantity } = req.body;
    if (quantity == null) return res.status(400).json({ error: 'quantity required' });
    if (quantity < 1) {
      await CartItem.findOneAndDelete({ _id: req.params.id, userId: req.userId });
      return res.json({ ok: true, deleted: true });
    }
    const item = await CartItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: { quantity } },
      { new: true }
    );
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cart/:id
router.delete('/:id', async (req, res) => {
  try {
    await CartItem.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cart (clear all)
router.delete('/', async (req, res) => {
  try {
    await CartItem.deleteMany({ userId: req.userId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
