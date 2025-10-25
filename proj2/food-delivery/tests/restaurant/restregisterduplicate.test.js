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
describe("Restaurant Duplicate Registration", () => {
  it("should return 409 if restaurant already exists", async () => {
    const restaurant = {
      name: "DuplicateDine",
      email: "duplicate@example.com",
      password: "test123",
      cuisine: "Fusion",
    };
    await request(app).post("/api/restaurant-auth/register").send(restaurant);
    const res = await request(app)
      .post("/api/restaurant-auth/register")
      .send(restaurant);
    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatch(/already registered|exists/i);
  });
});
