const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// 🔹 تعريف مخطط المستخدم (User Schema)
const userSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["customer", "admin", "company"], default: "customer" },
    points: { type: Number, default: 0 },
    address: { type: String, default: "" }, // ✅ تم تصحيح هذا السطر
    profileImage: { type: String, default: "" },
    companyName: { type: String, default: "" }
  },
  { timestamps: true } // ✅ إضافة الطوابع الزمنية تلقائيًا
);

// 🔹 تشفير كلمة المرور قبل الحفظ
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 🔹 التحقق من صحة كلمة المرور
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// 🔹 تصدير النموذج
module.exports = mongoose.model("User", userSchema);
