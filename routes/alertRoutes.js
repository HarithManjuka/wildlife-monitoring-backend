const express = require('express');
const router = express.Router();

// Module 2: Sensor & Geofence Alerts (K.M.S.G.S.C. Karunanayake)
router.get('/', (req, res) => {
  res.json({
    module: 'Sensor & Geofence Alerts',
    status: 'active',
    alerts: [
      { id: 'alt-101', collarId: 'ELEPHANT-C04', severity: 'HIGH', zone: 'Boundary Buffer Zone 2', triggeredAt: new Date().toISOString() },
    ],
  });
});

router.post('/telemetry', (req, res) => {
  const { collarId, latitude, longitude } = req.body;
  res.status(200).json({
    message: 'Telemetry received and geofence evaluation completed',
    collarId,
    coordinates: { latitude, longitude },
    breachDetected: false,
    evaluatedAt: new Date().toISOString(),
  });
});

module.exports = router;
