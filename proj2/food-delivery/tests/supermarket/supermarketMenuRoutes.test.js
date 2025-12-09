import mongoose from "mongoose";
import Supermarket from "../../models/Supermarket.js";
import SupermarketItem from "../../models/SupermarketItem.js";
import {
  setupTestDB,
  closeTestDB,
  newAgent,
} from "../helpers/testUtils.js";

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

async function createSupermarket(overrides = {}) {
  return Supermarket.create({
    name: overrides.name || "Filter Market",
    address: overrides.address || "10 Market Street",
    ownerEmail: overrides.ownerEmail || `owner_${Date.now()}@test.com`,
    passwordHash: overrides.passwordHash || "hashedpw",
    description: overrides.description || "",
  });
}

test("GET /api/supermarket-menu filters by supermarket, category, search, and availability", async () => {
  const market = await createSupermarket({ name: "Filter Target" });
  const otherMarket = await createSupermarket({ name: "Other Store" });

  await SupermarketItem.create([
    {
      supermarketId: market._id,
      name: "Zucchini",
      category: "Produce",
      price: 2.1,
      isAvailable: true,
    },
    {
      supermarketId: market._id,
      name: "Apple",
      category: "Produce",
      price: 1.2,
      isAvailable: true,
    },
    {
      supermarketId: market._id,
      name: "Canned Beans",
      category: "Pantry",
      price: 3.5,
      isAvailable: true,
    },
    {
      supermarketId: market._id,
      name: "Hidden Soda",
      category: "Produce",
      price: 2.0,
      isAvailable: false,
    },
    {
      supermarketId: otherMarket._id,
      name: "Other Shop Item",
      category: "Produce",
      price: 5.0,
      isAvailable: true,
    },
  ]);

  const categoryRes = await agent
    .get(
      `/api/supermarket-menu?supermarketId=${market._id.toString()}&category=Produce`
    )
    .expect(200);

  const categoryNames = categoryRes.body.map((i) => i.name);
  expect(categoryNames).toEqual(["Apple", "Zucchini"]); // sorted by name and only available items for this supermarket

  const searchRes = await agent
    .get(
      `/api/supermarket-menu?supermarketId=${market._id.toString()}&q=bean`
    )
    .expect(200);

  const searchNames = searchRes.body.map((i) => i.name);
  expect(searchNames).toEqual(["Canned Beans"]); // matches q filter (case-insensitive) and ignores other supermarkets
});

test("POST /api/supermarket-menu enforces required fields", async () => {
  const res = await agent.post("/api/supermarket-menu").send({
    name: "Incomplete Item",
  });

  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/required/i);
});

test("POST /api/supermarket-menu applies default values on creation", async () => {
  const market = await createSupermarket({ name: "Defaults Market" });

  const res = await agent
    .post("/api/supermarket-menu")
    .send({
      supermarketId: market._id.toString(),
      name: "Defaulted Item",
      price: 4.25,
    })
    .expect(201);

  expect(res.body.item.name).toBe("Defaulted Item");
  expect(res.body.item.supermarketId).toBeDefined();

  const saved = await SupermarketItem.findById(res.body.item._id).lean();
  expect(saved).toBeTruthy();
  expect(saved.description).toBe(""); // schema default
  expect(saved.isAvailable).toBe(true); // schema default
  expect(saved.unit).toBe("unit"); // schema default
  expect(saved.stockQuantity).toBe(0); // schema default
});
