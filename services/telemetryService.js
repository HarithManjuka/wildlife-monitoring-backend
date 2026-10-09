// [IT23818620 - K.M.S.G.S.C. Karunanayake] - UC-02A: Monitor Live Animal Telemetry
// SOLID Principle: SRP - Coordinates the telemetry processing flow.
// Code Smells Avoided: "God Class" - This service doesn't do everything. It delegates validation to ValidationService, health updates to SensorHealthService, etc.

const AnimalCollar = require('../models/AnimalCollar');
const Telemetry = require('../models/Telemetry');
const validationService = require('./validationService');
const sensorHealthService = require('./sensorHealthService');
const geofenceEvaluationService = require('./geofenceEvaluationService');

const processTelemetry = async (telemetryData) => {
  const { collarId, latitude, longitude, timestamp } = telemetryData;

  // 1. Fetch Collar Data
  const collarData = await AnimalCollar.findOne({ collarId });

  // 2. Validate Telemetry
  const validationResult = validationService.validateTelemetry(telemetryData, collarData);

  if (!validationResult.isValid) {
    // Record validation failure (e.g., logging or saving invalid data flag)
    console.warn(`[Telemetry] Validation failed for collar ${collarId}: ${validationResult.reason}`);
    
    if (validationResult.reason === 'Unknown or inactive collar') {
      // In a real app, emit a showUnknownCollarWarning event here
    } else if (validationResult.reason === 'Stale telemetry data') {
      await sensorHealthService.updateHealth(collarId, 'Stale');
      // emit showStaleWarning event
    } else if (validationResult.reason === 'Duplicate telemetry data') {
      // Record duplicate
      console.warn(`[Telemetry] Duplicate recorded for ${collarId}`);
    } else {
      // Invalid coordinates
      // emit showInvalidTelemetryWarning event
    }

    return { success: false, reason: validationResult.reason };
  }

  // 3. Current and non-duplicate: Save Telemetry
  const newTelemetry = new Telemetry({
    collarId,
    latitude,
    longitude,
    timestamp
  });
  await newTelemetry.save();

  // 4. Update Latest Location on Animal Collar
  collarData.latestLocation = { latitude, longitude, timestamp };
  await collarData.save();

  // 5. Update Health to Online
  await sensorHealthService.updateHealth(collarId, 'Online');

  // 6. Publish telemetry (Simulated via a real-time event or just returned to controller)
  // publishTelemetry(collarData.animalId, {latitude, longitude}, timestamp, 'Online');

  // 7. Geofence Evaluation
  await geofenceEvaluationService.provideValidLocation(
    collarData.animalId,
    { latitude, longitude },
    timestamp
  );

  return { success: true, data: newTelemetry };
};

const getRecentTelemetry = async () => {
  // Fetch recent telemetry for the dashboard
  const telemetry = await Telemetry.find().sort({ timestamp: -1 }).limit(100);
  const collars = await AnimalCollar.find();
  return { telemetry, collars };
};

module.exports = {
  processTelemetry,
  getRecentTelemetry
};
