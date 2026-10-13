const mongoose = require('mongoose');
const CommunityReport = require('../models/CommunityReport');
const {
  DUPLICATE_WINDOW_MINUTES,
  THREAT_LEVELS,
  REPORT_STATUSES,
  REPORT_SOURCES,
  THREAT_KEYWORD_RULES,
  VILLAGE_COORDINATES,
} = require('../config/conflictConstants');

/**
 * Service Layer: Community Conflict Triage (UC-03)
 * Implements business logic separation (SOLID) for:
 * - SMS gateway payload parsing & normalization
 * - Keyword-based threat classification
 * - Duplicate report detection (within configurable window)
 * - Conflict report lifecycle & ranger dispatch
 */

// Initial seed data preserving existing mock records
const INITIAL_MOCK_REPORTS = [
  {
    id: 'conf-501',
    source: REPORT_SOURCES.SMS_GATEWAY,
    sender: '+94771234567',
    contact: '+94771234567',
    senderPhone: '+94771234567',
    village: 'Habarana North',
    locationDescription: 'Habarana North',
    conflictType: 'ELEPHANT_SIGHTING',
    coordinates: { latitude: 8.0338, longitude: 80.7512 },
    threatLevel: THREAT_LEVELS.MEDIUM,
    dispatchedRanger: null,
    status: REPORT_STATUSES.TRIAGED,
    description: 'Wild elephant herd sighted near cultivation fence',
    reportedAt: new Date(Date.now() - 3600000).toISOString(),
    isDuplicate: false,
    duplicateOf: null,
    triageNotes: 'Monitored by North perimeter sensor',
  },
  {
    id: 'conf-502',
    source: REPORT_SOURCES.COMMUNITY_HOTLINE,
    sender: '+94779876543',
    contact: '+94779876543',
    senderPhone: '+94779876543',
    village: 'Minneriya East',
    locationDescription: 'Minneriya East',
    conflictType: 'ELEPHANT_SIGHTING',
    coordinates: { latitude: 8.0514, longitude: 80.8931 },
    threatLevel: THREAT_LEVELS.HIGH,
    dispatchedRanger: 'Unit Alpha',
    status: REPORT_STATUSES.RANGER_ASSIGNED,
    description: 'Lone bull elephant encroaching home garden',
    reportedAt: new Date(Date.now() - 1800000).toISOString(),
    isDuplicate: false,
    duplicateOf: null,
    triageNotes: 'Immediate dispatch requested by village head',
    assignedBy: 'A.M.H.M. Abeykoon',
    assignedAt: new Date(Date.now() - 1200000).toISOString(),
  },
];

class ConflictService {
  constructor() {
    this.memoryQueue = [...INITIAL_MOCK_REPORTS];
  }

  /**
   * Reset memory store (used by test suites to guarantee test isolation)
   */
  resetStore(initialData = null) {
    this.memoryQueue = initialData ? [...initialData] : [...INITIAL_MOCK_REPORTS];
  }

  /**
   * Checks if MongoDB is currently connected
   */
  isDbConnected() {
    return mongoose.connection && mongoose.connection.readyState === 1;
  }

