import mongoose from 'mongoose';

const supermarketSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },

  imageUrl: { type: String },
  rating: { type: Number, default: 4.5 },

  deliveryFee: { type: Number, default: 0 },
  etaMins: { type: Number, default: 30 },

  address: { type: String, required: true },

  // Optional tags or categories to filter
  tags: [{ type: String }]
}, { timestamps: true });

export default mongoose.model('Supermarket', supermarketSchema);