import express from "express";
import jwt from "jsonwebtoken";
import ChallengeSession from "../models/ChallengeSession.js";
import Coupon from "../models/Coupon.js";
import Order from "../models/Order.js";
import { rewardMap } from "../config/rewards.js";

const router = express.Router();
const CHALLENGE_JWT_SECRET = process.env.CHALLENGE_JWT_SECRET || "dev-challenge-secret";
const JUDGE0_UI_URL = process.env.JUDGE0_UI_URL || "http://localhost:4000";

// 1. Start challenge session
router.post("/start", async (req, res) => {
  try {
    const userId = req.session?.customerId;
    const { orderId, difficulty = "easy" } = req.body || {};
    if (!userId) return res.status(401).json({ error: "Not logged in" });
    if (!orderId) return res.status(400).json({ error: "orderId required" });

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    const sess = await ChallengeSession.create({ userId, orderId, difficulty, expiresAt });

    const token = jwt.sign(
      {
        sid: sess._id.toString(),
        uid: String(userId),
        oid: String(orderId),
        diff: difficulty,
        exp: Math.floor(expiresAt.getTime() / 1000)
      },
      CHALLENGE_JWT_SECRET
    );

    const url = `${JUDGE0_UI_URL}/?session=${encodeURIComponent(token)}`;
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// 2. Get challenge session info (for Judge0 UI)
router.get("/session", async (req, res) => {
  try {
    const token = req.query?.token;
    if (!token) return res.status(400).json({ error: "token required" });

    const payload = jwt.verify(token, CHALLENGE_JWT_SECRET);
    const sess = await ChallengeSession.findById(payload.sid);
    if (!sess) return res.status(404).json({ error: "Session not found" });
    if (sess.status !== "ACTIVE" || sess.expiresAt <= new Date())
      return res.status(410).json({ error: "Session expired" });

    res.json({
      userId: String(sess.userId),
      orderId: String(sess.orderId),
      difficulty: sess.difficulty,
      expiresAt: sess.expiresAt
    });
  } catch (err) {
    const code = err?.name === "TokenExpiredError" ? 410 : 401;
    res.status(code).json({ error: "Invalid or expired token" });
  }
});

// 3. Complete challenge (called when user solves it)
router.post("/complete", async (req, res) => {
  try {
    const token = req.body?.token;
    if (!token) return res.status(400).json({ error: "token required" });

    const payload = jwt.verify(token, CHALLENGE_JWT_SECRET);
    const sess = await ChallengeSession.findById(payload.sid);
    if (!sess) return res.status(404).json({ error: "Session not found" });
    if (sess.status !== "ACTIVE" || sess.expiresAt <= new Date())
      return res.status(410).json({ error: "Too late — delivery completed" });

    const reward = rewardMap[sess.difficulty] || rewardMap.easy;
    const code = "FOOD-" + Math.random().toString(36).toUpperCase().slice(2, 8);

    await Coupon.create({
      userId: sess.userId,
      code,
      label: reward.label,
      discountPct: reward.discountPct,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    sess.status = "WON";
    await sess.save();

    // 🧩 Mark the corresponding order as completed
    await Order.findByIdAndUpdate(sess.orderId, {
      $set: { challengeStatus: "COMPLETED" }
    });

    res.json({ code, label: reward.label, discountPct: reward.discountPct });
  } catch (err) {
    const code = err?.name === "TokenExpiredError" ? 410 : 401;
    res.status(code).json({ error: "Invalid or expired token" });
  }
});

// 4. Mark challenge as failed / expired (optional)
router.post("/fail", async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: "token required" });

    const payload = jwt.verify(token, CHALLENGE_JWT_SECRET);
    const sess = await ChallengeSession.findById(payload.sid);
    if (!sess) return res.status(404).json({ error: "Session not found" });

    sess.status = "LOST";
    await sess.save();

    // 🧩 Mark the order as FAILED
    await Order.findByIdAndUpdate(sess.orderId, {
      $set: { challengeStatus: "FAILED" }
    });

    res.json({ ok: true });
  } catch (err) {
    const code = err?.name === "TokenExpiredError" ? 410 : 401;
    res.status(code).json({ error: "Invalid or expired token" });
  }
});


export default router;
