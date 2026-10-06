const express = require('express');
const router = express.Router();

// Module 3: Community Conflict Triage (A.M.H.M. Abeykoon)
router.get('/', (req, res) => {
  res.json({
    module: 'Community Conflict Triage',
    status: 'active',
    reports: [
      { id: 'conf-501', source: 'SMS Gateway', village: 'Habarana North', threatLevel: 'Medium', dispatchedRanger: null, status: 'Triaged' },
    ],
  });
});

router.post('/report', (req, res) => {
  const { reporterName, contact, village, description } = req.body;
  res.status(201).json({
    message: 'Conflict incident report recorded and triaged',
    reportId: `conf-${Date.now()}`,
    reporter: reporterName || 'Anonymous',
    contact: contact || null,
    village: village || 'Unspecified',
    description: description || '',
    status: 'Pending Dispatch',
    receivedAt: new Date().toISOString(),
  });
});

module.exports = router;
