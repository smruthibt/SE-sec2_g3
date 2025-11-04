import express from "express";
import Coupon from "../models/Coupon.js";

const router = express.Router();

// GET /api/coupons
router.get("/", async (req, res) => {
  const userId = req.session.customerId;
  if (!userId) return res.status(401).json({ error: "Not logged in" });

  const coupons = await Coupon.find({
    userId,
    applied: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  res.json(coupons);
});

export default router;
