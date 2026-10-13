// [IT23818620 - K.M.S.G.S.C. Karunanayake] - UC-02A: Monitor Live Animal Telemetry
// SOLID Principle: SRP - Handles only validation logic for telemetry data.
// SOLID Principle: OCP - Validation rules can be easily extended without modifying existing core logic.
// Code Smells Avoided: "Long Method" and "Switch/If-Else Chains" are avoided by using separate helper functions for each validation check.

const validateCoordinates = (lat, lon) => {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
};

const validateCollarStatus = (collar) => {
  return Boolean(collar && collar.status === 'Active');
};

const validateTelemetry = (telemetryData, collar) => {
  const { latitude, longitude } = telemetryData;

  if (!validateCoordinates(latitude, longitude)) {
    return { isValid: false, reason: 'Invalid coordinates' };
  }

  if (collar !== undefined && !validateCollarStatus(collar)) {
    return { isValid: false, reason: 'Unknown or inactive collar' };
  }

  return { isValid: true };
};

module.exports = {
  validateCoordinates,
  validateCollarStatus,
  validateTelemetry,
};

