const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { requireAuth, requireRole } = require('../middlewares/authMiddleware');

// Conservation Analytics
// Protected: Role-based access for PARK_MANAGER

/**
 * GET /api/analytics/filters
 */
router.get(
  '/filters',
  requireAuth,
  requireRole(['PARK_MANAGER']),
  analyticsController.getFilterOptions
);

/**
 * POST /api/analytics/validate
 */
router.post(
  '/validate',
  requireAuth,
  requireRole(['PARK_MANAGER']),
  analyticsController.validateFilters
);

/**
 * GET /api/analytics/summary
 * Landing dashboard KPI stat metrics
 */
router.get(
  '/summary',
  requireAuth,
  requireRole(['PARK_MANAGER']),
  analyticsController.getDashboardSummary
);

/**
 * POST /api/analytics/report
 * Executes parallel fetch, computation & audit logging
 */
router.post(
  '/report',
  requireAuth,
  requireRole(['PARK_MANAGER']),
  analyticsController.generateReport
);

/**
 * POST /api/analytics/export
 * Exports report in PDF/CSV format
 */
router.post(
  '/export',
  requireAuth,
  requireRole(['PARK_MANAGER']),
  analyticsController.exportReport
);

/**
 * GET /api/analytics/queue
 * Park Manager view of community conflict queue (UC-03)
 */
router.get(
  '/queue',
  requireAuth,
  requireRole(['PARK_MANAGER']),
  analyticsController.getCommunityQueue
);

/**
 * GET /api/analytics/audit-logs
 * System audit trail history for report generation events
 */
router.get(
  '/audit-logs',
  requireAuth,
  requireRole(['PARK_MANAGER']),
  analyticsController.getAuditLogs
);

module.exports = router;
