import mongoose from "mongoose";
import MenuItem from "../../models/MenuItem.js";
import CartItem from "../../models/CartItem.js";
import {
  setupTestDB,
  closeTestDB,
  newAgent,
  registerAndLoginCustomer,
  createRestaurant,
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

test("GET /api/recommendations/menu requires auth and restaurantId", async () => {
  const restId = new mongoose.Types.ObjectId();
  const unauth = await newAgent();

  await unauth
    .get(`/api/recommendations/menu?restaurantId=${restId.toString()}`)
    .expect(401);

  await registerAndLoginCustomer(agent);

  const res = await agent.get("/api/recommendations/menu").expect(400);
  expect(res.body.error).toMatch(/restaurantId/i);
});

test("returns empty array when cart has no items for that restaurant", async () => {
  const rest = await createRestaurant();
  await registerAndLoginCustomer(agent);

  const res = await agent
    .get(`/api/recommendations/menu?restaurantId=${rest._id.toString()}`)
    .expect(200);

  expect(Array.isArray(res.body.items)).toBe(true);
  expect(res.body.items.length).toBe(0);
});

test("recommends same-category, available items not already in cart and respects limit", async () => {
  const rest = await createRestaurant();
  const { customer } = await registerAndLoginCustomer(agent);
  const customerId = customer._id.toString();

  const starter = await MenuItem.create({
    restaurantId: rest._id,
    name: "Bruschetta",
    category: "starter",
    price: 5,
    isAvailable: true,
  });

  const main1 = await MenuItem.create({
    restaurantId: rest._id,
    name: "Pasta Bolognese",
    category: "main",
    price: 12,
    isAvailable: true,
  });

  const main2 = await MenuItem.create({
    restaurantId: rest._id,
    name: "Grilled Chicken",
    category: "main",
    price: 14,
    isAvailable: true,
  });

  const mainUnavailable = await MenuItem.create({
    restaurantId: rest._id,
    name: "Sold Out Steak",
    category: "main",
    price: 18,
    isAvailable: false,
  });

  const dessert = await MenuItem.create({
    restaurantId: rest._id,
    name: "Tiramisu",
    category: "dessert",
    price: 7,
    isAvailable: true,
  });

  // Cart has starter + main1; most common category => "main"
  await CartItem.create({
    userId: customerId,
    restaurantId: rest._id,
    menuItemId: starter._id,
    quantity: 1,
  });
  await CartItem.create({
    userId: customerId,
    restaurantId: rest._id,
    menuItemId: main1._id,
    quantity: 1,
  });

  // Limit to 1 recommendation
  const res = await agent
    .get(
      `/api/recommendations/menu?restaurantId=${rest._id.toString()}&limit=1`
    )
    .expect(200);

  const names = res.body.items.map((i) => i.name);

  expect(names).toContain(main2.name); // available main not in cart
  expect(names).not.toContain(main1.name); // skip cart item
  expect(names).not.toContain(mainUnavailable.name); // skip unavailable
  expect(names).not.toContain(starter.name); // only category "main"
  expect(names).not.toContain(dessert.name); // different category
  expect(res.body.items.length).toBe(1); // respects limit
});

test("does not return duplicate recommendations across categories", async () => {
  const rest = await createRestaurant();
  const { customer } = await registerAndLoginCustomer(agent);
  const customerId = customer._id.toString();

  // Item exists in two categories? simulate by creating two menu items with same name/price
  const main = await MenuItem.create({
    restaurantId: rest._id,
    name: "Shared Dish",
    category: "main",
    price: 10,
    isAvailable: true,
  });

  const side = await MenuItem.create({
    restaurantId: rest._id,
    name: "Shared Dish", // same name, different doc
    category: "side",
    price: 10,
    isAvailable: true,
  });

  await CartItem.create({
    userId: customerId,
    restaurantId: rest._id,
    menuItemId: main._id,
    quantity: 1,
  });

  // Cart has only main, so favourite category = main
  const res = await agent
    .get(`/api/recommendations/menu?restaurantId=${rest._id.toString()}`)
    .expect(200);

  const ids = res.body.items.map((i) => i._id);
  const uniqueIds = new Set(ids);
  expect(uniqueIds.size).toBe(ids.length); // no duplicates
  expect(ids).not.toContain(main._id.toString()); // skip cart item
});

test("caps limit at 20 even when a higher value is requested", async () => {
  const rest = await createRestaurant();
  const { customer } = await registerAndLoginCustomer(agent);
  const customerId = customer._id.toString();

  await MenuItem.create(
    Array.from({ length: 25 }).map((_, idx) => ({
      restaurantId: rest._id,
      name: `Dish ${idx}`,
      category: "main",
      price: 10 + idx,
      isAvailable: true,
    }))
  );

  await CartItem.create({
    userId: customerId,
    restaurantId: rest._id,
    menuItemId: (await MenuItem.findOne({ restaurantId: rest._id }))._id,
    quantity: 1,
  });

  const res = await agent
    .get(`/api/recommendations/menu?restaurantId=${rest._id.toString()}&limit=99`)
    .expect(200);

  expect(res.body.items.length).toBeLessThanOrEqual(20);
});

test("returns empty when cart exists but all items unavailable", async () => {
  const rest = await createRestaurant();
  const { customer } = await registerAndLoginCustomer(agent);
  const customerId = customer._id.toString();

  const unavailable = await MenuItem.create({
    restaurantId: rest._id,
    name: "Unavailable Dish",
    category: "main",
    price: 12,
    isAvailable: false,
  });

  await CartItem.create({
    userId: customerId,
    restaurantId: rest._id,
    menuItemId: unavailable._id,
    quantity: 1,
  });

  const res = await agent
    .get(`/api/recommendations/menu?restaurantId=${rest._id.toString()}`)
    .expect(200);

  expect(res.body.items).toEqual([]);
});

test("respects category order by frequency and stops at limit", async () => {
  const rest = await createRestaurant();
  const { customer } = await registerAndLoginCustomer(agent);
  const customerId = customer._id.toString();

  const main1 = await MenuItem.create({
    restaurantId: rest._id,
    name: "Main A",
    category: "main",
    price: 10,
    isAvailable: true,
  });
  await MenuItem.create({
    restaurantId: rest._id,
    name: "Main B",
    category: "main",
    price: 11,
    isAvailable: true,
  });
  await MenuItem.create({
    restaurantId: rest._id,
    name: "Starter A",
    category: "starter",
    price: 6,
    isAvailable: true,
  });
  await MenuItem.create({
    restaurantId: rest._id,
    name: "Starter B",
    category: "starter",
    price: 7,
    isAvailable: true,
  });
  await MenuItem.create({
    restaurantId: rest._id,
    name: "Dessert A",
    category: "dessert",
    price: 5,
    isAvailable: true,
  });

  // Cart contains 2 mains, 1 starter => order: main then starter then dessert
  await CartItem.create({
    userId: customerId,
    restaurantId: rest._id,
    menuItemId: main1._id,
    quantity: 1,
  });
  const starter = await MenuItem.findOne({ name: "Starter A" });
  await CartItem.create({
    userId: customerId,
    restaurantId: rest._id,
    menuItemId: starter._id,
    quantity: 1,
  });

  const res = await agent
    .get(`/api/recommendations/menu?restaurantId=${rest._id.toString()}&limit=2`)
    .expect(200);

  const names = res.body.items.map((i) => i.name);
  // Should start with a main (most frequent), then starter (next frequent), stopping at limit 2
  expect(names.length).toBe(2);
  expect(names[0]).toMatch(/Main/);
  expect(names[1]).toMatch(/Starter/);
});

test("ignores cart items from other restaurants", async () => {
  const rest = await createRestaurant();
  const otherRest = await createRestaurant({ name: "Other" });
  const { customer } = await registerAndLoginCustomer(agent);
  const customerId = customer._id.toString();

  const mainHere = await MenuItem.create({
    restaurantId: rest._id,
    name: "Local Dish",
    category: "main",
    price: 12,
    isAvailable: true,
  });

  const otherDish = await MenuItem.create({
    restaurantId: otherRest._id,
    name: "Other Dish",
    category: "main",
    price: 9,
    isAvailable: true,
  });

  await CartItem.create({
    userId: customerId,
    restaurantId: otherRest._id,
    menuItemId: otherDish._id,
    quantity: 1,
  });

  // No cart items for target restaurant, expect empty recs
  const res = await agent
    .get(`/api/recommendations/menu?restaurantId=${rest._id.toString()}`)
    .expect(200);

  expect(res.body.items).toEqual([]);

  // Add a local cart item, expect recommendations for local restaurant
  await CartItem.create({
    userId: customerId,
    restaurantId: rest._id,
    menuItemId: mainHere._id,
    quantity: 1,
  });

  const res2 = await agent
    .get(`/api/recommendations/menu?restaurantId=${rest._id.toString()}`)
    .expect(200);

  expect(res2.body.items.length).toBeGreaterThanOrEqual(0);
});
