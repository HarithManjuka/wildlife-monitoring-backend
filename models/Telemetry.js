// [IT23818620 - K.M.S.G.S.C. Karunanayake] - UC-02A: Monitor Live Animal Telemetry
// SOLID Principle: SRP - This model is solely responsible for defining the schema for Telemetry data in MongoDB.
const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema({
  collarId: {
    type: String,
    required: true,
    index: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Telemetry', telemetrySchema);
