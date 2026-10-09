// [IT23818620 - K.M.S.G.S.C. Karunanayake] - UC-02A: Monitor Live Animal Telemetry
// SOLID Principle: SRP - Coordinates the telemetry processing flow.
// Code Smells Avoided: "God Class" - This service doesn't do everything. It delegates validation to ValidationService, health updates to SensorHealthService, etc.

const AnimalCollar = require('../models/AnimalCollar');
const Telemetry = require('../models/Telemetry');
const validationService = require('./validationService');
const sensorHealthService = require('./sensorHealthService');
const geofenceEvaluationService = require('./geofenceEvaluationService');

// Private internal helper methods mapped from sequence diagram
const checkFreshness = (timestamp) => {
  const telemetryTime = new Date(timestamp).getTime();
  const currentTime = Date.now();
  return (currentTime - telemetryTime) < (24 * 60 * 60 * 1000); // 24 hours
};

const checkDuplicate = (latestTimestamp, newTimestamp) => {
  if (!latestTimestamp) return false;
  return new Date(latestTimestamp).getTime() >= new Date(newTimestamp).getTime();
};

const processTelemetry = async (telemetryData) => {
  const { collarId, latitude, longitude, timestamp } = telemetryData;

  // Step 3: validateTelemetry (Validation Service)
  const validationResult = validationService.validateTelemetry(telemetryData);

  if (!validationResult.isValid) {
    // Step 29: recordValidationFailure(telemetry)
    console.warn(`[Telemetry] Invalid Telemetry: ${validationResult.reason}`);
    return { success: false, error: 'Invalid telemetry' };
  }

  // Step 5: findAnimalByCollarId (Animal Collar Repository)
  const collarData = await AnimalCollar.findOne({ collarId });

  if (!collarData || collarData.status !== 'Active') {
    // Step 25: recordValidationFailure(collarId)
    console.warn(`[Telemetry] Unknown or inactive collar: ${collarId}`);
    return { success: false, error: 'Unknown or inactive collar' };
  }

  // Step 7: checkFreshness()
  const isFresh = checkFreshness(timestamp);
  
  // Step 8: checkDuplicate()
  const isDuplicate = checkDuplicate(collarData.latestLocation?.timestamp, timestamp);

  if (isDuplicate) {
    // Step 23: recordDuplicate(telemetry)
    console.warn(`[Telemetry] Duplicate recorded for ${collarId}`);
    return { success: false, error: 'Duplicate telemetry data' };
  }

  if (!isFresh) {
    // Step 19: updateHealth(collarId, "Stale")
    await sensorHealthService.updateHealth(collarId, 'Stale');
    return { success: false, error: 'Stale telemetry data' };
  }

  // Current and non-duplicate path
  // Step 9: saveTelemetry(telemetry)
  const newTelemetry = new Telemetry({
    collarId,
    latitude,
    longitude,
    timestamp
  });
  await newTelemetry.save();

  // Step 11: updateLatestLocation
  collarData.latestLocation = { latitude, longitude, timestamp };
  await collarData.save();

  // Step 13: updateHealth(collarId, "Online")
  await sensorHealthService.updateHealth(collarId, 'Online');

  // Step 17: provideValidLocation
  await geofenceEvaluationService.provideValidLocation(
    collarData.animalId,
    { latitude, longitude },
    timestamp
  );

  return { success: true, data: newTelemetry };
};

const getRecentTelemetry = async () => {
  const telemetry = await Telemetry.find().sort({ timestamp: -1 }).limit(100);
  const collars = await AnimalCollar.find();
  return { telemetry, collars };
};

module.exports = {
  processTelemetry,
  getRecentTelemetry,
  checkFreshness, // exported for testing
  checkDuplicate  // exported for testing
};
