// seed/seed_supermarkets.js
import mongoose from "mongoose";
import dotenv from "dotenv";

import Supermarket from "../models/Supermarket.js";
import SupermarketItem from "../models/SupermarketItem.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set in .env");
  process.exit(1);
}

// Small helper to pick random element
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("🌱 Supermarket seed starting…");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB:", MONGODB_URI);

  // Clear existing supermarkets + items (only those collections)
  console.log("🧹 Clearing existing supermarkets & supermarket items…");
  await Promise.all([
    Supermarket.deleteMany({}),
    SupermarketItem.deleteMany({})
  ]);

  // Some sample supermarkets
  const supermarketsData = [
    {
      name: "FreshMart Superstore",
      description: "Groceries & daily essentials",
      address: "123 Market Street",
      imageUrl: "https://images.unsplash.com/photo-1586201375754-115c2e2b5a02",
      deliveryFee: 2.99,
      etaMins: 20,
      tags: ["Groceries", "Snacks", "Dairy"]
    },
    {
      name: "GreenBasket",
      description: "Fresh fruits, veggies & organics",
      address: "45 Orchard Lane",
      imageUrl: "https://images.unsplash.com/photo-1580915411954-282cb1c9c450",
      deliveryFee: 1.49,
      etaMins: 25,
      tags: ["Organic", "Produce", "Healthy"]
    },
    {
      name: "City Essentials",
      description: "Quick staples & late-night must-haves",
      address: "9 Downtown Plaza",
      imageUrl: "https://images.unsplash.com/photo-1580915411954-282cb1c9c450",
      deliveryFee: 0.99,
      etaMins: 15,
      tags: ["Convenience", "Snacks", "Beverages"]
    }
  ];

  console.log("🛒 Creating supermarkets…");
  const supermarkets = await Supermarket.insertMany(supermarketsData);
  console.log(`✅ Created ${supermarkets.length} supermarkets.`);

  const categories = ["Dairy", "Produce", "Snacks", "Beverages", "Bakery"];
  const itemsByMarket = [];

  for (const market of supermarkets) {
    console.log(`🥦 Creating items for ${market.name}…`);

    const baseItems = [
      {
        name: "Whole Milk 1L",
        description: "Fresh pasteurized milk",
        price: 2.49,
        category: "Dairy",
        unit: "bottle",
        stockQuantity: 50,
        imageUrl: "https://images.unsplash.com/photo-1582719478181-b7ba0da9d657"
      },
      {
        name: "Bananas (1kg)",
        description: "Ripe Cavendish bananas",
        price: 1.99,
        category: "Produce",
        unit: "kg",
        stockQuantity: 80,
        imageUrl: "https://images.unsplash.com/photo-1574226516831-e1dff420e43e"
      },
      {
        name: "Brown Bread Loaf",
        description: "Whole wheat sandwich bread",
        price: 2.29,
        category: "Bakery",
        unit: "loaf",
        stockQuantity: 40,
        imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e"
      },
      {
        name: "Potato Chips (Salted)",
        description: "Classic salted potato chips",
        price: 1.49,
        category: "Snacks",
        unit: "pack",
        stockQuantity: 100,
        imageUrl: "https://images.unsplash.com/photo-1584270354949-c26b0d5b3e56"
      },
      {
        name: "Orange Juice 1L",
        description: "No added sugar",
        price: 3.19,
        category: "Beverages",
        unit: "carton",
        stockQuantity: 60,
        imageUrl: "https://images.unsplash.com/photo-1577803645773-f96470509666"
      }
    ];

    const itemsToCreate = baseItems.map((item) => ({
      ...item,
      supermarketId: market._id,
      // slightly randomize stock and price to make data look more "real"
      price: Number((item.price * (0.9 + Math.random() * 0.2)).toFixed(2)),
      stockQuantity: item.stockQuantity + Math.floor(Math.random() * 20)
    }));

    const created = await SupermarketItem.insertMany(itemsToCreate);
    itemsByMarket.push({ market: market.name, count: created.length });
  }

  console.log("\n📊 Supermarket items created:");
  itemsByMarket.forEach((info) => {
    console.log(` - ${info.market}: ${info.count} items`);
  });

  const totalMarkets = await Supermarket.countDocuments();
  const totalItems = await SupermarketItem.countDocuments();

  console.log(`\n🌱 Supermarket seed complete: ${totalMarkets} supermarkets, ${totalItems} items.`);
  await mongoose.disconnect();
  console.log("🔌 Disconnected from MongoDB.");
}

main().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
