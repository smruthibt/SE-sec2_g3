import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import session from 'express-session';
import restaurantAuthRouter from './routes/restaurantAuth.js';
import driverRoutes from "./routes/driverRoutes.js";
import restaurantRouter from './routes/restaurants.js';
import menuRouter from './routes/menu.js';
import cartRouter from './routes/cart.js';
import orderRouter from './routes/orders.js';
import customerAuthRouter from './routes/customerAuth.js';
import restaurantDashboardRouter from './routes/restaurantDashboard.js';
import driverDashboardRoutes from './routes/driverDashboard.js';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food_delivery_app';
const PORT = process.env.PORT || 3000;

mongoose.set('strictQuery', true);
if (process.env.NODE_ENV !== 'test') {
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
}

// Simple demo user middleware (no auth): attaches a demo userId
// app.use((req, res, next) => {
//   // In production you'd implement real auth. For this demo we fix a userId string.
//   req.userId = 'demo-user-1';
//   next();
// });

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 2
  }
}));


// API routes
app.use('/api/restaurants', restaurantRouter);
app.use('/api/menu', menuRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);
console.log("✅ /api/orders route registered");
app.use('/api/restaurant-auth', restaurantAuthRouter);
app.use('/api/restaurant-auth', restaurantAuthRouter);
app.use("/driver", driverRoutes);
app.use('/api/customer-auth', customerAuthRouter);
app.use('/api/restaurant-dashboard', restaurantDashboardRouter);

app.use('/driver', driverDashboardRoutes);


// 404 handler for API
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Fallback for SPA-style links (optional)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
if (process.env.NODE_ENV !== 'test'){
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

export default app;