// [IT23818620 - K.M.S.G.S.C. Karunanayake] - UC-02A: Monitor Live Animal Telemetry
// SOLID Principle: SRP - Isolated logic for evaluating geofences.
// SOLID Principle: DIP - Depends on abstraction (parameters) rather than concrete implementations.

// Haversine formula to calculate distance between two coordinates in km
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
};

const provideValidLocation = async (animalId, location, timestamp) => {
  console.log(`[Geofence Service] Evaluating location for Animal: ${animalId} at [${location.latitude}, ${location.longitude}]`);
  
  // Mock National Park Center Coordinates (e.g., Yala National Park roughly)
  const parkCenter = { latitude: 6.377, longitude: 81.339 };
  const maxSafeRadiusKm = 25.0; // 25km radius safe zone

  const distanceFromCenter = calculateDistance(
    location.latitude, location.longitude, 
    parkCenter.latitude, parkCenter.longitude
  );

  const isWithinGeofence = distanceFromCenter <= maxSafeRadiusKm; 

  if (!isWithinGeofence) {
    console.warn(`[Geofence Alert] Animal ${animalId} breached geofence! Distance: ${distanceFromCenter.toFixed(2)}km`);
    // In a real application, emit alert to the Alerts module
  }
  
  return { isWithinGeofence, distance: distanceFromCenter };
};

module.exports = {
  provideValidLocation,
};
