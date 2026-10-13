const mongoose = require('mongoose');

/**
 * AnalyticsAudit Mongoose Schema
 * Domain: Conservation Analytics
 * Records audit trails for all report generation and export events.
 */
const analyticsAuditSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      default: 'USR-8824',
    },
    userName: {
      type: String,
      default: 'Park Manager',
    },
    reportType: {
      type: String,
      required: true,
      enum: ['INCIDENT_ANALYSIS', 'PATROL_COVERAGE', 'HUMAN_WILDLIFE_CONFLICT'],
    },
    criteria: {
      park: String,
      dateFrom: String,
      dateTo: String,
      incidentType: String,
      severity: String,
      species: String,
      zone: String,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'LIMITED_DATA', 'FAILED'],
      default: 'SUCCESS',
    },
    recordCount: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.AnalyticsAudit || mongoose.model('AnalyticsAudit', analyticsAuditSchema);
