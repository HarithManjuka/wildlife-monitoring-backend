const express = require('express');
const router = express.Router();

// Module 4: Conservation Analytics (J.R.I.C.S. Jayakody)
router.get('/', (req, res) => {
  res.json({
    module: 'Conservation Analytics',
    status: 'active',
    summary: {
      activePatrols: 6,
      sensorAlertsToday: 14,
      conflictReportsResolved: 29,
      hotspotZone: 'Wilpattu Boundary - Sector 3',
    },
    generatedAt: new Date().toISOString(),
  });
});

router.get('/hotspots', (req, res) => {
  res.json({
    period: req.query.period || 'last_30_days',
    hotspots: [
      { id: 'hs-1', name: 'Zone Alpha', threatIndex: 0.82, incidentsCount: 15 },
      { id: 'hs-2', name: 'Buffer Strip West', threatIndex: 0.64, incidentsCount: 9 },
    ],
  });
});

module.exports = router;
