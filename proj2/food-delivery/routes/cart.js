import express from "express";
import CartItem from "../models/CartItem.js";
import MenuItem from "../models/MenuItem.js";
import SupermarketItem from "../models/SupermarketItem.js";

const router = express.Router();

// GET /api/cart → get all cart items for the logged-in customer
router.get("/", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) return res.status(401).json({ message: "Not logged in" });

    // Populate both restaurant + supermarket references
    const cart = await CartItem.find({ userId: customerId })
      .populate({
        path: "menuItemId",
        populate: { path: "restaurantId" },
      })
      .populate({
        path: "supermarketItemId",
        populate: { path: "supermarketId" },
      })
      .lean();

    const detailedCart = cart.map((ci) => {
      const sourceType = ci.sourceType || "restaurant";

      if (sourceType === "supermarket") {
        const smItem = ci.supermarketItemId || {};
        const market = smItem.supermarketId || {};

        return {
          _id: ci._id,
          quantity: ci.quantity,
          sourceType,
          menuItemId: {
            _id: smItem._id,
            name: smItem.name || "Unknown Item",
            price: smItem.price || 0,
            imageUrl: smItem.imageUrl || null,
            isAvailable: smItem.isAvailable ?? true,
            // For compatibility with cart.html, we still call this "restaurantId"
            restaurantId: {
              _id: market._id,
              name: market.name || "Supermarket",
              deliveryFee: market.deliveryFee ?? 0,
              etaMins: market.etaMins ?? 30,
              type: "supermarket",
            },
          },
        };
      } else {
        const item = ci.menuItemId || {};
        const restaurant = item.restaurantId || {};

        return {
          _id: ci._id,
          quantity: ci.quantity,
          sourceType,
          menuItemId: {
            _id: item._id,
            name: item.name || "Unknown Item",
            price: item.price || 0,
            imageUrl: item.imageUrl || null,
            isAvailable: item.isAvailable ?? false,
            restaurantId: {
              _id: restaurant._id,
              name: restaurant.name || "Restaurant",
              deliveryFee: restaurant.deliveryFee ?? 0,
              etaMins: restaurant.etaMins ?? 30,
              type: "restaurant",
            },
          },
        };
      }
    });

    res.json(detailedCart);
  } catch (err) {
    console.error("Error loading cart:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cart  → add or update a cart item
// body: { menuItemId, restaurantId, quantity }
// ✅ POST /api/cart  → add or update a cart item
// Restaurant body:  { menuItemId, restaurantId, quantity }
// Supermarket body: { sourceType: "supermarket", supermarketItemId, supermarketId, quantity }
router.post("/", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) {
      return res.status(401).json({ error: "Customer not logged in" });
    }

    const {
      menuItemId,
      restaurantId,
      quantity = 1,
      sourceType,
      supermarketItemId,
      supermarketId,
    } = req.body;

    const qty = Number(quantity) || 1;

    // 💚 Supermarket flow
    if (sourceType === "supermarket") {
      if (!supermarketItemId || !supermarketId) {
        return res
          .status(400)
          .json({ error: "supermarketItemId and supermarketId required" });
      }

      const smItem = await SupermarketItem.findById(supermarketItemId);
      if (!smItem) {
        return res.status(404).json({ error: "Supermarket item not found" });
      }

      const item = await CartItem.findOneAndUpdate(
        {
          userId: customerId,
          sourceType: "supermarket",
          supermarketItemId,
          supermarketId,
        },
        {
          $inc: { quantity: qty },
          $setOnInsert: { sourceType: "supermarket" },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.status(201).json(item);
    }

    // 🍽 Restaurant flow (existing behaviour)
    if (!menuItemId || !restaurantId) {
      return res
        .status(400)
        .json({ error: "menuItemId and restaurantId required" });
    }

    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    const item = await CartItem.findOneAndUpdate(
      {
        userId: customerId,
        sourceType: "restaurant",
        menuItemId,
        restaurantId,
      },
      {
        $inc: { quantity: qty },
        $setOnInsert: { sourceType: "restaurant" },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(item);
  } catch (err) {
    console.error("❌ Error in POST /api/cart:", err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/cart/:id  → update quantity
router.patch("/:id", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) return res.status(401).json({ error: "Customer not logged in" });

    const { quantity } = req.body;
    if (quantity == null) return res.status(400).json({ error: "quantity required" });

    if (quantity < 1) {
      await CartItem.findOneAndDelete({ _id: req.params.id, userId: customerId });
      return res.json({ ok: true, deleted: true });
    }

    const item = await CartItem.findOneAndUpdate(
      { _id: req.params.id, userId: customerId },
      { $set: { quantity } },
      { new: true }
    );

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cart/:id  → remove one cart item
router.delete("/:id", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) return res.status(401).json({ error: "Customer not logged in" });

    await CartItem.findOneAndDelete({ _id: req.params.id, userId: customerId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cart  → clear all cart items for customer
router.delete("/", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) return res.status(401).json({ error: "Customer not logged in" });

    await CartItem.deleteMany({ userId: customerId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
