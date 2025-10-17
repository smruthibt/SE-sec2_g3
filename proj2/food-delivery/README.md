# Food Delivery App (HTML + Bootstrap + MongoDB)

Minimal food delivery prototype:
- Frontend: **HTML + Bootstrap** (static files in `/public`).
- Backend: **Node.js/Express**.
- Database: **MongoDB** (with Mongoose).

## Features
- Browse restaurants
- View menu items per restaurant
- Add items to cart
- Update/remove items in cart
- Checkout to create an order
- View past orders

> Authentication is skipped for simplicity. A fixed demo user (`demo-user-1`) is used.

## Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [MongoDB](https://www.mongodb.com/try/download/community) (local) or MongoDB Atlas URI

## Setup (VS Code or terminal)
1. **Unzip** the project.
2. Open the folder in **VS Code**.
3. Copy `.env.sample` to `.env` and set `MONGODB_URI` if needed. Defaults to `mongodb://127.0.0.1:27017/food_delivery_app`.
4. Install dependencies:
   ```bash
   npm install
   ```
5. Seed sample data:
   ```bash
   npm run seed
   ```
6. Start the server:
   ```bash
   npm run dev
   ```
7. Visit: http://localhost:3000

## Project Structure
```
.
├── models/          # Mongoose models
├── public/          # Static HTML + Bootstrap frontend
│   ├── index.html
│   ├── restaurant.html
│   ├── cart.html
│   ├── orders.html
│   └── js/app.js
├── routes/          # Express API endpoints
├── seed/            # Seed script
├── server.js        # Express server
├── package.json
├── .env.sample
└── README.md
```

## Notes
- Ensure MongoDB is running locally for the default URI.
- The frontend uses the same origin as the backend, so no extra config is needed.
- Images use placeholders/Unsplash links.
