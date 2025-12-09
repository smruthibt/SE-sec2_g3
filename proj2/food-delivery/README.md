
## 🍽️ BiteCode – Food Delivery Module

The **Food Delivery** module of **BiteCode** is a Node.js + MongoDB web app that powers the “order” side of the BiteCode platform.
Customers can discover restaurants and supermarkets, browse menus, place orders, play coding/chess challenges while waiting, and pay using a mock checkout flow.
Drivers, restaurants, and supermarkets each get their own dashboard for managing orders, inventory, and delivery workflows.

This module integrates tightly with the separate **Judge0 frontend**, which runs coding challenges and returns results that are converted into discount coupons and applied to future orders.

---

## 🔥 Project 3 Features

### 1️⃣ ML Collaborative Filtering–Based Food Recommendation

We added a **recommendation service** that personalizes dish suggestions for each customer:

* Learns from historical **order data** and **item co-occurrence** across users.
* Uses a **collaborative filtering** approach – customers who ordered similar items help inform each other’s recommendations.
* For a given restaurant, the system boosts:

  * Items frequently co-ordered with what the current user has liked.
  * Globally popular items within that restaurant.
* Recommendations are surfaced on:

  * Restaurant detail page (recommended section).
  * Menu page sidecar (“You may also like…”) for logged-in customers.

Implementation highlights:

* Reuses existing `Order` and `MenuItem`/`Restaurant` data.
* Exposed via a dedicated recommendations API (see below).
* Designed to be stateless so it can be scaled independently later.

---

### 2️⃣ Google Maps Integration for Order Tracking

We extended the platform with **real-time route visualization** using the Google Maps JavaScript API:

* Each **Customer**, **Restaurant**, and **Supermarket** now stores geospatial coordinates `[lng, lat]` in MongoDB.
* When a customer opens **Track Order**, the system:

  * Loads the order via `/api/orders/:orderId`.
  * Derives pickup coordinates from either `restaurantDetails.coordinates` or `supermarketDetails.coordinates`.
  * Derives drop-off coordinates from `customerDetails.coordinates`.
* The frontend draws:

  * A polyline from pickup → drop-off.
  * Markers for origin, destination, and (optionally) the driver.
* As the driver updates status, the UI can poll driver endpoints and update the map to reflect progress.

This gives a modern “live tracking” experience for both restaurant and supermarket orders.

---

### 3️⃣ Supermarket Dashboard Integration

Beyond restaurants, the system now supports **supermarkets** end-to-end:

* Supermarkets can **register, log in, and manage their own catalog**.
* Each supermarket has:

  * Display name, description, image, address.
  * `[lng, lat]` coordinates for map-based routing.
* Supermarket dashboard capabilities:

  * Add / edit / delete grocery items and categories.
  * Control item availability.
  * View and update the status of incoming supermarket orders.
* Customer side:

  * Supermarkets show up on the home page along with restaurants.
  * There is a dedicated **supermarket detail page** and **menu** view.
  * Orders placed through a supermarket follow the same lifecycle and can be tracked on Google Maps.

This effectively turns BiteCode into a unified **food + grocery** delivery platform.

---

### 4️⃣ Chess Puzzles Integration (Gamified Waiting)

To complement coding challenges, we integrated **chess puzzles** as an alternative gamified experience:

* When an order is placed, the customer can opt into solving a chess puzzle.
* Puzzles are tagged by difficulty: **Easy**, **Medium**, **Hard**.
* The backend validates whether the user played the correct sequence of moves for the puzzle.
* Successful completion yields a **coupon**, with discount magnitude tied to puzzle difficulty:

  * Easy → small discount
  * Medium → moderate discount
  * Hard → maximum discount
* Earned coupons are persisted and applied at checkout just like coding-challenge rewards.

Chess puzzles share the same high-level reward pipeline as coding challenges but via a separate, chess-specific API.

---

## 🧱 Directory Structure (Food Delivery Module)

