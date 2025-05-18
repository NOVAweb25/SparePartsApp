const express = require('express');
const router = express.Router();
const MaintenanceRequest = require('../models/MaintenanceRequest');

// إرسال طلب صيانة
router.post('/maintenance', async (req, res) => {
  const maintenanceRequest = new MaintenanceRequest({
    equipmentId: req.body.equipmentId,
    issue: req.body.issue,
    userId: req.body.userId,
  });

  try {
    const newRequest = await maintenanceRequest.save();
    res.status(201).json(newRequest);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// جلب جميع طلبات الصيانة (اختياري، للإداريين)
router.get('/maintenance', async (req, res) => {
  try {
    const requests = await MaintenanceRequest.find();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;