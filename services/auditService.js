const mongoose = require('mongoose');
const AnalyticsAudit = require('../models/AnalyticsAudit');

class AuditService {
  constructor() {
    this.memoryAuditTrail = [];
  }

  isDbConnected() {
    return mongoose.connection && mongoose.connection.readyState === 1;
  }

  /**
   * Logs a report generation event to the audit trail.
   * Maps to: logReportGeneration(userId, reportId, criteria, ts) -> persistAuditRecord()
   *
   * @param {Object} auditData
   * @returns {Promise<{success: boolean, message: string, record: Object}>}
   */
  async logReportGeneration({ userId, userName, reportId, reportType, criteria, status, recordCount }) {
    const record = {
      reportId: reportId || `REP-${Date.now()}`,
      userId: userId || 'USR-8824',
      userName: userName || 'Park Manager',
      reportType: reportType || 'INCIDENT_ANALYSIS',
      criteria: criteria || {},
      status: status || 'SUCCESS',
      recordCount: Number(recordCount || 0),
      timestamp: new Date().toISOString(),
    };

    try {
      if (this.isDbConnected()) {
        const auditDoc = new AnalyticsAudit(record);
        await auditDoc.save();
      } else {
        // In-memory fallback if MongoDB is not connected in the local dev environment
        this.memoryAuditTrail.unshift(record);
        if (this.memoryAuditTrail.length > 100) {
          this.memoryAuditTrail.pop();
        }
      }

      return {
        success: true,
        message: `Audit logged successfully for report ${record.reportId}`,
        record,
      };
    } catch (err) {
      console.error('[UC04-AUDIT-ERROR] Failed to persist audit record:', err.message);
      // Still store in memory so audit record is not lost
      this.memoryAuditTrail.unshift(record);
      return {
        success: false,
        message: `Audit storage warning: ${err.message}`,
        record,
      };
    }
  }

  /**
   * Retrieves the recent audit log history for review.
   */
  async getAuditLogs(limit = 100) {
    try {
      if (this.isDbConnected()) {
        const docs = await AnalyticsAudit.find().sort({ timestamp: -1 }).limit(limit).lean();
        return docs;
      }
    } catch (err) {
      console.warn('[UC04-AUDIT] Reading from memory trail fallback:', err.message);
    }
    return this.memoryAuditTrail.slice(0, limit);
  }
}

module.exports = new AuditService();
