import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';
import User from '../models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food_delivery_app';

const sample = {
  restaurants: [
    {
      name: 'Spice Route Kitchen',
      cuisine: 'Indian',
      imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d',
      rating: 4.7,
      deliveryFee: 2.99,
      etaMins: 35,
      menu: [
        { name: 'Butter Chicken', description: 'Creamy tomato sauce', price: 12.99, imageUrl: 'https://images.unsplash.com/photo-1604908812243-8a3d056e4a24' },
        { name: 'Paneer Tikka', description: 'Grilled cottage cheese', price: 10.49, imageUrl: 'https://images.unsplash.com/photo-1604908553697-8cd0efb2a1f9' },
        { name: 'Garlic Naan', description: 'Fresh baked naan with garlic', price: 3.49 }
      ]
    },
    {
      name: 'Bella Italia',
      cuisine: 'Italian',
      imageUrl: 'https://images.unsplash.com/photo-1541745537413-b804c42ea8c7',
      rating: 4.6,
      deliveryFee: 3.49,
      etaMins: 30,
      menu: [
        { name: 'Margherita Pizza', description: 'Tomato, mozzarella, basil', price: 11.99 },
        { name: 'Pasta Alfredo', description: 'Creamy alfredo sauce', price: 13.49 },
        { name: 'Tiramisu', description: 'Classic dessert', price: 6.99 }
      ]
    },
    {
      name: 'Sushi Zen',
      cuisine: 'Japanese',
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947',
      rating: 4.8,
      deliveryFee: 1.99,
      etaMins: 25,
      menu: [
        { name: 'California Roll', description: 'Crab, avocado, cucumber', price: 8.99 },
        { name: 'Salmon Nigiri', description: 'Fresh salmon over rice', price: 12.49 },
        { name: 'Miso Soup', description: 'Traditional soup', price: 2.99 }
      ]
    }
  ]
};

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB for seeding');

  await Promise.all([Restaurant.deleteMany({}), MenuItem.deleteMany({}), User.deleteMany({})]);

  // Demo user
  await User.create({ _id: 'demo-user-1', name: 'Demo User', email: 'demo@example.com' });

  for (const r of sample.restaurants) {
    const created = await Restaurant.create({
      name: r.name,
      cuisine: r.cuisine,
      imageUrl: r.imageUrl,
      rating: r.rating,
      deliveryFee: r.deliveryFee,
      etaMins: r.etaMins
    });
    for (const m of r.menu) {
      await MenuItem.create({
        restaurantId: created._id,
        name: m.name,
        description: m.description,
        price: m.price,
        imageUrl: m.imageUrl
      });
    }
  }
  console.log('Seed complete.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
