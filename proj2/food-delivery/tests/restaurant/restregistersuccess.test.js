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
describe("Restaurant Registration", () => {
  it("should register a restaurant successfully", async () => {
    const restaurant = {
      name: "Tandoori Nights",
      email: "tandoori@example.com",
      password: "spicy123",
      cuisine: "Indian",
    };
    const res = await request(app)
      .post("/api/restaurant-auth/register")
      .send(restaurant);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/registered|created|welcome|successful/i);
  });
});
