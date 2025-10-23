import request from "supertest";
import mongoose from "mongoose";
import app from "../../server.js";
import { MongoMemoryServer } from "mongodb-memory-server";

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

describe("POST /api/customer-auth/login", () => {
  it("should log in successfully with valid credentials", async () => {
    const customer = {
      name: "Alice Smith",
      email: "alice@example.com",
      password: "secure123",
      favoriteDishes: ["Pasta", "Salad"],
      dietRequirements: "None",
      address: "456 Main Street",
    };

    // Register the customer first
    await request(app).post("/api/customer-auth/register").send(customer);

    // Try logging in
    const res = await request(app)
      .post("/api/customer-auth/login")
      .send({ email: "alice@example.com", password: "secure123" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/welcome|logged in/i);
  });
});
