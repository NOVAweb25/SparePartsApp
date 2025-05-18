const mongoose = require('mongoose');

const maintenanceRequestSchema = new mongoose.Schema({
  equipmentId: String,
  issue: String,
  userId: String,
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('MaintenanceRequest', maintenanceRequestSchema);