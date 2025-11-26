// models/SupermarketItem.js
import mongoose from 'mongoose';

const supermarketItemSchema = new mongoose.Schema({
  supermarketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supermarket',
    required: true,
    index: true
  },

  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },

  imageUrl: { type: String },

  isAvailable: { type: Boolean, default: true },

  // supermarket-specific extras
  category: { type: String, index: true },   // "Dairy", "Snacks", etc.
  unit: { type: String, default: 'unit' },   // "kg", "L", "pack"
  stockQuantity: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

export default mongoose.model('SupermarketItem', supermarketItemSchema);
