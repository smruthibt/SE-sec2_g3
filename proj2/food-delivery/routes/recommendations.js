import express from 'express';
import mongoose from 'mongoose';
import MenuItem from '../models/MenuItem.js';
import CartItem from '../models/CartItem.js';

const router = express.Router();

/**
 * GET /api/recommendations/menu
 * Query params:
 *   restaurantId (required)
 *   limit (optional, default 10)
 *
 * Uses:
 *   - Items currently in the user's cart
 *   - Category similarity (dessert, main, starter, etc.)
 *   - Only recommends items that exist in the same restaurant's menu
 */
router.get('/menu', async (req, res) => {
  try {
    const customerId = req.session.customerId;
    const { restaurantId, limit } = req.query;

    if (!customerId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }

    const max = Math.min(Number(limit) || 10, 20); // cap at 20

    // ---------------------------------------------------------
    // STEP 1: Get items currently in cart (NOT past orders)
    // ---------------------------------------------------------
    const cartItems = await CartItem.find({
      userId: customerId,
      restaurantId: restaurantId
    }).lean();

    // No items in cart → no recommendations
    if (!cartItems.length) {
      return res.json({ items: [] });
    }

    // IDs of items in cart
    const cartItemIds = cartItems.map(c => c.menuItemId.toString());

    // Fetch the actual menu items from the cart
    const cartMenuItems = await MenuItem.find({
      _id: { $in: cartItemIds },
      restaurantId,
      isAvailable: true
    }).lean();

    if (!cartMenuItems.length) {
      return res.json({ items: [] });
    }

    // ---------------------------------------------------------
    // STEP 2: Count which categories appear most in the cart
    // ---------------------------------------------------------
    const categoryCounts = new Map();

    for (const item of cartMenuItems) {
      const cat = item.category || 'main';
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    }

    // Sort categories by frequency
    const favouriteCategories = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1]) // highest count first
      .map(([cat]) => cat);

    if (!favouriteCategories.length) {
      return res.json({ items: [] });
    }

    // ---------------------------------------------------------
    // STEP 3: Load all menu items of this restaurant
    // ---------------------------------------------------------
    const allMenuItems = await MenuItem.find({
      restaurantId,
      isAvailable: true
    }).lean();

    // ---------------------------------------------------------
    // STEP 4: Build recommendations — SAME CATEGORY ONLY
    // ---------------------------------------------------------
    const recommendations = [];
    const seen = new Set();

    for (const cat of favouriteCategories) {
      for (const mi of allMenuItems) {
        const miCat = mi.category || 'main';
        const idStr = mi._id.toString();

        // Only same category
        if (miCat !== cat) continue;

        // Do not recommend items already in cart
        if (cartItemIds.includes(idStr)) continue;

        // Avoid duplicates
        if (seen.has(idStr)) continue;

        seen.add(idStr);
        recommendations.push(mi);

        if (recommendations.length >= max) break;
      }
      if (recommendations.length >= max) break;
    }

    // ---------------------------------------------------------
    // STEP 5: Return only category-matched recommendations
    // ---------------------------------------------------------
    return res.json({ items: recommendations });

  } catch (err) {
    console.error('Error in recommendations route:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;

