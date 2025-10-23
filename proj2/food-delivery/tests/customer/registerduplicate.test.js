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

describe("POST /api/customer-auth/register (duplicate)", () => {
  it("should return 409 if the email is already registered", async () => {
    const customer = {
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
      favoriteDishes: ["Pizza", "Burger"],
      dietRequirements: "None",
      address: "123 Street",
    };

    //Register once
    await request(app).post("/api/customer-auth/register").send(customer);

    //Try registering again with the same email
    const res = await request(app)
      .post("/api/customer-auth/register")
      .send(customer);

    console.log("Response body:",res.body);

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });
});
