const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: String,
  subscriptionType: String, // e.g., "basic", "premium"
  startDate: { type: Date, default: Date.now },
  lastPurchase: Date,
  isLoyal: { type: Boolean, default: false },
});

module.exports = mongoose.model('Subscription', subscriptionSchema);