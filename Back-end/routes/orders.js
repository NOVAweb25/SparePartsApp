const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// إنشاء طلب جديد (شراء)
router.post('/orders', async (req, res) => {
  const order = new Order({
    userId: req.body.userId,
    items: req.body.items,
    paymentMethod: req.body.paymentMethod,
    deliveryOption: req.body.deliveryOption,
  });

  try {
    const newOrder = await order.save();
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// جلب طلبات المستخدم
router.get('/orders/:userId', async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;