// [IT23818620 - K.M.S.G.S.C. Karunanayake] - UC-02A: Monitor Live Animal Telemetry
// SOLID Principle: SRP - This service handles only the health status updates for sensors.
// Avoid Code Smell: "Feature Envy" - Kept health update logic separate from telemetry controller.

const AnimalCollar = require('../models/AnimalCollar');

const updateHealth = async (collarId, status) => {
  try {
    const collar = await AnimalCollar.findOneAndUpdate(
      { collarId },
      { health: status },
      { new: true }
    );
    return collar;
  } catch (error) {
    console.error(`Failed to update health for collar ${collarId}:`, error);
    throw error;
  }
};

module.exports = {
  updateHealth,
};
