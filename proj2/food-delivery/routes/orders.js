import express from 'express';
import CartItem from '../models/CartItem.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';

const router = express.Router();

// GET /api/orders (list user's orders)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders (checkout current cart)
router.post('/', async (req, res) => {
  try {
    const cartItems = await CartItem.find({ userId: req.userId }).lean();
    if (cartItems.length === 0) return res.status(400).json({ error: 'Cart is empty' });

    // Ensure single-restaurant cart
    const restaurantSet = new Set(cartItems.map(ci => String(ci.restaurantId)));
    if (restaurantSet.size > 1) return res.status(400).json({ error: 'Cart must contain items from a single restaurant' });

    const restaurantId = cartItems[0].restaurantId;
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    // Build order items from current menu prices
    const menuIds = cartItems.map(ci => ci.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: menuIds } });
    const menuMap = new Map(menuItems.map(m => [String(m._id), m]));

    let subtotal = 0;
    const items = cartItems.map(ci => {
      const mi = menuMap.get(String(ci.menuItemId));
      const price = mi?.price ?? 0;
      const qty = ci.quantity;
      subtotal += price * qty;
      return {
        menuItemId: ci.menuItemId,
        name: mi?.name || 'Item',
        price,
        quantity: qty
      };
    });

    const deliveryFee = restaurant.deliveryFee ?? 0;
    const total = subtotal + deliveryFee;

    const order = await Order.create({
      userId: req.userId,
      restaurantId,
      items,
      subtotal,
      deliveryFee,
      total,
      status: 'placed'
    });

    // clear cart
    await CartItem.deleteMany({ userId: req.userId });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
