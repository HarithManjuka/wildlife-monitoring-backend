// [IT23818620 - K.M.S.G.S.C. Karunanayake] - UC-02A: Monitor Live Animal Telemetry
// SOLID Principle: SRP - This model is solely responsible for defining the Animal Collar data structure.
// Avoid Code Smell: "Primitive Obsession" by using proper types for location (subdocument) instead of flat primitive fields if it were complex, though simple here.
const mongoose = require('mongoose');

const animalCollarSchema = new mongoose.Schema({
  collarId: {
    type: String,
    required: true,
    unique: true,
  },
  animalId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Unknown'],
    default: 'Active',
  },
  health: {
    type: String,
    enum: ['Online', 'Offline', 'Stale', 'Unknown'],
    default: 'Unknown',
  },
  latestLocation: {
    latitude: Number,
    longitude: Number,
    timestamp: Date,
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('AnimalCollar', animalCollarSchema);
