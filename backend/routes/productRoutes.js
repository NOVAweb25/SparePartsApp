const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const protect = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload"); // لاستقبال الصور

// 🔹 جلب جميع المنتجات
router.get("/", async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "❌ خطأ أثناء جلب المنتجات!", error });
    }
});

// 🔹 إضافة منتج جديد مع رفع الصور
router.post("/", protect, upload.array("images", 5), async (req, res) => {
    try {
        const { name, description, price, category, brand, availability } = req.body;
        const images = req.files.map(file => `/uploads/${file.filename}`); // حفظ روابط الصور

        const product = new Product({
            name,
            description,
            price,
            category,
            brand,
            images,
            availability
        });

        await product.save();
        res.status(201).json({ message: "✅ تم إضافة المنتج بنجاح!", product });
    } catch (error) {
        res.status(500).json({ message: "❌ خطأ أثناء إضافة المنتج!", error });
    }
});

// 🔹 تحديث بيانات المنتج
router.put("/:id", protect, async (req, res) => {
    try {
        const { name, description, price, category, brand, availability } = req.body;

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { name, description, price, category, brand, availability },
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: "❌ المنتج غير موجود!" });
        }

        res.json({ message: "✅ تم تحديث المنتج بنجاح!", updatedProduct });
    } catch (error) {
        res.status(500).json({ message: "❌ خطأ أثناء تحديث المنتج!", error });
    }
});

// 🔹 حذف منتج
router.delete("/:id", protect, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "✅ تم حذف المنتج بنجاح" });
    } catch (error) {
        res.status(500).json({ message: "❌ خطأ أثناء حذف المنتج!", error });
    }
});

module.exports = router;
