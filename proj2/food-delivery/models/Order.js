import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: String,
  price: Number,
  quantity: Number
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerAuth', required: true, index: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  items: [orderItemSchema],
  discount:{ type: Number, default:0 },
  appliedCode: { type: String, default:null },
  subtotal: Number,
  deliveryFee: Number,
  deliveryLocation: String,
  deliveryPayment: Number,
  total: Number,
  deliveredAt: {type: Date},
  status: {
    type: String,
    enum: ['placed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered'],
    default: 'placed'
  },
  // separate payment tracking
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  
  challengeStatus: {
    type: String,
  enum: [
    "NOT_STARTED", "COMPLETED", "FAILED",
    "not_started", "completed", "failed"
  ],    default: "NOT_STARTED"
  },
  appliedCode: { type: String, default: null },

}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
