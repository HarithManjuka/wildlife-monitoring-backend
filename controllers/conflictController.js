// backend/controllers/conflictController.js
const conflictService = require('../services/conflictService');

/**
 * Controller: Community Conflict Triage (UC-03)
 * Adheres to Single Responsibility Principle (SOLID).
 * Delegates business logic, duplicate analysis, threat scoring, and storage to conflictService.
 */

// 1. Webhook for SMS gateway (public/unauthenticated)
exports.receiveSmsReport = async (req, res) => {
  try {
    const report = await conflictService.receiveSmsReport(req.body);

    return res.status(201).json({
      success: true,
      message: 'SMS conflict report received and queued for triage',
      report,
    });
  } catch (err) {
    console.error('[UC03-ERROR] receiveSmsReport controller failure:', err.message);
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to ingest SMS conflict report',
    });
  }
};

// 2. Retrieve triage queue (Protected: LIAISON_OFFICER, PARK_MANAGER)
exports.getAllReports = async (req, res) => {
  try {
    const reports = await conflictService.getAllReports(req.query);

    return res.status(200).json({
      success: true,
      total: reports.length,
      reports,
    });
  } catch (err) {
    console.error('[UC03-ERROR] getAllReports controller failure:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve conflict reports queue',
    });
  }
};

// 3. Retrieve single conflict incident details
exports.getReportById = async (req, res) => {
  try {
    const reportId = req.params.reportId || req.params.id;
    const report = await conflictService.getReportById(reportId);

    if (!report) {
      console.error(`[UC03-ERROR] Report not found: ${reportId}`);
      return res.status(404).json({
        success: false,
        error: `Conflict report with ID ${reportId} not found`,
      });
    }

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (err) {
    console.error('[UC03-ERROR] getReportById controller failure:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve incident details',
    });
  }
};

// 4. Assign ranger to report (Protected: LIAISON_OFFICER)
exports.assignRanger = async (req, res) => {
  const reportId = req.params.reportId || req.params.id;
  const { rangerId, rangerName } = req.body;

  try {
    const assignedBy = req.user ? req.user.name : 'Liaison Officer';
    const report = await conflictService.assignRanger(reportId, {
      rangerId,
      rangerName,
      assignedBy,
    });

    return res.status(200).json({
      success: true,
      message: `Ranger assigned successfully to conflict report ${reportId}`,
      report,
    });
  } catch (err) {
    console.error(`[UC03-ERROR] assignRanger controller failure for ${reportId}:`, err.message);
    const statusCode = err.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      error: err.message,
    });
  }
};

// 5. Update threat classification or triage status
exports.triageReport = async (req, res) => {
  const reportId = req.params.reportId || req.params.id;
  const { threatLevel, status, triageNotes } = req.body;

  try {
    const triagedBy = req.user ? req.user.name : 'Liaison Officer';
    const report = await conflictService.triageReport(reportId, {
      threatLevel,
      status,
      triageNotes,
      triagedBy,
    });

    return res.status(200).json({
      success: true,
      message: `Conflict report ${reportId} triage updated successfully`,
      report,
    });
  } catch (err) {
    console.error(`[UC03-ERROR] triageReport controller failure for ${reportId}:`, err.message);
    const statusCode = err.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      error: err.message,
    });
  }
};
