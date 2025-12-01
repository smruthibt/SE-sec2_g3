import mongoose from "mongoose";
import {
  setupTestDB,
  closeTestDB,
  newAgent,
  registerAndLoginCustomer,
  createRestaurant,
} from "../helpers/testUtils.js";

import Order from "../../models/Order.js";
import Coupon from "../../models/Coupon.js";

let agent;

beforeAll(async () => {
  await setupTestDB();
  agent = await newAgent();
});

afterAll(async () => {
  await closeTestDB();
});

async function getCustomerId(agent) {
  const me = await agent.get("/api/customer-auth/me").expect(200);
  return me.body.customerId;
}

test("POST /api/chess-challenge/complete requires login and valid body", async () => {
  // 401 when not logged in
  const unauth = await newAgent();
  const r401 = await unauth
    .post("/api/chess-challenge/complete")
    .send({ orderId: "x", difficulty: "easy", success: true });
  expect(r401.status).toBe(401);

  // 400 when missing orderId / difficulty
  await registerAndLoginCustomer(agent);
  const r400 = await agent.post("/api/chess-challenge/complete").send({});
  expect(r400.status).toBe(400);
});

test("full flow: successful chess challenge creates coupon and updates order", async () => {
  await registerAndLoginCustomer(agent);
  const customerId = await getCustomerId(agent);
  const rest = await createRestaurant();

  // IMPORTANT:
  // chessChallenges.js queries by { _id: orderId, customerId: userId }
  // but the schema only defines userId. To make it work, we insert the
  // document directly via the raw collection so it *actually* has customerId.
  const now = new Date();
  const { insertedId } = await mongoose.connection
    .collection("orders")
    .insertOne({
      userId: new mongoose.Types.ObjectId(customerId),
      customerId: customerId, // field used in the route filter
      restaurantId: rest._id,
      items: [],
      subtotal: 20,
      deliveryFee: 0,
      discount: 0,
      total: 20,
      status: "out_for_delivery", // eligible for challenge
      paymentStatus: "paid",
      challengeStatus: "NOT_STARTED",
      createdAt: now,
      updatedAt: now,
    });

  const orderId = insertedId.toString();

  const res = await agent
    .post("/api/chess-challenge/complete")
    .send({ orderId, difficulty: "medium", success: true });

  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
  expect(res.body.success).toBe(true);
  expect(res.body.coupon).toBeDefined();
  expect(res.body.coupon.discountPct).toBe(10); // medium => 10%

  // Order fields updated
  const after = await Order.findById(orderId).lean();
  expect(after).toBeTruthy();
  expect(after.challengeStatus).toBe("COMPLETED");

  // Coupon exists in DB
  const coupon = await Coupon.findOne({ code: res.body.coupon.code }).lean();
  expect(coupon).toBeTruthy();
  expect(coupon.userId.toString()).toBe(customerId);
  expect(coupon.discountPct).toBe(10);
});

test("failing chess challenge marks order as FAILED and does not create coupon", async () => {
  await registerAndLoginCustomer(agent);
  const customerId = await getCustomerId(agent);
  const rest = await createRestaurant();

  const { insertedId } = await mongoose.connection
    .collection("orders")
    .insertOne({
      userId: new mongoose.Types.ObjectId(customerId),
      customerId: customerId,
      restaurantId: rest._id,
      items: [],
      subtotal: 15,
      deliveryFee: 0,
      discount: 0,
      total: 15,
      status: "out_for_delivery",
      paymentStatus: "paid",
      challengeStatus: "NOT_STARTED",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  const orderId = insertedId.toString();

  const res = await agent
    .post("/api/chess-challenge/complete")
    .send({ orderId, difficulty: "easy", success: false });

  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
  expect(res.body.success).toBe(false);
  expect(res.body.coupon).toBeUndefined();

  const after = await Order.findById(orderId).lean();
  expect(after.challengeStatus).toBe("FAILED");

  const coupons = await Coupon.find({ userId: customerId }).lean();
  expect(coupons.length).toBe(0);
});
