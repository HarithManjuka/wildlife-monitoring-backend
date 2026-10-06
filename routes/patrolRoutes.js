const express = require('express');
const router = express.Router();

// Module 1: Field Patrols & Incidents (M.U. Handaragama)
router.get('/', (req, res) => {
  res.json({
    module: 'Field Patrols & Incidents',
    status: 'active',
    items: [
      { id: 'patrol-1', ranger: 'Unit Alpha', area: 'Sector 4 - River Basin', status: 'In Progress', loggedAt: new Date().toISOString() },
    ],
  });
});

router.post('/sync', (req, res) => {
  const { logs = [] } = req.body;
  res.status(200).json({
    message: 'Offline patrol logs synchronized successfully',
    syncedCount: logs.length,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
