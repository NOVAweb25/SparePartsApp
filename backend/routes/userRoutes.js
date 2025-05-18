console.log("✅ تم تحميل userRoutes.js بنجاح!");

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Order = require("../models/Order");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const protect = require("../middlewares/authMiddleware");
const { sendOTP, verifyOTP } = require("../services/twilioService");
const upload = require("../middlewares/upload");

// 📌 **تسجيل مستخدم جديد مع تشفير كلمة المرور**
router.post("/register", async (req, res) => {
    try {
        const { name, email, phone, role, password } = req.body;

        if (!name || !email || !phone || !role || !password) {
            return res.status(400).json({ message: "❌ يرجى إدخال جميع البيانات المطلوبة." });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "❌ البريد الإلكتروني مستخدم بالفعل." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({ name, email, phone, role, password: hashedPassword });
        await user.save();

        res.status(201).json({ message: "✅ تم تسجيل المستخدم بنجاح!", user });
    } catch (error) {
        res.status(500).json({ message: "❌ حدث خطأ أثناء تسجيل المستخدم.", error });
    }
});

// 📌 **تسجيل الدخول والحصول على JWT**
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "❌ يرجى إدخال البريد الإلكتروني وكلمة المرور." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "❌ البريد الإلكتروني غير مسجل." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "❌ كلمة المرور غير صحيحة." });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });

        res.json({ message: "✅ تسجيل الدخول ناجح!", token });
    } catch (error) {
        res.status(500).json({ message: "❌ حدث خطأ أثناء تسجيل الدخول.", error });
    }
});

// 🔹 **جلب جميع المستخدمين (يتطلب المصادقة)**
router.get("/", protect, async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "❌ حدث خطأ أثناء جلب المستخدمين", error });
    }
});

// 🔹 **جلب بيانات المستخدم الحالي (يتطلب المصادقة)**
router.get("/profile", protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "❌ المستخدم غير موجود!" });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "❌ حدث خطأ أثناء جلب بيانات المستخدم!", error });
    }
});

// 🔹 **تحديث الملف الشخصي**
router.put("/profile", protect, async (req, res) => {
    try {
        const { name, phone, address, profilePicture, companyName, companyLogo, companyAddress, website, services, products } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "❌ المستخدم غير موجود!" });

        if (user.role === "customer") {
            user.name = name || user.name;
            user.phone = phone || user.phone;
            user.address = address || user.address;
            user.profilePicture = profilePicture || user.profilePicture;
        } else if (user.role === "company") {
            user.companyName = companyName || user.companyName;
            user.companyLogo = companyLogo || user.companyLogo;
            user.companyAddress = companyAddress || user.companyAddress;
            user.website = website || user.website;
            user.services = services || user.services;
            user.products = products || user.products;
        }

        await user.save();
        res.json({ message: "✅ تم تحديث الملف الشخصي بنجاح!", user });

    } catch (error) {
        res.status(500).json({ message: "❌ حدث خطأ أثناء تحديث الملف الشخصي.", error });
    }
});

// 🔹 **حذف مستخدم**
router.delete("/:id", protect, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "✅ تم حذف المستخدم بنجاح" });
    } catch (error) {
        res.status(500).json({ message: "❌ حدث خطأ أثناء الحذف", error });
    }
});

// 🔹 **إرسال كود التحقق**
router.post("/send-otp", async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "❌ رقم الجوال مطلوب!" });

    const result = await sendOTP(phone);
    if (result.success) {
        res.json({ message: "✅ تم إرسال كود التحقق!", sid: result.sid });
    } else {
        res.status(500).json({ message: "❌ فشل في إرسال كود التحقق!", error: result.error });
    }
});

// 🔹 **التحقق من كود OTP**
router.post("/verify-otp", async (req, res) => {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ message: "❌ رقم الجوال والكود مطلوبان!" });

    const result = await verifyOTP(phone, code);
    if (result.success) {
        res.json({ message: "✅ تم التحقق بنجاح!" });
    } else {
        res.status(400).json({ message: "❌ كود التحقق غير صحيح!", error: result.error });
    }
});

// 🔹 **رفع الصورة الشخصية**
router.post("/upload-profile", protect, upload.single("profilePicture"), async (req, res) => {
    try {
        res.json({ message: "✅ تم رفع الصورة بنجاح!", imagePath: `/uploads/${req.file.filename}` });
    } catch (error) {
        res.status(500).json({ message: "❌ خطأ أثناء رفع الصورة!", error });
    }
});

// 🔹 **جلب سجل الطلبات**
router.get("/orders", protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "❌ خطأ أثناء جلب الطلبات!", error });
    }
});

// 🔹 **إنشاء طلب جديد**
router.post("/orders", protect, async (req, res) => {
    try {
        const { items, totalPrice } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "❌ يجب إضافة منتجات إلى الطلب!" });
        }

        const newOrder = new Order({
            user: req.user.id,
            items,
            totalPrice,
        });

        await newOrder.save();
        res.status(201).json({ message: "✅ تم إنشاء الطلب بنجاح!", newOrder });
    } catch (error) {
        res.status(500).json({ message: "❌ خطأ أثناء إنشاء الطلب!", error });
    }
});

// ✅ **اختبار نقطة النهاية**
router.get("/test", (req, res) => {
    res.json({ message: "🔹 API تعمل بشكل صحيح!" });
});

module.exports = router;
