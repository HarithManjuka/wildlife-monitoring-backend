const analyticsService = require('../services/analyticsService');

/**
 * GET /api/analytics/summary
 * Returns high-level KPI cards for the Park Manager dashboard.
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
 * Generates a conservation analytics report using the appropriate strategy.
 */
exports.generateReport = async (req, res) => {
  try {
    const criteria = req.body;
    if (!criteria.reportType) {
      return res.status(400).json({ success: false, error: 'reportType is required' });
    }
    const report = await analyticsService.generateReport(criteria);
    return res.status(200).json({ success: true, report });
  } catch (err) {
    console.error('[UC04-ERROR] generateReport:', err.message);
    const status = err.message.includes('Unknown report type') ? 400 : 500;
    return res.status(status).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/analytics/queue
 * Returns the community conflict queue for Park Manager consumption.
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
