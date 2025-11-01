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

describe("GET /api/restaurant-dashboard/orders (Restaurant views orders)", () => {
  it("should fetch orders for a given restaurant", async () => {
    const restaurantId = new mongoose.Types.ObjectId();
    const menuItemId = new mongoose.Types.ObjectId(); // 🆕 Added

    await Order.create({
      userId: "demo-user-1",
      restaurantId,
      items: [{ menuItemId, name: "Pizza", price: 12.99, quantity: 1 }],
      subtotal: 12.99,
      total: 12.99,
      status: "placed",
    });

    const res = await request(app)
      .get(`/api/restaurant-dashboard/orders?restaurantId=${restaurantId}`)
      .expect(200);

    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty("status", "placed");
  });
});
