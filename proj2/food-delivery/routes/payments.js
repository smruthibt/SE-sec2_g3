// routes/payments.js
import express from "express";
import Cart from "../models/CartItem.js";
import Order from "../models/Order.js";
import Coupon from "../models/Coupon.js";

const router = express.Router();

/**
 * POST /api/payments/mock-checkout
 * Simulates a successful payment and creates a paid order
 */
router.post("/mock-checkout", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    // Fetch the user's cart and populate both restaurant + supermarket references
    const items = await Cart.find({ userId: customerId })
      .populate({
        path: "menuItemId",
        populate: { path: "restaurantId", select: "name deliveryFee etaMins" },
      })
      .populate({
        path: "supermarketItemId",
        populate: { path: "supermarketId", select: "name deliveryFee etaMins" },
      });

    if (!items.length) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Calculate totals, handling both restaurant + supermarket lines
    const subtotal = items.reduce((sum, i) => {
      const isSupermarket = i.sourceType === "supermarket";
      const price = isSupermarket
        ? i.supermarketItemId?.price || 0
        : i.menuItemId?.price || 0;
      return sum + price * i.quantity;
    }, 0);

    const deliveryFee = 0; // still simplified

    let appliedCode = null;
    let discount = 0;
    const { couponCode } = req.body || {};
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode,
        userId: customerId,
        applied: false,
        expiresAt: { $gt: new Date() },
      });
      if (coupon) {
        appliedCode = coupon.code;
        // Apply % discount on subtotal
        discount = Math.round(
          (subtotal * (coupon.discountPct || 0)) / 100
        );
      }
    }

    const finalTotal = Math.max(subtotal + deliveryFee - discount, 0);

    // Determine "seller" id (restaurant or supermarket) from first item
    const first = items[0];
    const firstIsSupermarket = first.sourceType === "supermarket";
    const sellerId = firstIsSupermarket
      ? first.supermarketItemId?.supermarketId?._id || first.supermarketId
      : first.menuItemId?.restaurantId?._id || first.restaurantId;

    // Build order items array (works for both types)
    const orderItems = items.map((i) => {
      const isSupermarket = i.sourceType === "supermarket";
      const src = isSupermarket ? i.supermarketItemId : i.menuItemId;
      return {
        menuItemId: src?._id,          // may be MenuItem or SupermarketItem
        name: src?.name || "Item",
        price: src?.price || 0,
        quantity: i.quantity,
      };
    });

    // Create an order: "placed" + "paid"
    const order = await Order.create({
      userId: customerId,
      // For supermarket orders, this will actually be a supermarketId,
      // which is fine – it's just an ObjectId reference.
      restaurantId: sellerId,
      items: orderItems,
      subtotal,
      deliveryFee,
      discount,
      appliedCode,
      total: finalTotal,
      status: "placed",
      paymentStatus: "paid",
    });

    // Clear the cart after successful order
    await Cart.deleteMany({ userId: customerId });

    // Mark coupon as applied if one was used
    if (appliedCode) {
      await Coupon.updateOne(
        { code: appliedCode, userId: customerId },
        { $set: { applied: true } }
      );
    }

    return res.json({
      ok: true,
      message: "Payment successful! Your order has been placed.",
      orderId: order._id,
      discountApplied: appliedCode
        ? `Coupon ${appliedCode} applied: -$${discount}`
        : null,
    });
  } catch (err) {
    console.error("Payment error:", err);
    return res.status(500).json({ error: err.message || "Payment failed" });
  }
});

export default router;
