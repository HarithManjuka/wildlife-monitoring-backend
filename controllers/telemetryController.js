// [IT23818620 - K.M.S.G.S.C. Karunanayake] - UC-02A: Monitor Live Animal Telemetry
// SOLID Principle: SRP - The controller only handles HTTP requests and responses. It delegates business logic to the TelemetryService.
// Avoid Code Smell: "Long Method" - Kept controller actions concise.

const telemetryService = require('../services/telemetryService');

const ingestTelemetry = async (req, res) => {
  try {
    const { collarId, latitude, longitude, timestamp } = req.body;

    if (!collarId || latitude == null || longitude == null || !timestamp) {
      return res.status(400).json({ success: false, error: 'Missing required telemetry fields' });
    }

    const result = await telemetryService.processTelemetry({
      collarId,
      latitude,
      longitude,
      timestamp,
    });

    if (!result.success) {
      return res.status(422).json({ success: false, error: result.reason });
    }

    return res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error ingesting telemetry:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const getLiveTelemetry = async (req, res) => {
  try {
    const data = await telemetryService.getRecentTelemetry();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching live telemetry:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

module.exports = {
  ingestTelemetry,
  getLiveTelemetry,
};
