const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ربط الدردشة بالمستخدم
        messages: [
            {
                sender: { type: String, enum: ["user", "bot"], required: true }, // المرسل (المستخدم أو الذكاء الصناعي)
                message: { type: String, required: true },
                timestamp: { type: Date, default: Date.now },
            }
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);
