import mongoose from "mongoose";
import {
  setupTestDB,
  closeTestDB,
  newAgent,
} from "../helpers/testUtils.js";

import Supermarket from "../../models/Supermarket.js";
import SupermarketItem from "../../models/SupermarketItem.js";
import Order from "../../models/Order.js";

let agent;

beforeAll(async () => {
  await setupTestDB();
  agent = await newAgent();
});

afterAll(async () => {
  await closeTestDB();
});

async function registerAndLoginSupermarket(agent, overrides = {}) {
  const email = overrides.email || `market_${Date.now()}@test.com`;
  const password = overrides.password || "superSecret123";

  await agent
    .post("/api/supermarket-auth/register")
    .send({
      name: overrides.name || "Test Market",
      description: overrides.description || "Your friendly test market",
      email,
      password,
      address: overrides.address || "123 Grocery St, Raleigh, NC",
    })
    .expect(201);

  await agent
    .post("/api/supermarket-auth/login")
    .send({ email, password })
    .expect(200);

  const me = await agent.get("/api/supermarket-auth/me").expect(200);
  const supermarketId = me.body.supermarketId;

  return { supermarketId, email, password };
}

test("GET /api/supermarket-dashboard/data requires auth and returns menu+orders", async () => {
  // unauth should fail
  const unauth = await newAgent();
  await unauth.get("/api/supermarket-dashboard/data").expect(401);

  // login as a supermarket
  const { supermarketId } = await registerAndLoginSupermarket(agent);

  // create a menu item via dashboard
  const menuRes = await agent
    .post("/api/supermarket-dashboard/menu")
    .send({
      name: "Test Apples",
      description: "Crisp and fresh",
      price: 2.5,
      imageUrl: "/uploads/test-apples.jpg",
      isAvailable: true,
    })
    .expect(201);

  expect(menuRes.body.ok).toBe(true);
  expect(menuRes.body.item).toBeDefined();
  expect(menuRes.body.item.name).toBe("Test Apples");

  // dashboard data
  const dataRes = await agent
    .get("/api/supermarket-dashboard/data")
    .expect(200);

  expect(dataRes.body.ok).toBe(true);
  expect(Array.isArray(dataRes.body.menuItems)).toBe(true);
  expect(Array.isArray(dataRes.body.orders)).toBe(true);
  expect(dataRes.body.supermarketName).toBeTruthy();
  expect(
    dataRes.body.menuItems.some((i) => i.name === "Test Apples")
  ).toBe(true);
});

test("POST /api/supermarket-dashboard/photo validates imageUrl and updates supermarket", async () => {
  const { supermarketId } = await registerAndLoginSupermarket(agent);

  // 400 when imageUrl missing
  const bad = await agent
    .post("/api/supermarket-dashboard/photo")
    .send({})
    .expect(400);
  expect(bad.body.error).toMatch(/imageUrl/i);

  const imageUrl = "/uploads/supermarkets/logo.png";

  const res = await agent
    .post("/api/supermarket-dashboard/photo")
    .send({ imageUrl })
    .expect(200);

  expect(res.body.ok).toBe(true);
  expect(res.body.supermarket).toBeDefined();
  expect(res.body.supermarket.imageUrl).toBe(imageUrl);

  const dbMarket = await Supermarket.findById(supermarketId).lean();
  expect(dbMarket).toBeTruthy();
  expect(dbMarket.imageUrl).toBe(imageUrl);
});

test("POST /api/supermarket-dashboard/photo returns 404 if supermarket not found", async () => {
  const { supermarketId } = await registerAndLoginSupermarket(agent);

  // delete supermarket from DB but keep session.supermarketId
  await Supermarket.findByIdAndDelete(supermarketId);

  const res = await agent
    .post("/api/supermarket-dashboard/photo")
    .send({ imageUrl: "/uploads/supermarkets/missing.png" })
    .expect(404);

  expect(res.body.error).toMatch(/not found/i);
});

