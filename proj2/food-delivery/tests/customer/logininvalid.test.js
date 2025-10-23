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

describe("POST /api/customer-auth/login (invalid credentials)", () => {
  it("should return 401 for invalid password", async () => {
    const customer = {
      name: "Bob Brown",
      email: "bob@example.com",
      password: "correct123",
      favoriteDishes: ["Tacos", "Sandwich"],
      dietRequirements: "Vegan",
      address: "789 Elm Avenue",
    };

    // Register the user
    await request(app).post("/api/customer-auth/register").send(customer);

    // Try to login with wrong password
    const res = await request(app)
      .post("/api/customer-auth/login")
      .send({ email: "bob@example.com", password: "wrongpass" });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatch(/invalid|incorrect/i);
  });
});
