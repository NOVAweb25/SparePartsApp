const express = require('express');
const connectDB = require('./config/database');
const sparePartsRoutes = require('./routes/spareParts');
const maintenanceRoutes = require('./routes/maintenance');
const chatRoutes = require('./routes/chat');
const orderRoutes = require('./routes/orders');
const subscriptionRoutes = require('./routes/subscriptions');
const feedbackRoutes = require('./routes/feedback');
const deliveryRoutes = require('./routes/delivery');
require('dotenv').config();

const app = express();

// Middleware لقراءة JSON في الطلبات
app.use(express.json());

// الاتصال بقاعدة البيانات MongoDB
connectDB();

// تفعيل المسارات (Routes)
app.use('/api', sparePartsRoutes);
app.use('/api', maintenanceRoutes);
app.use('/api', chatRoutes);
app.use('/api', orderRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api', feedbackRoutes);
app.use('/api', deliveryRoutes);

// تشغيل الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});