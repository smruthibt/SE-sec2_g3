// -----------------------------------------------------
// server.js  (MULTI-SESSION VERSION WITH CUSTOMER FIXES)
// -----------------------------------------------------

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";

// Load environment variables FIRST
dotenv.config();

// -----------------------------------------------------
// Setup
// -----------------------------------------------------
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isTestEnv = process.env.NODE_ENV === "test";
const MONGODB_URI = process.env.MONGODB_URI;
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const PORT = process.env.PORT || 3000;

if (!MONGODB_URI && !isTestEnv) {
  console.error("❌ ERROR: Missing MONGODB_URI in .env");
  process.exit(1);
}

// -----------------------------------------------------
// Core middleware
// -----------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:4000"],
    credentials: true,
  })
);

// -----------------------------------------------------
// Shared session factory (one per role)
// -----------------------------------------------------
function sessionFor(roleName) {
  const baseConfig = {
    name: `${roleName}.sid`,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 2, // 2 hours
    },
  };

  // In tests, use memory store; otherwise MongoStore
  if (!isTestEnv) {
    return session({
      ...baseConfig,
      store: MongoStore.create({
        mongoUrl: MONGODB_URI,
        collectionName: "sessions",
      }),
    });
  }

  // Test env: default MemoryStore
  return session(baseConfig);
}

// Create reusable middlewares
const customerSession = sessionFor("customer");
const restaurantSession = sessionFor("restaurant");
const driverSession = sessionFor("driver");
const supermarketSession = sessionFor("supermarket");

// -----------------------------------------------------
// Logging + Static + Uploads
// -----------------------------------------------------
if (!isTestEnv) {
  app.use(morgan("dev"));
}

app.use(express.static(path.join(__dirname, "public")));

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// -----------------------------------------------------
// MongoDB Connection
// -----------------------------------------------------
mongoose.set("strictQuery", true);

if (!isTestEnv) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => {
      console.error("❌ MongoDB connection failed:", err.message);
      process.exit(1);
    });
}

// -----------------------------------------------------
// Routers
// -----------------------------------------------------
import restaurantAuthRouter from "./routes/restaurantAuth.js";
import driverRoutes from "./routes/driverRoutes.js";
import restaurantRouter from "./routes/restaurants.js";
import menuRouter from "./routes/menu.js";
import cartRouter from "./routes/cart.js";
import orderRouter from "./routes/orders.js";
import customerAuthRouter from "./routes/customerAuth.js";
import restaurantDashboardRouter from "./routes/restaurantDashboard.js";
import driverDashboardRoutes from "./routes/driverDashboard.js";
import paymentRouter from "./routes/payments.js";
import challengeRoutes from "./routes/challenges.js";
import couponsRouter from "./routes/coupons.js";
import recommendationsRouter from "./routes/recommendations.js";
import chessChallengeRoutes from "./routes/chessChallenges.js";
import supermarketRouter from "./routes/supermarkets.js";
import supermarketMenuRouter from "./routes/supermarketMenu.js";
import supermarketAuthRouter from "./routes/SupermarketAuth.js";
import supermarketdashboard from "./routes/supermarket-dashboard.js";

// -----------------------------------------------------
// Register Routes With SEPARATE SESSIONS
// -----------------------------------------------------

// ---------- CUSTOMER FLOW (needs customerId on session) ----------
app.use("/api/customer-auth", customerSession, customerAuthRouter);

// Customer cart / orders / payment / coupons / recs / games
app.use("/api/cart", customerSession, cartRouter);
app.use("/api/orders", customerSession, orderRouter);
app.use("/api/payments", customerSession, paymentRouter);
app.use("/api/coupons", customerSession, couponsRouter);
app.use("/api/recommendations", customerSession, recommendationsRouter);
app.use("/api/challenges", customerSession, challengeRoutes);
app.use("/api/chess-challenge", customerSession, chessChallengeRoutes);

// ---------- RESTAURANT AUTH + DASHBOARD ----------
app.use("/api/restaurant-auth", restaurantSession, restaurantAuthRouter);
app.use(
  "/api/restaurant-dashboard",
  restaurantSession,
  restaurantDashboardRouter
);

// ---------- DRIVER AUTH + DASHBOARD ----------
app.use("/api/driver", driverSession, driverRoutes);
app.use("/api/driver", driverSession, driverDashboardRoutes);

// ---------- SUPERMARKET AUTH + DASHBOARD ----------
app.use("/api/supermarket-auth", supermarketSession, supermarketAuthRouter);
app.use(
  "/api/supermarket-dashboard",
  supermarketSession,
  supermarketdashboard
);

// ---------- Public / shared data (no session needed) ----------
app.use("/api/restaurants", restaurantRouter);
app.use("/api/menu", menuRouter);
app.use("/api/supermarkets", supermarketRouter);
app.use("/api/supermarket-menu", supermarketMenuRouter);

console.log("✨ Multi-session routing active (customer + driver + restaurant + supermarket)");

// -----------------------------------------------------
// 404 handler (API only)
// -----------------------------------------------------
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// -----------------------------------------------------
// SPA fallback
// -----------------------------------------------------
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// -----------------------------------------------------
// Start Server
// -----------------------------------------------------
const shouldListen =
  process.env.NODE_ENV !== "test" || process.env.PLAYWRIGHT === "1";

if (shouldListen) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

export default app;
