const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

// 🔹 إنشاء طلب جديد
router.post("/", async (req, res) => {
    try {
        const order = new Order(req.body);
        await order.save();
        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ message: "حدث خطأ أثناء إنشاء الطلب", error });
    }
});

// 🔹 جلب جميع الطلبات
router.get("/", async (req, res) => {
    const orders = await Order.find().populate("user_id").populate("products.product_id");
    res.json(orders);
});

// 🔹 تحديث حالة الطلب
router.put("/:id", async (req, res) => {
    try {
        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: "حدث خطأ أثناء تحديث الطلب", error });
    }
});

// 🔹 حذف طلب
router.delete("/:id", async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.json({ message: "تم حذف الطلب بنجاح" });
    } catch (error) {
        res.status(500).json({ message: "حدث خطأ أثناء حذف الطلب", error });
    }
});

module.exports = router;
