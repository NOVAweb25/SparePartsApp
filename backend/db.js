const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/HeavyMachineryApp", {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("✅ تم الاتصال بقاعدة البيانات بنجاح"))
.catch(err => console.error("❌ خطأ في الاتصال:", err));
