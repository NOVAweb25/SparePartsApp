const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: String,
  items: [{ sparePartId: String, quantity: Number, price: Number }],
  paymentMethod: String, // e.g., "credit_card", "tamara", "tabby"
  deliveryOption: String, // e.g., "SMSA", "Aramex", "Pickup"
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);