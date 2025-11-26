import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import SupermarketItem from "../models/SupermarketItem.js";   // ⬅️ adjust name if needed
import Order from "../models/Order.js";
import Supermarket from "../models/Supermarket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Middleware: ensure supermarket is logged in
function requireSupermarket(req, res, next) {
  if (!req.session.supermarketId) {
    return res.status(401).json({ error: "Not logged in as supermarket" });
  }
  next();
}

// Ensure uploads directory path matches the one used in app.js
const baseDir = path.join(process.cwd(), "uploads");

// Multer setup (with 5MB limit + JPEG/PNG filtering)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const kind = (req.body.kind || "misc").toLowerCase(); // 'restaurant' | 'dish' → here: 'supermarket' | 'dish'
    const dir = path.join(baseDir, "supermarkets", kind);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${ts}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// -----------------------------------------
// Upload product / supermarket images
// -----------------------------------------
router.post(
  "/upload",
  requireSupermarket,
  upload.array("photos", 10),
  (req, res) => {
    try {
      const urls = req.files.map((f) => {
        const rel = f.path
          .split("uploads")[1]
          .replace(/^[\\/]/, "")
          .replace(/\\/g, "/");
        return `/uploads/${rel}`;
      });
      res.json({ ok: true, urls });
    } catch (err) {
      console.error("Supermarket upload error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Save supermarket photo to DB
router.post("/photo", requireSupermarket, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: "imageUrl required" });

    const supermarketId = req.session.supermarketId;
    const supermarket = await Supermarket.findByIdAndUpdate(
      supermarketId,
      { imageUrl },
      { new: true }
    );

    if (!supermarket)
      return res.status(404).json({ error: "Supermarket not found" });

    res.json({
      ok: true,
      message: "Supermarket photo updated",
      supermarket,
    });
  } catch (err) {
    console.error("❌ Supermarket photo update error:", err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------
// Dashboard data (menu + orders)
// -----------------------------------------
router.get("/data", requireSupermarket, async (req, res) => {
  try {
    const supermarketId = req.session.supermarketId;

    const supermarket = await Supermarket.findById(supermarketId);
    const menuItems = await SupermarketItem.find({ supermarketId });
    
  const orders = await Order.find({
      restaurantId: supermarketId,    // 👈 sellerId = this supermarket
      sellerType: "supermarket"       // 👈 only supermarket orders
    })
      .sort({ updatedAt: -1 })
      .lean();
    console.log(
      "📦 Supermarket dashboard fetched",
      orders.length,
      "orders:",
      orders.map((o) => o.status)
    );

    res.json({
      ok: true,
      supermarketName: req.session.supermarketName || "Supermarket",
      supermarketImageUrl: supermarket?.imageUrl || null,
      menuItems,
      orders,
    });
  } catch (err) {
    console.error("❌ Supermarket dashboard data error:", err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------
// Create product (menu item)
// -----------------------------------------
router.post("/menu", requireSupermarket, async (req, res) => {
  try {
    const { name, description, price, imageUrl, isAvailable } = req.body;
    const supermarketId = req.session.supermarketId;

    const item = await SupermarketItem.create({
      supermarketId,
      name,
      description,
      price,
      imageUrl,
      isAvailable: typeof isAvailable === "boolean" ? isAvailable : true,
    });

    res.status(201).json({ ok: true, item });
  } catch (err) {
    console.error("❌ Supermarket create item error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Set availability (idempotent)
router.patch("/menu/:id/availability", requireSupermarket, async (req, res) => {
  try {
    const { isAvailable } = req.body;
    if (typeof isAvailable !== "boolean") {
      return res
        .status(400)
        .json({ error: "isAvailable (boolean) is required" });
    }

    const item = await SupermarketItem.findOneAndUpdate(
      { _id: req.params.id, supermarketId: req.session.supermarketId },
      { isAvailable },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: "Item not found" });

    res.json({ ok: true, item });
  } catch (err) {
    console.error("❌ Supermarket availability error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Edit product
router.put("/menu/:id", requireSupermarket, async (req, res) => {
  try {
    const item = await SupermarketItem.findOneAndUpdate(
      { _id: req.params.id, supermarketId: req.session.supermarketId },
      req.body,
      { new: true }
    );
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json({ ok: true, item });
  } catch (err) {
    console.error("❌ Supermarket edit item error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete product
router.delete("/menu/:id", requireSupermarket, async (req, res) => {
  try {
    const deleted = await SupermarketItem.findOneAndDelete({
      _id: req.params.id,
      supermarketId: req.session.supermarketId,
    });
    if (!deleted) return res.status(404).json({ error: "Item not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Supermarket delete item error:", err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------
// Update order status (supermarket-side)
// -----------------------------------------
router.patch("/orders/:id/status", requireSupermarket, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    const allowedStatuses = [
      "preparing",
      "ready_for_pickup",
      "out_for_delivery",
    ];
    if (!allowedStatuses.includes(status)) {
      return res.status(403).json({ error: "Unauthorized status update" });
    }

    const updated = await Order.findOneAndUpdate(
      { _id: id, supermarketId: req.session.supermarketId },
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json(updated);
  } catch (err) {
    console.error("❌ Supermarket order status error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Public fetch by supermarketId (e.g., for admin/test)
router.get("/orders", async (req, res) => {
  try {
    const { supermarketId } = req.query;
    if (!supermarketId) {
      return res.status(400).json({ error: "supermarketId is required" });
    }

    const orders = await Order.find({ supermarketId }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) {
    console.error("❌ Supermarket public orders error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
