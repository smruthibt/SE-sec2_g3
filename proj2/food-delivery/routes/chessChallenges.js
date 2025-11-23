// routes/chessChallenge.js
import express from "express";
import Coupon from "../models/Coupon.js";
import Order from "../models/Order.js"; // adjust path if needed

const router = express.Router();

const DIFFICULTY_DISCOUNTS = {
  easy: 5,    // 5% off
  medium: 10, // 10% off
  hard: 15,   // 15% off
};

// Helper to generate a quick code like CHESS-AB12
function generateCouponCode(prefix = "CHESS") {
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${rand}`;
}

// POST /api/chess-challenge/complete
router.post("/complete", async (req, res) => {
  try {
    const userId = req.session.customerId;
    if (!userId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const { orderId, difficulty, success } = req.body || {};
    if (!orderId || !difficulty) {
      return res.status(400).json({ error: "Missing orderId or difficulty" });
    }

    const diffKey = String(difficulty).toLowerCase();
    const discountPercent = DIFFICULTY_DISCOUNTS[diffKey];
    if (!discountPercent) {
      return res.status(400).json({ error: "Unsupported difficulty level" });
    }

    // Find the order and ensure it belongs to this user
    const order = await Order.findOne({ _id: orderId, customerId: userId });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Optional guard: only allow when out_for_delivery
    if (!["out_for_delivery", "enroute"].includes(String(order.status).toLowerCase())) {
      return res.status(400).json({ error: "This order is not eligible for a chess challenge." });
    }

    // Prevent multiple challenges for the same order
    if (order.challengeStatus === "completed") {
      return res.status(400).json({ error: "Challenge already completed for this order." });
    }

    // If player failed, just mark status and return
    if (!success) {
      order.challengeStatus = "failed";
      order.challengeType = "chess";
      order.challengeDifficulty = diffKey;
      await order.save();
      return res.json({ ok: true, success: false });
    }

    // Success: create a coupon
    const code = generateCouponCode(diffKey.toUpperCase());
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const label = `Chess ${diffKey} – ${discountPercent}% off`;

    const coupon = await Coupon.create({
      userId,
      code,
      label,
      discountPercent,
      applied: false,
      expiresAt,
    });

    // Update order with challenge info
    order.challengeStatus = "completed";
    order.challengeType = "chess";
    order.challengeDifficulty = diffKey;
    await order.save();

    return res.json({
      ok: true,
      success: true,
      coupon,
    });
  } catch (err) {
    console.error("Chess challenge error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