test("POST /api/supermarket-dashboard/orders/:id/status updates supermarket order", async () => {
  const { supermarketId } = await registerAndLoginSupermarket(agent);

  // Insert an order directly with supermarketId so the dashboard route can find it
  const now = new Date();
  const { insertedId } = await mongoose.connection
    .collection("orders")
    .insertOne({
      userId: new mongoose.Types.ObjectId(),
      supermarketId: new mongoose.Types.ObjectId(supermarketId),
      sellerType: "supermarket",
      restaurantName: "Test Market",
      items: [],
      subtotal: 10,
      discount: 0,
      deliveryFee: 0,
      total: 10,
      status: "preparing",
      paymentStatus: "paid",
      createdAt: now,
      updatedAt: now,
    });

  const orderId = insertedId.toString();

  // invalid status → 403
  await agent
    .patch(`/api/supermarket-dashboard/orders/${orderId}/status`)
    .send({ status: "delivered" }) // not in allowedStatuses
    .expect(403);

  // missing status → 400
  await agent
    .patch(`/api/supermarket-dashboard/orders/${orderId}/status`)
    .send({})
    .expect(400);

  // valid status → 200
  const res = await agent
    .patch(`/api/supermarket-dashboard/orders/${orderId}/status`)
    .send({ status: "ready_for_pickup" })
    .expect(200);

  expect(res.body.status).toBe("ready_for_pickup");

  const dbOrder = await Order.findById(orderId).lean();
  expect(dbOrder.status).toBe("ready_for_pickup");
});

test("PATCH /api/supermarket-dashboard/orders/:id/status returns 404 when order not found", async () => {
  await registerAndLoginSupermarket(agent);

  const bogusId = new mongoose.Types.ObjectId().toString();

  const res = await agent
    .patch(`/api/supermarket-dashboard/orders/${bogusId}/status`)
    .send({ status: "preparing" })
    .expect(404);

  expect(res.body.error).toMatch(/not found/i);
});