```text
food-delivery/
├── server.js                     # Express app entrypoint (multi-session: customer/driver/restaurant/supermarket)
├── .env.example                  # Example environment config
├── package.json
│
├── models/                       # Mongoose schemas
│   ├── CustomerAuth.js           # Customers (with coordinates)
│   ├── Restaurant.js             # Restaurants (with coordinates + menu linkage)
│   ├── Supermarket.js            # Supermarkets (with coordinates)  ← proj3
│   ├── MenuItem.js               # Menu items for restaurants
│   ├── SupermarketItem.js        # (if present) Grocery items       ← proj3
│   ├── Order.js                  # Orders (restaurant or supermarket)
│   ├── Coupon.js                 # Coupons earned from games
│   └── ChallengeSession.js       # Coding / chess challenge sessions
│
├── routes/                       # Express route handlers
│   ├── customerAuth.js           # Customer registration & login
│   ├── restaurantAuth.js         # Restaurant auth
│   ├── supermarkets.js           # List/get supermarkets            ← proj3
│   ├── supermarketMenu.js        # Supermarket items API            ← proj3
│   ├── SupermarketAuth.js        # Supermarket auth                 ← proj3
│   ├── supermarket-dashboard.js  # Supermarket dashboard endpoints  ← proj3
│   ├── restaurants.js            # Restaurants list/details
│   ├── menu.js                   # Restaurant menu APIs
│   ├── cart.js                   # Cart operations (customerId via session)
│   ├── orders.js                 # Order creation + /:orderId map data
│   ├── payments.js               # Mock payment flow
│   ├── driverRoutes.js           # Driver auth & core APIs
│   ├── driverDashboard.js        # Driver dashboard APIs
│   ├── challenges.js             # Coding challenge API (Judge0 integration)
│   ├── chessChallenges.js        # Chess puzzle challenge API       ← proj3
│   ├── coupons.js                # Coupon issuance & redemption
│   └── recommendations.js        # Collaborative filtering service  ← proj3
│
├── public/                       # Static HTML/CSS/JS frontend
│   ├── index.html                # Landing page (restaurants + supermarkets)
│   ├── restaurant.html           # Restaurant detail + menu
│   ├── supermarket.html          # Supermarket detail + grocery menu ← proj3
│   ├── customer-login.html
│   ├── restaurant-dashboard.html
│   ├── supermarket-login.html    ← proj3
│   ├── supermarket-dashboard.html← proj3
│   ├── driver-login.html
│   ├── driver-dashboard.html
│   ├── track-order.html          # Google Maps order tracking       ← proj3
│   ├── assets/                   # Logos, icons, images
│   └── js/                       # Page-specific JS (cart, maps, recommendations, chess UI)
│
├── uploads/                      # Uploaded images for restaurants/supermarkets/items
│
└── tests/                        # API & E2E tests (if configured)
    └── playwright.config.js
```

Files marked **← proj3** are newly added or significantly extended for the four project-3 features.

---

## 📡 Key APIs Added / Updated for Project 3

### 🧠 1. Recommendation Service (Collaborative Filtering)

**Main router:** `routes/recommendations.js`
**Base path:** `/api/recommendations`

| Method | Path                          | Description                                                                            | Auth     |
| ------ | ----------------------------- | -------------------------------------------------------------------------------------- | -------- |
| GET    | `/api/recommendations/menu`   | Returns recommended menu items for the **current customer** and selected restaurant.   | Customer |
| GET    | `/api/recommendations/global` | Optional: returns trending/popular dishes across all restaurants for the landing page. | Public   |

Typical usage from the frontend:

* Called when a **restaurant page** or **menu** page is loaded.
* Uses `req.session.customerId` to personalise results.

---

### 🗺️ 2. Google Maps Order Tracking

**Updated router:** `routes/orders.js`
**Key endpoint:**

| Method | Path              | Description                                                                                                                    | Used by          |
| ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| GET    | `/api/orders/:id` | Returns a **hydrated order**: order document + `customerDetails` + `restaurantDetails` **or** `supermarketDetails` with coords | Track-order page |

