// backend/routes/conflictRoutes.js
const express = require('express');
const router = express.Router();
const conflictController = require('../controllers/conflictController');
const { requireAuth, requireRole } = require('../middlewares/authMiddleware');

// Module 3: Community Conflict Triage (A.M.H.M. Abeykoon)
router.get('/', (req, res) => {
  res.json({
    module: 'Community Conflict Triage',
    status: 'active',
    endpoints: ['/queue', '/sms', '/:reportId/assign'],
  });
});

// Webhook for SMS gateway doesn't need auth
router.post('/sms', conflictController.receiveSmsReport);

// Backward-compatibility alias for reporting
router.post('/report', conflictController.receiveSmsReport);

// Only Liaison Officers and Park Managers can view and manage the triage queue
router.get(
  '/queue', 
  requireAuth, 
  requireRole(['LIAISON_OFFICER', 'PARK_MANAGER']), 
  conflictController.getAllReports
);

router.put(
  '/:reportId/assign', 
  requireAuth, 
  requireRole(['LIAISON_OFFICER']), 
  conflictController.assignRanger
);

module.exports = router;
