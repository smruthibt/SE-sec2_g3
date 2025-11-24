import mongoose from 'mongoose';
const customerAuthSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  favoriteDishes: { type: [String], default: [] },
  dietRequirements: { type: String },
  address: { type: String, required: true },
  coordinates: { type: [Number], required: true },
}, { timestamps: true });
export default mongoose.model('CustomerAuth', customerAuthSchema);