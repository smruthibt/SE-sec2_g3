import request from "supertest";
import app from "../../server.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Order from "../../models/Order.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("PATCH /api/restaurant-dashboard/orders/:id/status (Restaurant updates order)", () => {
  it("should update an order status successfully", async () => {
    const restaurantId = new mongoose.Types.ObjectId();
    const menuItemId = new mongoose.Types.ObjectId(); // 🆕 Added

    const order = await Order.create({
      userId: "demo-user-1",
      restaurantId,
      items: [{ menuItemId, name: "Burger", price: 9.99, quantity: 1 }],
      subtotal: 9.99,
      total: 9.99,
      status: "placed",
    });

    const res = await request(app)
      .patch(`/api/restaurant-dashboard/orders/${order._id}/status`)
      .send({ status: "accepted" })
      .expect(200);

    expect(res.body).toHaveProperty("status", "accepted");
  });
});
