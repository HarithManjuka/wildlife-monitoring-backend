const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { requireAuth, requireRole } = require('../middlewares/authMiddleware');

// Conservation Analytics
// All endpoints are protected: only PARK_MANAGER can access analytics.

/**
 * GET /api/analytics/summary
 * KPI summary cards for the landing dashboard.
 */
router.get(
  '/summary',
  requireAuth,
  requireRole(['PARK_MANAGER']),
  analyticsController.getDashboardSummary
);

/**
 * POST /api/analytics/report
 * Generate a conservation analytics report.
 */
router.post(
  '/report',
  requireAuth,
  requireRole(['PARK_MANAGER']),
  analyticsController.generateReport
);

/**
 * GET /api/analytics/queue
 * Park Manager view of community conflict queue
 */
router.get(
  '/queue',
  requireAuth,
  requireRole(['PARK_MANAGER']),
  analyticsController.getCommunityQueue
);

module.exports = router;