  /**
   * 1. Parse and normalize incoming SMS/Webhook payload
   * Handles string payload with sender phone OR object payload.
   */
  parseSmsPayload(payloadOrMessage = {}, senderPhone = '') {
    // String message format (Unit Test / SMS Gateway string body)
    if (typeof payloadOrMessage === 'string') {
      if (payloadOrMessage.trim().length === 0) {
        throw new Error('Malformed SMS: Payload is empty');
      }

      const msg = payloadOrMessage.trim();
      const phone = String(senderPhone || '').trim();

      // Determine conflict type
      let conflictType = 'OTHER';
      const upper = msg.toUpperCase();
      if (upper.includes('CROP RAID')) {
        conflictType = 'CROP_RAIDING';
      } else if (upper.includes('ELEPHANT')) {
        conflictType = 'ELEPHANT_SIGHTING';
      }

      // Extract locationDescription using patterns like "near <location>", "at <location>", "in <location>"
      let locationDescription = 'Unspecified Sector';
      const locMatch = msg.match(/(?:near|at|in)\s+([^,.;]+)/i);
      if (locMatch && locMatch[1]) {
        locationDescription = locMatch[1].trim();
      }

      const coords = VILLAGE_COORDINATES[locationDescription] || {
        latitude: null,
        longitude: null,
      };

      return {
        conflictType,
        locationDescription,
        senderPhone: phone,
        source: REPORT_SOURCES.SMS_GATEWAY,
        sender: phone || 'Anonymous',
        contact: phone,
        village: locationDescription,
        description: msg,
        coordinates: coords,
      };
    }

    // Object format (REST API / Express req.body)
    if (!payloadOrMessage || typeof payloadOrMessage !== 'object') {
      throw new Error('Invalid SMS payload: payload must be a non-null object');
    }

    const rawSender =
      payloadOrMessage.sender ||
      payloadOrMessage.reporterName ||
      payloadOrMessage.contact ||
      'Anonymous';
    const rawContact =
      payloadOrMessage.contact ||
      (payloadOrMessage.sender && /^[\d+\-\s()]+$/.test(String(payloadOrMessage.sender).trim())
        ? payloadOrMessage.sender
        : '');
    const rawVillage = payloadOrMessage.village || 'Unspecified Sector';
    const rawMessage =
      payloadOrMessage.message ||
      payloadOrMessage.description ||
      payloadOrMessage.text ||
      'SMS conflict alert received';

    const sender = String(rawSender).trim();
    const contact = String(rawContact).trim();
    const village = String(rawVillage).trim();
    const description = String(rawMessage).trim();

    let conflictType = payloadOrMessage.conflictType || 'OTHER';
    const upperDesc = description.toUpperCase();
    if (upperDesc.includes('CROP RAID')) {
      conflictType = 'CROP_RAIDING';
    } else if (upperDesc.includes('ELEPHANT')) {
      conflictType = 'ELEPHANT_SIGHTING';
    }

    const coords = VILLAGE_COORDINATES[village] || {
      latitude: payloadOrMessage.latitude || null,
      longitude: payloadOrMessage.longitude || null,
    };

    return {
      conflictType,
      locationDescription: village,
      senderPhone: contact || sender,
      source: payloadOrMessage.source || REPORT_SOURCES.SMS_GATEWAY,
      sender: sender || 'Anonymous',
      contact: contact || '',
      village: village || 'Unspecified Sector',
      description: description || 'SMS conflict alert received',
      coordinates: coords,
    };
  }

  /**
   * 2. Automated threat classification based on conflictType or text analysis
   */
  classifyThreat(threatOrConflictType = '') {
    if (!threatOrConflictType || typeof threatOrConflictType !== 'string') {
      return 'LOW';
    }

    const normalized = threatOrConflictType.trim().toUpperCase();
    if (normalized === 'CROP_RAIDING') return 'CRITICAL';
    if (normalized === 'ELEPHANT_SIGHTING') return 'HIGH';
    if (normalized === 'OTHER') return 'LOW';

    if (
      normalized === 'CRITICAL' ||
      normalized === 'HIGH' ||
      normalized === 'MEDIUM' ||
      normalized === 'LOW'
    ) {
      return normalized;
    }

    const level = this.classifyThreatLevel(threatOrConflictType);
    return level ? level.toUpperCase() : 'MEDIUM';
  }

  /**
   * Detailed keyword-based threat classification for descriptive text
   */
  classifyThreatLevel(description = '') {
    if (!description || typeof description !== 'string') {
      return THREAT_LEVELS.PENDING;
    }

    const normalizedText = description.toLowerCase().trim();
    if (normalizedText.length === 0) {
      return THREAT_LEVELS.PENDING;
    }

    for (const keyword of THREAT_KEYWORD_RULES.CRITICAL) {
      if (normalizedText.includes(keyword)) {
        return THREAT_LEVELS.CRITICAL;
      }
    }

    for (const keyword of THREAT_KEYWORD_RULES.HIGH) {
      if (normalizedText.includes(keyword)) {
        return THREAT_LEVELS.HIGH;
      }
    }

    for (const keyword of THREAT_KEYWORD_RULES.MEDIUM) {
      if (normalizedText.includes(keyword)) {
        return THREAT_LEVELS.MEDIUM;
      }
    }

    for (const keyword of THREAT_KEYWORD_RULES.LOW) {
      if (normalizedText.includes(keyword)) {
        return THREAT_LEVELS.LOW;
      }
    }

    return THREAT_LEVELS.MEDIUM;
  }

  /**
   * 3. Duplicate Report Detection via Mongoose model query (UC-03 Rubric Method)
   */
  async isDuplicateReport(locationDescription, conflictType, windowMinutes = 60) {
    try {
      const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
      const query = {
        $or: [
          { village: locationDescription },
          { locationDescription: locationDescription },
        ],
        reportedAt: { $gte: cutoff },
      };
      if (conflictType) {
        query.conflictType = conflictType;
      }

      const existing = await CommunityReport.findOne(query);
      return Boolean(existing);
    } catch {
      return false;
    }
  }

