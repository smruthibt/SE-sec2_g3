import request from "supertest";
import mongoose from "mongoose";
import app from "../../server.js";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  //Register the restaurant first
  await request(app)
    .post("/api/restaurant-auth/register")
    .send({
      name: "Taste House",
      email: "tastehouse@example.com",
      password: "flavor123",
      cuisine: "Italian",
    });
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
describe("Restaurant Login Success", () => {
  it("should log in successfully with valid credentials", async () => {
    const res = await request(app)
      .post("/api/restaurant-auth/login")
      .send({ email: "tastehouse@example.com", password: "flavor123" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/welcome|logged in/i);
  });
});
