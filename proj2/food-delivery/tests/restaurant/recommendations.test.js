/**
 * Recommendation Engine Tests
 * Using Jest + Supertest + mongodb-memory-server
 */

import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../../server.js";

import CustomerAuth from "../../models/CustomerAuth.js";
import Restaurant from "../../models/Restaurant.js";
import MenuItem from "../../models/MenuItem.js";
import CartItem from "../../models/CartItem.js";

// ------------------------------
// Utility: login user
// ------------------------------
async function loginUser(agent) {
  const email = `test${Date.now()}@email.com`;

  const res = await agent
    .post("/api/customer-auth/register")
    .send({
      name: "Test User",
      email,
      password: "password123",
      address: "Test Street",
    })
    .expect(201);

  const cookie = res.headers["set-cookie"];
  return cookie;
}

let mongoServer;
let agent;

let restaurantId;
let main1, main2, dessert1, dessert2;

// ------------------------------
// BEFORE ALL (single block)
// ------------------------------
beforeAll(
  async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    agent = request(app);

    // Create restaurant
    const restaurant = await Restaurant.create({
      name: "Testaurant",
      cuisine: "Indian",
      address: "123 Street",
    });

    restaurantId = restaurant._id.toString();

    // MENU items
    main1 = await MenuItem.create({
      restaurantId,
      name: "Biriyani",
      category: "main",
      price: 12,
      isAvailable: true,
    });

    main2 = await MenuItem.create({
      restaurantId,
      name: "Butter Chicken",
      category: "main",
      price: 14,
      isAvailable: true,
    });

    dessert1 = await MenuItem.create({
      restaurantId,
      name: "Cheesecake",
      category: "dessert",
      price: 8,
      isAvailable: true,
    });

    dessert2 = await MenuItem.create({
      restaurantId,
      name: "Chocolate Lava Cake",
      category: "dessert",
      price: 9,
      isAvailable: true,
    });
  },
  30000 // TIMEOUT FIX
);

// ------------------------------
// AFTER ALL
// ------------------------------
afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

// ------------------------------
// TEST 1: Empty cart returns []
// ------------------------------
test("returns [] when the cart is empty", async () => {
  const cookie = await loginUser(agent);

  const res = await agent
    .get(`/api/recommendations/menu?restaurantId=${restaurantId}`)
    .set("Cookie", cookie)
    .expect(200);

  expect(Array.isArray(res.body.items)).toBe(true);
  expect(res.body.items.length).toBe(0);
});

// ------------------------------
// TEST 2: category-based recommendations
// ------------------------------
test("returns recommendations matching item category", async () => {
  const cookie = await loginUser(agent);

  // Cart ADD returns 201 (fix)
  await agent
    .post("/api/cart")
    .set("Cookie", cookie)
    .send({
      restaurantId,
      menuItemId: dessert1._id.toString(),
      quantity: 1,
    })
    .expect(201);

  const res = await agent
    .get(`/api/recommendations/menu?restaurantId=${restaurantId}`)
    .set("Cookie", cookie)
    .expect(200);

  const ids = res.body.items.map((i) => i._id.toString());

  // Should recommend dessert2, not dessert1
  expect(ids).toContain(dessert2._id.toString());
  expect(ids).not.toContain(dessert1._id.toString());

  // category correctness
  for (const item of res.body.items) {
    expect(item.category).toBe("dessert");
  }
});

// ------------------------------
// TEST 3: Does NOT recommend items already in cart
// ------------------------------
test("does NOT recommend items already in cart", async () => {
  const cookie = await loginUser(agent);

  await agent
    .post("/api/cart")
    .set("Cookie", cookie)
    .send({
      restaurantId,
      menuItemId: main1._id.toString(),
      quantity: 1,
    })
    .expect(201);

  const res = await agent
    .get(`/api/recommendations/menu?restaurantId=${restaurantId}`)
    .set("Cookie", cookie)
    .expect(200);

  const ids = res.body.items.map((i) => i._id.toString());

  expect(ids).not.toContain(main1._id.toString());
});