  /**
   * In-memory duplicate report detection for local queue & speed
   */
  checkDuplicate(
    village,
    description = '',
    reportedAt = new Date(),
    windowMinutes = DUPLICATE_WINDOW_MINUTES,
    existingReports = null
  ) {
    if (!village || typeof village !== 'string') {
      return { isDuplicate: false, duplicateOf: null, originalReport: null };
    }

    const reportsToInspect = existingReports || this.memoryQueue;
    const targetTime = new Date(reportedAt).getTime();
    const windowMs = windowMinutes * 60 * 1000;
    const normalizedVillage = village.toLowerCase().trim();

    const duplicate = reportsToInspect.find((r) => {
      if (!r.village) return false;
      const sameVillage = r.village.toLowerCase().trim() === normalizedVillage;
      if (!sameVillage) return false;

      const existingTime = new Date(r.reportedAt).getTime();
      const timeDiff = Math.abs(targetTime - existingTime);

      return timeDiff <= windowMs;
    });

    if (duplicate) {
      return {
        isDuplicate: true,
        duplicateOf: duplicate.id,
        originalReport: duplicate,
      };
    }

    return {
      isDuplicate: false,
      duplicateOf: null,
      originalReport: null,
    };
  }

  /**
   * 4. Process incoming SMS report end-to-end
   */
  async receiveSmsReport(rawPayload) {
    try {
      const parsed = this.parseSmsPayload(rawPayload);
      let threatLevel = rawPayload.threatLevel;

      if (!threatLevel || threatLevel === THREAT_LEVELS.PENDING) {
        threatLevel =
          parsed.conflictType && parsed.conflictType !== 'OTHER'
            ? this.classifyThreat(parsed.conflictType)
            : this.classifyThreatLevel(parsed.description);
      }

      // Normalize threat capitalization (e.g. CRITICAL -> Critical)
      const formattedThreat =
        threatLevel.charAt(0).toUpperCase() + threatLevel.slice(1).toLowerCase();

      const reportedAt = new Date().toISOString();
      const duplicateCheck = this.checkDuplicate(
        parsed.village,
        parsed.description,
        reportedAt,
        DUPLICATE_WINDOW_MINUTES
      );

      const reportId = `conf-${Date.now()}`;

      const reportDocument = {
        id: reportId,
        source: parsed.source,
        sender: parsed.sender,
        contact: parsed.contact,
        senderPhone: parsed.senderPhone,
        village: parsed.village,
        locationDescription: parsed.locationDescription,
        conflictType: parsed.conflictType,
        coordinates: parsed.coordinates,
        threatLevel: formattedThreat,
        status: duplicateCheck.isDuplicate
          ? REPORT_STATUSES.DISMISSED
          : REPORT_STATUSES.PENDING_DISPATCH,
        description: parsed.description,
        dispatchedRanger: null,
        assignedBy: null,
        assignedAt: null,
        reportedAt,
        isDuplicate: duplicateCheck.isDuplicate,
        duplicateOf: duplicateCheck.duplicateOf,
        triageNotes: duplicateCheck.isDuplicate
          ? `Auto-flagged duplicate within ${DUPLICATE_WINDOW_MINUTES} min window of ${duplicateCheck.duplicateOf}`
          : 'Pending liaison review',
      };

      this.memoryQueue.unshift(reportDocument);

      if (this.isDbConnected()) {
        try {
          await CommunityReport.create(reportDocument);
        } catch (dbErr) {
          console.error(
            `[UC03-ERROR] MongoDB persistent save failed for report ${reportId}:`,
            dbErr.message
          );
        }
      }

      return reportDocument;
    } catch (err) {
      console.error('[UC03-ERROR] Failed to process SMS report payload:', err.message);
      throw err;
    }
  }

  /**
   * 5. Retrieve all reports with optional filtering
   */
  async getAllReports(filters = {}) {
    try {
      let reports = [...this.memoryQueue];

      if (this.isDbConnected()) {
        try {
          const dbReports = await CommunityReport.find().sort({ reportedAt: -1 }).lean();
          if (dbReports && dbReports.length > 0) {
            reports = dbReports;
          }
        } catch (dbErr) {
          console.error('[UC03-ERROR] MongoDB query failed, falling back to memory queue:', dbErr.message);
        }
      }

      if (filters.status) {
        reports = reports.filter((r) => r.status === filters.status);
      }
      if (filters.threatLevel) {
        reports = reports.filter(
          (r) => r.threatLevel?.toLowerCase() === filters.threatLevel.toLowerCase()
        );
      }
      if (filters.village) {
        reports = reports.filter(
          (r) => r.village && r.village.toLowerCase().includes(filters.village.toLowerCase())
        );
      }

      return reports;
    } catch (err) {
      console.error('[UC03-ERROR] Error fetching reports from repository:', err.message);
      throw err;
    }
  }

