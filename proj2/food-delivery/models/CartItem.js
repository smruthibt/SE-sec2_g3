import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },

  // NEW: what kind of seller this line belongs to
  sourceType: {
    type: String,
    enum: ['restaurant', 'supermarket'],
    default: 'restaurant',
    index: true,
  },

  // Restaurant-based items (existing)
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
  },
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
  },

  // Supermarket-based items (NEW)
  supermarketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supermarket',
  },
  supermarketItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupermarketItem',
  },

  quantity: { type: Number, default: 1, min: 1 },
}, { timestamps: true });

export default mongoose.model('CartItem', cartItemSchema);
