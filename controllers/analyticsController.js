const analyticsService = require('../services/analyticsService');
const auditService = require('../services/auditService');

/**
 * GET /api/analytics/filters
 * Retrieves filter options
 */
exports.getFilterOptions = (req, res) => {
  try {
    const filters = analyticsService.getFilterOptions();
    return res.status(200).json({ success: true, filters });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/analytics/validate
 * Validates criteria parameters
 */
exports.validateFilters = (req, res) => {
  try {
    const result = analyticsService.validateFilters(req.body);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ valid: false, error: err.message });
  }
};

/**
 * GET /api/analytics/summary
 * Landing dashboard KPI statistics
 */
exports.getDashboardSummary = async (req, res) => {
  try {
    const { park } = req.query;
    const summary = await analyticsService.getDashboardSummary(park);
    return res.status(200).json({ success: true, summary });
  } catch (err) {
    console.error('[UC04-ERROR] getDashboardSummary:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to retrieve dashboard summary' });
  }
};

/**
 * POST /api/analytics/report
 * Executes parallel query, statisticsDTO, hotspotData, chartData, and audit persistence.
 */
exports.generateReport = async (req, res) => {
  try {
    const criteria = req.body;
    const user = req.user || { userId: 'USR-8824', name: 'J.R.I.C.S. Jayakody' };
    const report = await analyticsService.generateReport(criteria, user);
    return res.status(200).json({ success: true, report });
  } catch (err) {
    console.error('[UC04-ERROR] generateReport:', err.message);
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/analytics/export
 * Handles PDF rendering / failure with CSV fallback
 */
exports.exportReport = async (req, res) => {
  try {
    const { payload, format, simulateError } = req.body;
    const user = req.user || { userId: 'USR-8824', name: 'J.R.I.C.S. Jayakody' };
    const result = await analyticsService.exportReport(payload, format, { simulateError }, user);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[UC04-ERROR] exportReport:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/analytics/queue
 * Community conflict triage queue consumed by Park Manager
 */
exports.getCommunityQueue = async (req, res) => {
  try {
    const reports = await analyticsService.getCommunityQueue(req.query);
    return res.status(200).json({ success: true, total: reports.length, reports });
  } catch (err) {
    console.error('[UC04-ERROR] getCommunityQueue:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to retrieve community queue' });
  }
};

/**
 * GET /api/analytics/audit-logs
 * Retrieves system audit trail history
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const logs = await auditService.getAuditLogs(limit);
    return res.status(200).json({ success: true, total: logs.length, logs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