test("GET /api/supermarket-dashboard/orders?supermarketId=... returns at least that market's orders", async () => {
  const { supermarketId } = await registerAndLoginSupermarket(agent);

  const now = new Date();
  const otherMarketId = new mongoose.Types.ObjectId();

  await mongoose.connection.collection("orders").insertMany([
    {
      userId: new mongoose.Types.ObjectId(),
      supermarketId: new mongoose.Types.ObjectId(supermarketId),
      sellerType: "supermarket",
      items: [],
      subtotal: 5,
      total: 5,
      status: "preparing",
      paymentStatus: "paid",
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: new mongoose.Types.ObjectId(),
      supermarketId: otherMarketId,
      sellerType: "supermarket",
      items: [],
      subtotal: 7,
      total: 7,
      status: "preparing",
      paymentStatus: "paid",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const res = await agent
    .get(`/api/supermarket-dashboard/orders?supermarketId=${supermarketId}`)
    .expect(200);

  const body = res.body;
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBeGreaterThan(0);

  // All are supermarket orders
  const sellerTypes = body.map((o) => o.sellerType);
  expect(sellerTypes.every((t) => t === "supermarket")).toBe(true);

  // At least one order for this supermarketId exists
  const ids = body.map((o) => String(o.supermarketId?._id || o.supermarketId));
  expect(ids).toContain(String(supermarketId));
});

test("Supermarket catalog: /api/supermarkets and /api/supermarket-menu", async () => {
  const { supermarketId } = await registerAndLoginSupermarket(agent);

  // Supermarket should exist in DB
  const market = await Supermarket.findById(supermarketId).lean();
  expect(market).toBeTruthy();

  // Create item via /api/supermarket-menu
  const createRes = await agent
    .post("/api/supermarket-menu")
    .send({
      supermarketId,
      name: "Bananas",
      price: 1.25,
      description: "Yellow and tasty",
      imageUrl: "/uploads/banana.jpg",
      category: "Fruits",
      unit: "kg",
      stockQuantity: 50,
    })
    .expect(201);

  expect(createRes.body.item).toBeDefined();
  expect(createRes.body.item.name).toBe("Bananas");

  // GET menu requires supermarketId
  await agent.get("/api/supermarket-menu").expect(400);

  const menuRes = await agent
    .get(`/api/supermarket-menu?supermarketId=${supermarketId}`)
    .expect(200);

  expect(Array.isArray(menuRes.body)).toBe(true);
  expect(menuRes.body.some((i) => i.name === "Bananas")).toBe(true);

  // /api/supermarkets list
  const listRes = await agent.get("/api/supermarkets").expect(200);
  expect(Array.isArray(listRes.body)).toBe(true);
  expect(
    listRes.body.some((m) => String(m._id) === String(supermarketId))
  ).toBe(true);

  // Search by q
  const searchRes = await agent
    .get("/api/supermarkets?q=Test")
    .expect(200);
  expect(
    searchRes.body.some((m) => String(m._id) === String(supermarketId))
  ).toBe(true);
});

test("PATCH /api/supermarket-dashboard/menu/:id/availability flips isAvailable", async () => {
  const { supermarketId } = await registerAndLoginSupermarket(agent);

  // Seed via dashboard
  const createRes = await agent
    .post("/api/supermarket-dashboard/menu")
    .send({
      name: "Milk Carton",
      description: "1L whole milk",
      price: 3.25,
      imageUrl: "/uploads/milk.jpg",
      isAvailable: true,
    })
    .expect(201);

  const itemId = createRes.body.item._id;

  const patchRes = await agent
    .patch(`/api/supermarket-dashboard/menu/${itemId}/availability`)
    .send({ isAvailable: false })
    .expect(200);

  expect(patchRes.body.ok).toBe(true);
  expect(patchRes.body.item.isAvailable).toBe(false);

  const dbItem = await SupermarketItem.findById(itemId).lean();
  expect(dbItem).toBeTruthy();
  expect(dbItem.isAvailable).toBe(false);
});

test("PATCH /api/supermarket-dashboard/menu/:id/availability rejects non-boolean", async () => {
  const { supermarketId } = await registerAndLoginSupermarket(agent);

  const createRes = await agent
    .post("/api/supermarket-dashboard/menu")
    .send({
      name: "Chips Packet",
      description: "Crispy",
      price: 1.75,
      imageUrl: "/uploads/chips.jpg",
      isAvailable: true,
    })
    .expect(201);

  const itemId = createRes.body.item._id;

  const bad = await agent
    .patch(`/api/supermarket-dashboard/menu/${itemId}/availability`)
    .send({ isAvailable: "yes" })
    .expect(400);

  expect(bad.body.error).toMatch(/isAvailable/i);
});

test("PUT /api/supermarket-dashboard/menu/:id updates item fields", async () => {
  const { supermarketId } = await registerAndLoginSupermarket(agent);

  const createRes = await agent
    .post("/api/supermarket-dashboard/menu")
    .send({
      name: "Old Cereal",
      description: "Plain",
      price: 4.0,
      imageUrl: "/uploads/old.jpg",
      isAvailable: true,
    })
    .expect(201);

  const itemId = createRes.body.item._id;

  const updatedPayload = {
    name: "New Cereal",
    description: "Honey clusters",
    price: 4.75,
    imageUrl: "/uploads/new.jpg",
    isAvailable: false,
  };

  const putRes = await agent
    .put(`/api/supermarket-dashboard/menu/${itemId}`)
    .send(updatedPayload)
    .expect(200);

  expect(putRes.body.ok).toBe(true);
  expect(putRes.body.item.name).toBe("New Cereal");
  expect(putRes.body.item.price).toBe(4.75);
  expect(putRes.body.item.isAvailable).toBe(false);

  const dbItem = await SupermarketItem.findById(itemId).lean();
  expect(dbItem).toBeTruthy();
  expect(dbItem.name).toBe("New Cereal");
  expect(dbItem.isAvailable).toBe(false);
});

test("DELETE /api/supermarket-dashboard/menu/:id removes an item", async () => {
  const { supermarketId } = await registerAndLoginSupermarket(agent);

  const createRes = await agent
    .post("/api/supermarket-dashboard/menu")
    .send({
      name: "Yogurt Cup",
      description: "Strawberry",
      price: 1.5,
      imageUrl: "/uploads/yogurt.jpg",
      isAvailable: true,
    })
    .expect(201);

  const itemId = createRes.body.item._id;

  const delRes = await agent
    .delete(`/api/supermarket-dashboard/menu/${itemId}`)
    .expect(200);

  expect(delRes.body.ok).toBe(true);

  const dbItem = await SupermarketItem.findById(itemId).lean();
  expect(dbItem).toBeFalsy();
});
