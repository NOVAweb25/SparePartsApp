const express = require('express');
const router = express.Router();
const SparePart = require('../models/SparePart');

// جلب جميع قطع الغيار
router.get('/spare-parts', async (req, res) => {
  try {
    const spareParts = await SparePart.find();
    res.json(spareParts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// جلب المنتجات المميزة
router.get('/featured-products', async (req, res) => {
  try {
    // افترض أن المنتجات المميزة هي تلك التي لديها حقل `isFeatured: true`
    const featuredProducts = await SparePart.find({ isFeatured: true }).limit(5); // 5 منتجات فقط كمثال
    res.json(featuredProducts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// البحث عن المنتجات بناءً على الاسم أو الوصف
router.get('/spare-parts/search', async (req, res) => {
  try {
    const { query } = req.query; // الحصول على النص من معلمة الاستعلام (query parameter)
    if (!query) {
      return res.status(400).json({ message: 'Query parameter is required' });
    }

    const searchQuery = {
      $or: [
        { name: { $regex: query, $options: 'i' } }, // بحث حسب الاسم (غير حساس لحالة الحروف)
        { description: { $regex: query, $options: 'i' } }, // بحث حسب الوصف
      ],
    };

    const products = await SparePart.find(searchQuery);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;