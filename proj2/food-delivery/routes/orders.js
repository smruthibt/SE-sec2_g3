import express from 'express';
import CartItem from '../models/CartItem.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';

const router = express.Router();

// GET /api/orders (list user's orders)
router.get('/', async (req, res) => {
  try {
    console.log("Session:", req.session);   // 👀 debug
    const userId = req.session.customerId;  // ✅ pull from session
    console.log("Fetching orders for:", userId);

    if (!userId) return res.status(401).json({ message: 'Not logged in' });

    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    console.log("Found orders:", orders.length);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// 🧩 Debug route entry point — temporary check
router.post('/', async(req, res) => {
  console.log("🔥 inside POST /api/orders handler");
  try {
    const customerId = req.session.customerId;  // ✅ use session ID
    if (!customerId) {
      return res.status(401).send('Customer not logged in');
    }
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
      userId:  customerId,
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
