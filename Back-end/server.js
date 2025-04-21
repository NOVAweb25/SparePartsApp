// تحميل المتغيرات من ملف .env
require("dotenv").config();

// استدعاء المكتبات المطلوبة
const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const connectDB = require("./config/database");

// إنشاء التطبيق باستخدام Express
const app = express();

// إعدادات الميدل وير (middlewares)
app.use(express.json());
app.use(cors());

// 🖼️ جعل `uploads` مجلد عام للصور حتى يمكن الوصول إليه من المتصفح
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// الاتصال بقاعدة البيانات
connectDB();

// 📌 استيراد جميع المسارات المطلوبة
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

// 📌 استخدام المسارات
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/payments", paymentRoutes);

// 🔹 واجهة دردشة الذكاء الصناعي
app.post("/api/chat", async (req, res) => {
    try {
        const { message } = req.body;
        const response = await axios.post("http://localhost:5001/chat", { message });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: "❌ خطأ في الاتصال بالذكاء الصناعي!" });
    }
});

// 📌 نقطة اختبار للتأكد من عمل السيرفر
app.get("/", (req, res) => {
    res.send("🚀 الخادم يعمل بنجاح!");
});

// تعريف البورت من ملف .env أو استخدام 5000 كقيمة افتراضية
const PORT = process.env.PORT || 5000;

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
});
