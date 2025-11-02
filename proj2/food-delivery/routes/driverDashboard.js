import express from 'express';
import Order from '../models/Order.js';
import Driver from '../models/Driver.js';
const router = express.Router();


router.get('/orders/new', async (req, res) => {
  try {
    const orders = await Order.find({ 
    status: { $in: ["placed", "preparing"] },
    driverId: null})
    .populate('restaurantId', 'name address') // pickup
    .populate('userId', 'name address');   
    const updated = orders.map(o => ({
      ...o.toObject(),
      deliveryPayment: o.deliveryPayment || 5, // default $5 per delivery
      restaurantLocation: o.restaurantId?.address || 'N/A',
      customerLocation: o.userId?.address || o.deliveryLocation || 'N/A'
    }));
    console.log('📦 Sending orders to driver dashboard:', updated);
    res.json(updated);
  } catch (err) {
    res.status(500).send('Error fetching new orders');
  }
});


router.post('/orders/accept/:id', async (req, res) => {
  try {
    const driverId = req.session.driverId;
    const order = await Order.findByIdAndUpdate(req.params.id, {
      driverId,
      status: 'out_for_delivery',
      deliveryPayment: 5 
    });
    res.json({ message: 'Order accepted', order });
  } catch (err) {
    res.status(500).send('Error accepting order');
  }
});


router.get('/orders/pending', async (req, res) => {
  try {
    const driverId = req.session.driverId;
    const orders = await Order.find({ driverId, status: 'out_for_delivery' })
      .populate('restaurantId', 'name address')
      .populate('userId', 'name address');
      const updated = orders.map(o => ({
      ...o.toObject(),
      deliveryPayment: o.deliveryPayment || 5,
      restaurantLocation: o.restaurantId?.address || 'N/A',
      customerLocation: o.userId?.address || o.deliveryLocation || 'N/A'
    }));
    res.json(updated);
  } catch (err) {
    res.status(500).send('Error fetching pending deliveries');
  }
});


router.post('/orders/delivered/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: 'delivered' });
    res.json({ message: 'Order marked as delivered', order });
  } catch (err) {
    res.status(500).send('Error marking delivered');
  }
});


router.get('/payments', async (req, res) => {
  try {
    const driverId = req.session.driverId;
    const { start, end } = req.query;
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() + 1); 

    const payments = await Order.find({
      driverId,
      status: 'delivered',
      updatedAt: { $gte: startDate, $lte: endDate }
    }).select('deliveryPayment updatedAt');

    const total = payments.reduce((sum, o) => sum + o.deliveryPayment, 0);
    res.json({ total, payments });
  } catch (err) {
    res.status(500).send('Error fetching payments');
  }
});

export default router;
