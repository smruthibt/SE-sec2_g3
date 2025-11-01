import request from "supertest";
import app from "../../server.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import CartItem from "../../models/CartItem.js";
import MenuItem from "../../models/MenuItem.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("POST /api/orders (Multi-Restaurant Cart)", () => {
  it("should return 400 if cart has items from multiple restaurants", async () => {
    const customerId = "demo-user-1";
    //Create two restaurant IDs
    const restaurant1 = new mongoose.Types.ObjectId();
    const restaurant2 = new mongoose.Types.ObjectId();
    //Add two menu items under different restaurants
    const menuItem1 = await MenuItem.create({
      name: "Pizza",
      price: 12,
      restaurantId: restaurant1,
    });
    const menuItem2 = await MenuItem.create({
      name: "Burger",
      price: 10,
      restaurantId: restaurant2,
    });
    //Add both to cart for same user
    await CartItem.create([
      { userId: customerId, restaurantId: restaurant1, menuItemId: menuItem1._id, quantity: 1 },
      { userId: customerId, restaurantId: restaurant2, menuItemId: menuItem2._id, quantity: 2 },
    ]);
    //Attempt to place order
    const res = await request(app)
      .post("/api/orders")
      .send({})
      .expect(400);

    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatch(/single restaurant/i);
  });
});
