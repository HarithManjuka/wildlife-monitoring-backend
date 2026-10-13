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

  // validateTelemetry (Validation Service)
  const validationResult = validationService.validateTelemetry(telemetryData);

  if (!validationResult.isValid) {
    // recordValidationFailure(telemetry)
    console.warn(`[Telemetry] Invalid Telemetry: ${validationResult.reason}`);
    return { success: false, error: 'Invalid telemetry', reason: validationResult.reason || 'Invalid telemetry' };
  }

  // findAnimalByCollarId (Animal Collar Repository)
  const collarData = await AnimalCollar.findOne({ collarId });

  if (!collarData || collarData.status !== 'Active') {
    // recordValidationFailure(collarId)
    console.warn(`[Telemetry] Unknown or inactive collar: ${collarId}`);
    return { success: false, error: 'Unknown or inactive collar', reason: 'Unknown or inactive collar' };
  }

  // checkFreshness()
  const isFresh = checkFreshness(timestamp);

  if (!isFresh) {
    // updateHealth(collarId, "Stale")
    await sensorHealthService.updateHealth(collarId, 'Stale');
    return { success: false, error: 'Stale telemetry data', reason: 'Stale telemetry data' };
  }

  // checkDuplicate()
  const isDuplicate = checkDuplicate(collarData.latestLocation?.timestamp, timestamp);

  if (isDuplicate) {
    // recordDuplicate(telemetry)
    console.warn(`[Telemetry] Duplicate recorded for ${collarId}`);
    return { success: false, error: 'Duplicate telemetry data', reason: 'Duplicate telemetry data' };
  }

  // Current and non-duplicate path
  // saveTelemetry(telemetry)
  const newTelemetry = new Telemetry({
    collarId,
    latitude,
    longitude,
    timestamp
  });
  await newTelemetry.save();

  // updateLatestLocation
  collarData.latestLocation = { latitude, longitude, timestamp };
  await collarData.save();

  // updateHealth(collarId, "Online")
  await sensorHealthService.updateHealth(collarId, 'Online');

  // provideValidLocation
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
