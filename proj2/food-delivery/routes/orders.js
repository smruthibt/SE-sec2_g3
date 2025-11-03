import express from "express";
import Order from "../models/Order.js";
import CartItem from "../models/CartItem.js";
import Restaurant from "../models/Restaurant.js";
import MenuItem from "../models/MenuItem.js";

const router = express.Router();

// ✅ GET /api/orders  → fetch all orders for the logged-in customer
router.get("/", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) return res.status(401).json({ message: "Not logged in" });

    const orders = await Order.find({ userId: customerId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST /api/orders  → place a new order from the cart
router.post("/", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) return res.status(401).json({ error: "Customer not logged in" });

    const cartItems = await CartItem.find({ userId: customerId }).lean();
    if (cartItems.length === 0) return res.status(400).json({ error: "Cart is empty" });

    // Ensure all items are from the same restaurant
    const restaurantIds = new Set(cartItems.map(ci => String(ci.restaurantId)));
    if (restaurantIds.size > 1)
      return res.status(400).json({ error: "Cart must contain items from a single restaurant" });

    const restaurantId = cartItems[0].restaurantId;
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

    // Re-fetch menu items for accurate prices
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
        name: mi?.name || "Item",
        price,
        quantity: qty,
      };
    });

    const deliveryFee = restaurant.deliveryFee ?? 0;
    const total = subtotal + deliveryFee;

    // ✅ Create order
    const order = await Order.create({
      userId: customerId,
      restaurantId,
      items,
      subtotal,
      deliveryFee,
      total,
      status: "placed",
    });

    // ✅ Clear customer's cart
    await CartItem.deleteMany({ userId: customerId });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