Response shape (simplified):

```json
{
  "_id": "...",
  "status": "out_for_delivery",
  "customerDetails": {
    "coordinates": [lng, lat],
    "address": "..."
  },
  "restaurantDetails": {
    "coordinates": [lng, lat],
    "name": "Los Lobos"
  },
  "supermarketDetails": null
}
```

For supermarket orders, `restaurantDetails` is `null` and `supermarketDetails` is populated instead.
`public/track-order.html` then uses these coordinates with the Google Maps JS API to:

* Draw the route.
* Place markers.
* Optionally animate driver progress using driver APIs:

From `driverRoutes.js` / `driverDashboard.js` (already existed but now used by maps):

| Method | Path                         | Description                            |
| ------ | ---------------------------- | -------------------------------------- |
| GET    | `/api/driver/status`         | Returns driver’s current status.       |
| PATCH  | `/api/driver/active`         | Mark driver online/offline.            |
| GET    | `/api/driver/orders/new`     | Get new orders available for pickup.   |
| GET    | `/api/driver/orders/pending` | Get currently assigned, active orders. |

---

### 🛒 3. Supermarket Dashboard & APIs

**Routers:**

* `routes/supermarkets.js`
* `routes/supermarketMenu.js`
* `routes/SupermarketAuth.js`
* `routes/supermarket-dashboard.js`

**Customer-facing APIs**

| Method | Path                                       | Description                                |
| ------ | ------------------------------------------ | ------------------------------------------ |
| GET    | `/api/supermarkets`                        | List all supermarkets for landing page.    |
| GET    | `/api/supermarkets/:id`                    | Get supermarket details by id.             |
| GET    | `/api/supermarket-menu?supermarketId=<id>` | Get grocery items for a given supermarket. |

**Authentication**

| Method | Path                             | Description                         |
| ------ | -------------------------------- | ----------------------------------- |
| POST   | `/api/supermarket-auth/register` | Register a new supermarket (owner). |
| POST   | `/api/supermarket-auth/login`    | Log in a supermarket owner/admin.   |
| POST   | `/api/supermarket-auth/logout`   | End supermarket session.            |

**Dashboard**

| Method | Path                                   | Description                                          |
| ------ | -------------------------------------- | ---------------------------------------------------- |
| GET    | `/api/supermarket-dashboard/data`      | Fetch supermarket profile, items, and open orders.   |
| POST   | `/api/supermarket-dashboard/items`     | Create a new grocery item.                           |
| PATCH  | `/api/supermarket-dashboard/items/:id` | Update an existing item (price, availability, etc.). |
| DELETE | `/api/supermarket-dashboard/items/:id` | Delete an item.                                      |

All supermarket dashboard routes rely on `req.session.supermarketId` (set by `SupermarketAuth`) thanks to the dedicated `supermarket.sid` session cookie.

---

### ♟️ 4. Chess Puzzle APIs

**Router:** `routes/chessChallenges.js`
**Base path:** `/api/chess-challenge`

Typical endpoints:

| Method | Path                                    | Description                                                       |
| ------ | --------------------------------------- | ----------------------------------------------------------------- |
| GET    | `/api/chess-challenge/next?difficulty=` | Returns the next chess puzzle for the given difficulty.           |
| POST   | `/api/chess-challenge/complete`         | Submits the user’s solution; validates moves and issues a coupon. |

* Uses `req.session.customerId` to associate puzzle attempts and coupons with a specific user.
* Integrated into the **order flow** so that solving a puzzle during/after an order creates a coupon that is:

  * Stored via `routes/coupons.js`.
  * Applied at checkout when the user places their next order.

Frontend integration lives in the JS for:

* `track-order.html` or a dedicated **“Play Chess”** popup.
* Coupon banner and cart calculation logic.


This should give you a clear “what changed for proj3” story:
high-level explanation ➝ where the code lives ➝ which APIs were introduced/extended for each of the four new features.
