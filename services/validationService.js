// [IT23818620 - K.M.S.G.S.C. Karunanayake] - UC-02A: Monitor Live Animal Telemetry
// SOLID Principle: SRP - Handles only validation logic for telemetry data.
// SOLID Principle: OCP - Validation rules can be easily extended without modifying existing core logic.
// Code Smells Avoided: "Long Method" and "Switch/If-Else Chains" are avoided by using separate helper functions for each validation check.

const validateCoordinates = (lat, lon) => {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
};

const checkFreshness = (timestamp) => {
  const telemetryTime = new Date(timestamp).getTime();
  const currentTime = Date.now();
  // If data is older than 24 hours, consider it stale
  return (currentTime - telemetryTime) < (24 * 60 * 60 * 1000); 
};

// Simplified duplicate check (in a real scenario, this might query the DB or cache)
const checkDuplicate = (latestTimestamp, newTimestamp) => {
  if (!latestTimestamp) return false;
  return new Date(latestTimestamp).getTime() >= new Date(newTimestamp).getTime();
};

const validateTelemetry = (telemetryData, collarData) => {
  const { latitude, longitude, timestamp } = telemetryData;

  if (!validateCoordinates(latitude, longitude)) {
    return { isValid: false, reason: 'Invalid coordinates' };
  }

  if (!collarData || collarData.status !== 'Active') {
    return { isValid: false, reason: 'Unknown or inactive collar' };
  }

  if (!checkFreshness(timestamp)) {
    return { isValid: false, reason: 'Stale telemetry data' };
  }

  if (checkDuplicate(collarData.latestLocation?.timestamp, timestamp)) {
    return { isValid: false, reason: 'Duplicate telemetry data' };
  }

  return { isValid: true };
};

module.exports = {
  validateTelemetry,
};
