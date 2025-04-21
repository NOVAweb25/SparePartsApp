const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');

// إرسال آراء العميل
router.post('/feedback', async (req, res) => {
  const feedback = new Feedback({
    userId: req.body.userId,
    feedback: req.body.feedback,
    rating: req.body.rating,
  });

  try {
    const newFeedback = await feedback.save();
    res.status(201).json(newFeedback);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// جلب جميع الآراء (اختياري، للإداريين)
router.get('/feedback', async (req, res) => {
  try {
    const feedbacks = await Feedback.find();
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;