const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        description: { type: String, required: true },
        price: { type: Number, required: true },
        category: { type: String, required: true },
        brand: { type: String, required: true },
        images: [{ type: String }], // تخزين روابط الصور
        availability: { type: Boolean, default: true }, // متوفر أو غير متوفر
    },
    { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
