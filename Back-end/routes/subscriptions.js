const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');

// إنشاء اشتراك جديد
router.post('/subscriptions', async (req, res) => {
  const subscription = new Subscription({
    userId: req.body.userId,
    subscriptionType: req.body.subscriptionType,
  });

  try {
    const newSubscription = await subscription.save();
    res.status(201).json(newSubscription);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// جلب اشتراك المستخدم
router.get('/subscriptions/:userId', async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ userId: req.params.userId });
    res.json(subscription);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// تحديث حالة العميل الدائم (اختياري)
router.put('/subscriptions/:userId', async (req, res) => {
  try {
    const updatedSubscription = await Subscription.findOneAndUpdate(
      { userId: req.params.userId },
      { isLoyal: req.body.isLoyal },
      { new: true }
    );
    res.json(updatedSubscription);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;