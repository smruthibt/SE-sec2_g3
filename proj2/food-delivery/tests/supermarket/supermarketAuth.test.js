import mongoose from "mongoose";
import {
  setupTestDB,
  closeTestDB,
  newAgent,
} from "../helpers/testUtils.js";
import Supermarket from "../../models/Supermarket.js";

let agent;

beforeAll(async () => {
  await setupTestDB();
  agent = await newAgent();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
  }
});

const basePayload = {
  name: "Test Market",
  email: "owner@test.com",
  password: "superSecret123",
  address: "10 Market St",
};

test("register requires name, email, password, and address", async () => {
  const res = await agent
    .post("/api/supermarket-auth/register")
    .send({ name: "Partial" })
    .expect(400);

  expect(res.body.error).toMatch(/required/i);
});

test("duplicate ownerEmail returns 409", async () => {
  await agent
    .post("/api/supermarket-auth/register")
    .send(basePayload)
    .expect(201);

  const res = await agent
    .post("/api/supermarket-auth/register")
    .send(basePayload)
    .expect(409);

  expect(res.body.error).toMatch(/already/i);
});

test("login with wrong password fails", async () => {
  await agent
    .post("/api/supermarket-auth/register")
    .send(basePayload)
    .expect(201);

  const res = await agent
    .post("/api/supermarket-auth/login")
    .send({ email: basePayload.email, password: "badpass" })
    .expect(401);

  expect(res.body.error).toMatch(/invalid/i);
});

test("session check requires login", async () => {
  const unauth = await newAgent();
  await unauth.get("/api/supermarket-auth/me").expect(401);
});

test("successful login populates session", async () => {
  const { email, password } = basePayload;
  await agent
    .post("/api/supermarket-auth/register")
    .send(basePayload)
    .expect(201);

  await agent
    .post("/api/supermarket-auth/login")
    .send({ email, password })
    .expect(200);

  const me = await agent.get("/api/supermarket-auth/me").expect(200);
  expect(me.body.ok).toBe(true);
  expect(me.body.supermarketId).toBeDefined();

  const inDb = await Supermarket.findOne({ ownerEmail: email }).lean();
  expect(inDb).toBeTruthy();
});

test("failed login does not set session", async () => {
  const creator = await newAgent();
  await creator
    .post("/api/supermarket-auth/register")
    .send(basePayload)
    .expect(201);

  const loginAgent = await newAgent();

  await loginAgent
    .post("/api/supermarket-auth/login")
    .send({ email: basePayload.email, password: "wrong" })
    .expect(401);

  await loginAgent.get("/api/supermarket-auth/me").expect(401);
});

test("register normalizes email casing for login", async () => {
  await agent
    .post("/api/supermarket-auth/register")
    .send({ ...basePayload, email: "OWNER@TEST.COM" })
    .expect(201);

  const res = await agent
    .post("/api/supermarket-auth/login")
    .send({ email: "owner@test.com", password: basePayload.password })
    .expect(200);

  expect(res.body.ok).toBe(true);
  const me = await agent.get("/api/supermarket-auth/me").expect(200);
  expect(me.body.supermarketId).toBeDefined();
});
