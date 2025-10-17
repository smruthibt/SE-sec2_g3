import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: String,
  price: Number,
  quantity: Number
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  items: [orderItemSchema],
  subtotal: Number,
  deliveryFee: Number,
  total: Number,
  status: { type: String, enum: ['placed', 'preparing', 'out_for_delivery', 'delivered'], default: 'placed' }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
