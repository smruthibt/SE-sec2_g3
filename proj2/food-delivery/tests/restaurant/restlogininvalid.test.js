import request from "supertest";
import mongoose from "mongoose";
import app from "../../server.js";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await request(app)
    .post("/api/restaurant-auth/register")
    .send({
      name: "InvalidLogin",
      email: "invalid@example.com",
      password: "validpass",
      cuisine: "Mexican",
    });
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
describe("Restaurant Login Invalid", () => {
  it("should return 401 for wrong password", async () => {
    const res = await request(app)
      .post("/api/restaurant-auth/login")
      .send({ email: "invalid@example.com", password: "wrongpass" });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatch(/invalid|incorrect/i);
  });
});