  /**
   * 6. Get single report by unique ID
   */
  async getReportById(reportId) {
    if (!reportId) {
      console.error('[UC03-ERROR] getReportById called with empty reportId');
      return null;
    }

    let report = this.memoryQueue.find((r) => r.id === reportId);

    if (!report && this.isDbConnected()) {
      try {
        report = await CommunityReport.findOne({ id: reportId }).lean();
      } catch (dbErr) {
        console.error(`[UC03-ERROR] DB lookup failed for report ${reportId}:`, dbErr.message);
      }
    }

    return report || null;
  }

  /**
   * 7. Assign Ranger unit to a conflict report
   */
  async assignRanger(reportId, { rangerId, rangerName, assignedBy = 'Liaison Officer' } = {}) {
    try {
      const report = this.memoryQueue.find((r) => r.id === reportId);

      if (!report) {
        console.error(`[UC03-ERROR] Report not found for ranger assignment: ${reportId}`);
        const error = new Error(`Conflict report with ID ${reportId} not found`);
        error.statusCode = 404;
        throw error;
      }

      const assignedRanger = rangerName || rangerId || 'Ranger Unit Alpha';
      const assignedTimestamp = new Date().toISOString();

      report.dispatchedRanger = assignedRanger;
      report.status = REPORT_STATUSES.RANGER_ASSIGNED;
      report.assignedBy = assignedBy;
      report.assignedAt = assignedTimestamp;

      if (this.isDbConnected()) {
        try {
          await CommunityReport.findOneAndUpdate(
            { id: reportId },
            {
              $set: {
                dispatchedRanger: assignedRanger,
                status: REPORT_STATUSES.RANGER_ASSIGNED,
                assignedBy,
                assignedAt: assignedTimestamp,
              },
            }
          );
        } catch (dbErr) {
          console.error(`[UC03-ERROR] DB update failed for ranger assignment ${reportId}:`, dbErr.message);
        }
      }

      return report;
    } catch (err) {
      if (!err.statusCode) {
        console.error(`[UC03-ERROR] Unexpected error in assignRanger: ${err.message}`);
      }
      throw err;
    }
  }

  /**
   * 8. Manual triage update (threat severity adjustment or status update)
   */
  async triageReport(reportId, { threatLevel, status, triageNotes, triagedBy = 'Liaison Officer' } = {}) {
    try {
      const report = this.memoryQueue.find((r) => r.id === reportId);

      if (!report) {
        console.error(`[UC03-ERROR] Report not found for triage update: ${reportId}`);
        const error = new Error(`Conflict report with ID ${reportId} not found`);
        error.statusCode = 404;
        throw error;
      }

      if (threatLevel) report.threatLevel = threatLevel;
      if (status) report.status = status;
      if (triageNotes !== undefined) report.triageNotes = triageNotes;
      report.triagedBy = triagedBy;
      report.triagedAt = new Date().toISOString();

      if (this.isDbConnected()) {
        try {
          await CommunityReport.findOneAndUpdate(
            { id: reportId },
            {
              $set: {
                threatLevel: report.threatLevel,
                status: report.status,
                triageNotes: report.triageNotes,
              },
            }
          );
        } catch (dbErr) {
          console.error(`[UC03-ERROR] DB update failed for triage ${reportId}:`, dbErr.message);
        }
      }

      return report;
    } catch (err) {
      if (!err.statusCode) {
        console.error(`[UC03-ERROR] Unexpected error in triageReport: ${err.message}`);
      }
      throw err;
    }
  }
}

// Instantiate default singleton instance
const conflictService = new ConflictService();

// Bind methods to singleton instance so destructuring works seamlessly
const boundService = {
  ConflictService,
  DUPLICATE_WINDOW_MINUTES,
  INITIAL_MOCK_REPORTS,
  resetStore: conflictService.resetStore.bind(conflictService),
  isDbConnected: conflictService.isDbConnected.bind(conflictService),
  parseSmsPayload: conflictService.parseSmsPayload.bind(conflictService),
  classifyThreat: conflictService.classifyThreat.bind(conflictService),
  classifyThreatLevel: conflictService.classifyThreatLevel.bind(conflictService),
  isDuplicateReport: conflictService.isDuplicateReport.bind(conflictService),
  checkDuplicate: conflictService.checkDuplicate.bind(conflictService),
  receiveSmsReport: conflictService.receiveSmsReport.bind(conflictService),
  getAllReports: conflictService.getAllReports.bind(conflictService),
  getReportById: conflictService.getReportById.bind(conflictService),
  assignRanger: conflictService.assignRanger.bind(conflictService),
  triageReport: conflictService.triageReport.bind(conflictService),
};

module.exports = boundService;
