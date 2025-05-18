const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const protect = require("../middlewares/authMiddleware");

// 🔹 إنشاء جلسة دفع (Checkout Session)
router.post("/create-checkout-session", protect, async (req, res) => {
    try {
        const { products } = req.body;

        const lineItems = products.map(product => ({
            price_data: {
                currency: "sar", // العملة الريال السعودي
                product_data: { name: product.name },
                unit_amount: product.price * 100 // Stripe يستخدم السنتات
            },
            quantity: product.quantity
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            success_url: `${process.env.CLIENT_URL}/payment-success`,
            cancel_url: `${process.env.CLIENT_URL}/payment-failed`
        });

        res.json({ id: session.id });
    } catch (error) {
        res.status(500).json({ message: "❌ حدث خطأ أثناء إنشاء عملية الدفع!", error });
    }
});

module.exports = router;
