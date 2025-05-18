const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/delivery', async (req, res) => {
  const { orderId, deliveryOption } = req.body;
  try {
    let response;
    if (deliveryOption === 'SMSA') {
      response = await axios.post('https://api.smsaexpress.com/shipments', {
        orderId,
        // بيانات أخرى حسب API SMSA (تحتاج إلى مفتاح API وتكامل)
      });
    } else if (deliveryOption === 'Aramex') {
      response = await axios.post('https://ws.aramex.com/shipping/shipment/v1/quote', {
        orderId,
        // بيانات أخرى حسب API Aramex
      });
    }
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;