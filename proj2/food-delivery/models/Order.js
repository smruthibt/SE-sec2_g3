import mongoose from 'mongoose';

// Order line items can come from Restaurant MenuItems OR Supermarket Items
// We continue calling it menuItemId to stay backward compatible.
const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId }, // May be MenuItem OR SupermarketItem
  name: String,
  price: Number,
  quantity: Number
}, { _id: false });

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerAuth',
      required: true,
      index: true
    },

    /**
     * restaurantId is really "sellerId"
     * It can be:
     * - Restaurant._id
     * - Supermarket._id
     * We keep the field name to avoid breaking existing UI/tools.
     */
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',  // still works even when id references a supermarket
      required: false
    },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null
    },

    /**
     * NEW FIELDS FOR SUPERMARKET SUPPORT
     */
    sellerType: {
      type: String,
      enum: ['restaurant', 'supermarket'],
      default: 'restaurant'
    },

    // This is the human-readable seller name (restaurant or supermarket)
    restaurantName: {
      type: String
    },

    /**
     * Items array (restaurant or supermarket items)
     */
    items: [orderItemSchema],

    // Pricing
    discount: { type: Number, default: 0 },
    appliedCode: { type: String, default: null },
    subtotal: Number,
    deliveryFee: Number,
    deliveryLocation: String,
    deliveryPayment: Number,
    total: Number,

    deliveredAt: { type: Date },

    status: {
      type: String,
      enum: [
        'placed',
        'preparing',
        'ready_for_pickup',
        'out_for_delivery',
        'delivered'
      ],
      default: 'placed'
    },

    // Payment state
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending'
    },

    // Challenge state
    challengeStatus: {
      type: String,
      enum: [
        'NOT_STARTED', 'COMPLETED', 'FAILED',
        'not_started', 'completed', 'failed'
      ],
      default: 'NOT_STARTED'
    }
  },

  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
