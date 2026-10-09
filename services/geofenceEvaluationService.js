// [IT23818620 - K.M.S.G.S.C. Karunanayake] - UC-02A: Monitor Live Animal Telemetry
// SOLID Principle: SRP - Isolated logic for evaluating geofences.
// SOLID Principle: DIP - Depends on abstraction (parameters) rather than concrete implementations.

const provideValidLocation = async (animalId, location, timestamp) => {
  // Mock geofence evaluation logic
  console.log(`[Geofence Service] Evaluating location for Animal: ${animalId} at [${location.latitude}, ${location.longitude}]`);
  
  // In a real application, this would check against predefined geofences in the DB
  const isWithinGeofence = true; 

  if (!isWithinGeofence) {
    console.warn(`[Geofence Alert] Animal ${animalId} breached geofence!`);
    // Logic to emit alert would go here
  }
  
  return { isWithinGeofence };
};

module.exports = {
  provideValidLocation,
};
