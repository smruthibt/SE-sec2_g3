import express from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import CartItem from "../models/CartItem.js";
import Restaurant from "../models/Restaurant.js";
import MenuItem from "../models/MenuItem.js";
import Coupon from "../models/Coupon.js";

const router = express.Router();

/**
 * GET /api/orders
 * Fetch all orders for the logged-in customer
 */
router.get("/", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) {
      return res.status(401).json({ message: "Not logged in" });
    }

    // fetch orders sorted by creation date
    const orders = await Order.find({ userId: customerId })
      .populate("items.menuItemId")
      .sort({ createdAt: -1 })
      .lean();

    // explicitly ensure challengeStatus and appliedCode fields are sent
    const enriched = orders.map(o => ({
      ...o,
      challengeStatus: o.challengeStatus || "NOT_STARTED",
      appliedCode: o.appliedCode || null,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/orders
 * Place a new order (optionally for selected cart items via { itemIds })
 */
router.post("/", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) {
      return res.status(401).json({ error: "Customer not logged in" });
    }

    // Optional subset: { itemIds: [...] }
    let itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds : null;
    if (itemIds && itemIds.length) {
      // safely cast to ObjectIds
      itemIds = itemIds
        .filter(Boolean)
        .map(id => {
          try { return new mongoose.Types.ObjectId(id); }
          catch { return null; }
        })
        .filter(Boolean);

      if (!itemIds.length) {
        return res.status(400).json({ error: "No matching items found to checkout" });
      }
    }

    // Build query: all items vs only selected ones
    const cartQuery = itemIds?.length
      ? { userId: customerId, _id: { $in: itemIds } }
      : { userId: customerId };

    const cartItems = await CartItem.find(cartQuery).lean();
    if (!cartItems.length) {
      return res.status(400).json({
        error: itemIds?.length ? "No matching items found to checkout" : "Cart is empty",
      });
    }

    // 🧩 Fetch authoritative menu data (both available & unavailable)
    const menuIds = cartItems.map(ci => ci.menuItemId);
    const allMenuItems = await MenuItem.find({ _id: { $in: menuIds } }).lean();

    // 🛑 Detect unavailable items
    const unavailableItems = allMenuItems.filter(m => !m.isAvailable);
    if (unavailableItems.length) {
      const names = unavailableItems.map(m => m.name || "Unknown item");

      // // Optional: auto-remove them from cart
      // await CartItem.deleteMany({
      //   userId: customerId,
      //   menuItemId: { $in: unavailableItems.map(m => m._id) }
      // });

      return res.status(400).json({
        error: "Some selected items are unavailable and were removed from your cart.",
        unavailableItems: names
      });
    }

    // ✅ Proceed only with available items
    const menuItems = allMenuItems.filter(m => m.isAvailable);
    const menuMap = new Map(menuItems.map(m => [String(m._id), m]));

    // Derive restaurant IDs from menu items
    const restIdSet = new Set(
      cartItems
        .map(ci => {
          const mi = menuMap.get(String(ci.menuItemId));
          return mi?.restaurantId ? String(mi.restaurantId) : undefined;
        })
        .filter(Boolean)
    );

    if (!restIdSet.size) {
      return res.status(400).json({ error: "Unable to determine restaurant for selected items" });
    }
    if (restIdSet.size > 1) {
      return res.status(400).json({ error: "Selected items must be from a single restaurant" });
    }

    const restaurantId = [...restIdSet][0];
    const restaurant = await Restaurant.findById(restaurantId).lean();
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    // ✅ Build order lines and compute totals
    let subtotal = 0;
    const items = cartItems.map(ci => {
      const mi = menuMap.get(String(ci.menuItemId));
      const price = Number(mi?.price ?? 0);
      const qty = Number(ci.quantity ?? 1);
      subtotal += price * qty;

      return {
        menuItemId: ci.menuItemId,
        name: mi?.name || "Item",
        price,
        quantity: qty,
      };
    });

    const deliveryFee = Number(restaurant.deliveryFee ?? 0);

    let discount = 0;
    let appliedCode = null;
    try {
      const coupons = await Coupon.find({
        userId: customerId,
        applied: false,
        expiresAt: { $gt: new Date() },
      });
      if (coupons.length) {
        // pick highest discount %
        coupons.sort((a, b) => (b.discountPct || 0) - (a.discountPct || 0));
        const best = coupons[0];
        discount = Math.round(subtotal * (best.discountPct / 100));
        appliedCode = best.code;
        best.applied = true;
        await best.save();
      }
    } catch (e) {
      console.warn("⚠️ Coupon lookup failed:", e.message);
    }

    const total = subtotal + deliveryFee - discount;

    // ✅ Create order document
    const order = await Order.create({
      userId: customerId,
      restaurantId,
      items,
      subtotal,
      deliveryFee,
      discount,
      appliedCode,
      total,
      status: "placed",
      paymentStatus: "paid"
    });

    // 🧹 Clear checked-out items from cart
    if (itemIds?.length) {
      await CartItem.deleteMany({ userId: customerId, _id: { $in: itemIds } });
    } else {
      await CartItem.deleteMany({ userId: customerId });
    }

    return res.status(201).json(order);
  } catch (err) {
    console.error("❌ Order error:", err);
    res.status(500).json({ error: err.message });
  }
});
// DELETE /api/orders -> delete ALL orders for current customer
router.delete("/", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) return res.status(401).json({ error: "Not logged in" });

    await Order.deleteMany({ userId: customerId });
    return res.json({ ok: true, message: "Order history cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id -> delete ONE order (owned by current customer)
router.delete("/:id", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) return res.status(401).json({ error: "Not logged in" });

    const { id } = req.params;
    const result = await Order.deleteOne({ _id: id, userId: customerId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    return res.json({ ok: true, message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
