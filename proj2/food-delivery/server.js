// -----------------------------------------------
// server.js (DROP-IN FIXED VERSION)
// -----------------------------------------------

import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import morgan from 'morgan';
import fs from "fs";
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import session from 'express-session';
import MongoStore from "connect-mongo";

// Load environment variables FIRST (critical)
dotenv.config();

// -----------------------------------------------
// Basic Setup
// -----------------------------------------------
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isTestEnv = process.env.NODE_ENV === "test";
const MONGODB_URI = process.env.MONGODB_URI;
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const PORT = process.env.PORT || 3000;

// Fail fast if no DB URI (except tests)
if (!MONGODB_URI && !isTestEnv) {
  console.error("ERROR: MONGODB_URI is missing in your .env file");
  process.exit(1);
}

// -----------------------------------------------
// Middleware
// -----------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:4000"],
    credentials: true,
  })
);

// -----------------------------------------------
// Sessions (connect-mongo fix applied)
// -----------------------------------------------
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: isTestEnv
      ? undefined // Memory store only during automated tests
      : MongoStore.create({
          mongoUrl: MONGODB_URI,
          collectionName: "sessions",
        }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 2, // 2 hours
    },
  })
);

// -----------------------------------------------
// Logging + Static + Uploads
// -----------------------------------------------
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "public")));

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

// -----------------------------------------------
// MongoDB Connection (single connect, reused everywhere)
// -----------------------------------------------
mongoose.set("strictQuery", true);

if (!isTestEnv) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => {
      console.error("MongoDB connection error:", err.message);
      process.exit(1);
    });
}

// -----------------------------------------------
// Routers
// -----------------------------------------------
import restaurantAuthRouter from './routes/restaurantAuth.js';
import driverRoutes from "./routes/driverRoutes.js";
import restaurantRouter from './routes/restaurants.js';
import menuRouter from './routes/menu.js';
import cartRouter from './routes/cart.js';
import orderRouter from './routes/orders.js';
import customerAuthRouter from './routes/customerAuth.js';
import restaurantDashboardRouter from './routes/restaurantDashboard.js';
import driverDashboardRoutes from './routes/driverDashboard.js';
import paymentRouter from './routes/payments.js';
import challengeRoutes from "./routes/challenges.js";
import couponsRouter from "./routes/coupons.js";
import chessChallengeRoutes from "./routes/chessChallenges.js";

// API routes
app.use('/api/restaurants', restaurantRouter);
app.use('/api/menu', menuRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);

app.use('/api/restaurant-auth', restaurantAuthRouter);
app.use("/api/driver", driverRoutes);
app.use('/api/customer-auth', customerAuthRouter);
app.use('/api/restaurant-dashboard', restaurantDashboardRouter);

app.use('/api/driver', driverDashboardRoutes);
app.use('/api/payments', paymentRouter);
app.use("/api/challenges", challengeRoutes);
app.use("/api/coupons", couponsRouter);   // existing coding challenge
app.use("/api/chess-challenge", chessChallengeRoutes); // NEW chess challenge

console.log("/api/orders route registered");

// -----------------------------------------------
// 404 handler
// -----------------------------------------------
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// -----------------------------------------------
// SPA fallback (optional)
// -----------------------------------------------
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// -----------------------------------------------
// Start Server
// -----------------------------------------------
const shouldListen =
  process.env.NODE_ENV !== "test" || process.env.PLAYWRIGHT === "1";

if (shouldListen) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

export default app;
