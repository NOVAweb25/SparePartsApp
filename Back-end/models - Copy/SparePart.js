const mongoose = require('mongoose');

const sparePartSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String,
  description: String,
  isFeatured: { type: Boolean, default: false }, // حقل جديد للمنتجات المميزة
});

module.exports = mongoose.model('SparePart', sparePartSchema);