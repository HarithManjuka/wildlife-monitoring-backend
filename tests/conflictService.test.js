// backend/tests/conflictService.test.js
const conflictService = require('../services/conflictService');
const CommunityReport = require('../models/CommunityReport');
const {
  DUPLICATE_WINDOW_MINUTES,
  THREAT_LEVELS,
  REPORT_STATUSES,
  REPORT_SOURCES,
} = require('../config/conflictConstants');

// Mock Mongoose model for isolated unit testing
jest.mock('../models/CommunityReport');

// =========================================================================
// SECTION 1: CORE SPECIFICATION SUITE (UC-03 Rubric Exact Requirements)
// =========================================================================
describe('ConflictService (UC-03)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    conflictService.resetStore();
  });

  describe('parseSmsPayload()', () => {
    // POSITIVE (Happy Path)
    it('should correctly parse a valid elephant sighting SMS', () => {
      const result = conflictService.parseSmsPayload(
        'ELEPHANT near Village Boundary',
        '+94771234567'
      );
      expect(result.conflictType).toBe('ELEPHANT_SIGHTING');
      expect(result.locationDescription).toBe('Village Boundary');
      expect(result.senderPhone).toBe('+94771234567');
    });

    // POSITIVE
    it('should correctly parse a crop raiding SMS', () => {
      const result = conflictService.parseSmsPayload(
        'CROP RAID at Sector 4',
        '+94771234567'
      );
      expect(result.conflictType).toBe('CROP_RAIDING');
      expect(result.locationDescription).toBe('Sector 4');
    });

    // NEGATIVE (Sad Path)
    it('should throw an error if SMS payload is empty', () => {
      expect(() => {
        conflictService.parseSmsPayload('', '+94771234567');
      }).toThrow('Malformed SMS: Payload is empty');
    });
  });

  describe('classifyThreat()', () => {
    // EDGE CASES
    it('should return CRITICAL for CROP_RAIDING', () => {
      expect(conflictService.classifyThreat('CROP_RAIDING')).toBe('CRITICAL');
    });

    it('should return HIGH for ELEPHANT_SIGHTING', () => {
      expect(conflictService.classifyThreat('ELEPHANT_SIGHTING')).toBe('HIGH');
    });

    it('should return LOW for OTHER', () => {
      expect(conflictService.classifyThreat('OTHER')).toBe('LOW');
    });
  });

  describe('isDuplicateReport()', () => {
    // POSITIVE: Duplicate found
    it('should return true if a similar report exists within 60 mins', async () => {
      CommunityReport.findOne.mockResolvedValue({ _id: 'mock-id' }); // Mock finding a record

      const isDup = await conflictService.isDuplicateReport('Sector 4', 'CROP_RAIDING');
      expect(isDup).toBe(true);
      expect(CommunityReport.findOne).toHaveBeenCalled();
    });

    // NEGATIVE: No duplicate
    it('should return false if no similar report exists', async () => {
      CommunityReport.findOne.mockResolvedValue(null); // Mock finding nothing

      const isDup = await conflictService.isDuplicateReport('Sector 9', 'ELEPHANT_SIGHTING');
      expect(isDup).toBe(false);
    });
  });
});

// =========================================================================
// SECTION 2: COMPREHENSIVE POSITIVE, NEGATIVE, AND EDGE COVERAGE SUITE
// =========================================================================
describe('ConflictService Comprehensive Validation & Edge Cases Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    conflictService.resetStore();
  });

  // -----------------------------------------------------------------------
  // Additional parseSmsPayload Cases (Object & Ingestion formats)
  // -----------------------------------------------------------------------
  describe('parseSmsPayload() - Extended Payload Formats', () => {
    it('Positive: correctly parses and normalizes standard SMS object payload', () => {
      const payload = {
        sender: '+94771234567',
        village: 'Habarana North',
        message: 'Elephants spotted near the school fence',
      };

      const parsed = conflictService.parseSmsPayload(payload);

      expect(parsed.source).toBe(REPORT_SOURCES.SMS_GATEWAY);
      expect(parsed.sender).toBe('+94771234567');
      expect(parsed.contact).toBe('+94771234567');
      expect(parsed.village).toBe('Habarana North');
      expect(parsed.description).toBe('Elephants spotted near the school fence');
      expect(parsed.coordinates).toEqual({ latitude: 8.0338, longitude: 80.7512 });
    });

    it('Positive: correctly parses alternate field names (contact, reporterName, description)', () => {
      const payload = {
        reporterName: 'Sunil Perera',
        contact: '+94719998888',
        village: 'Minneriya East',
        description: 'Wild elephant in backyard',
      };

      const parsed = conflictService.parseSmsPayload(payload);

      expect(parsed.sender).toBe('Sunil Perera');
      expect(parsed.contact).toBe('+94719998888');
      expect(parsed.village).toBe('Minneriya East');
      expect(parsed.description).toBe('Wild elephant in backyard');
      expect(parsed.coordinates).toEqual({ latitude: 8.0514, longitude: 80.8931 });
    });

    it('Edge: trims leading and trailing whitespaces from payload strings', () => {
      const payload = {
        sender: '  +94770001111  ',
        village: '  Sigiriya West  ',
        message: '  Crop fence breach  ',
      };

      const parsed = conflictService.parseSmsPayload(payload);

      expect(parsed.sender).toBe('+94770001111');
      expect(parsed.village).toBe('Sigiriya West');
      expect(parsed.description).toBe('Crop fence breach');
    });

    it('Edge: handles missing optional fields with safe defaults', () => {
      const payload = {};
      const parsed = conflictService.parseSmsPayload(payload);

      expect(parsed.sender).toBe('Anonymous');
      expect(parsed.village).toBe('Unspecified Sector');
      expect(parsed.description).toBe('SMS conflict alert received');
      expect(parsed.coordinates).toEqual({ latitude: null, longitude: null });
    });

    it('Negative: throws error if payload is null or invalid type', () => {
      expect(() => conflictService.parseSmsPayload(null)).toThrow(
        'Invalid SMS payload: payload must be a non-null object'
      );
      expect(() => conflictService.parseSmsPayload(12345)).toThrow(
        'Invalid SMS payload: payload must be a non-null object'
      );
    });
  });

  // -----------------------------------------------------------------------
  // Threat Classification Keyword Rules & Text Analysis
  // -----------------------------------------------------------------------
  describe('classifyThreatLevel() & classifyThreat() Keyword Rules', () => {
    it('Positive (Critical): detects life-threatening emergency keywords', () => {
      const description = 'Elephant attack in village center, one farmer injured';
      const level = conflictService.classifyThreatLevel(description);
      expect(level).toBe(THREAT_LEVELS.CRITICAL);
    });

    it('Positive (Critical): detects property destruction and charging behavior', () => {
      const description = 'Charging bull caused house damage and destroyed home walls';
      const level = conflictService.classifyThreatLevel(description);
      expect(level).toBe(THREAT_LEVELS.CRITICAL);
    });

    it('Positive (High): detects aggressive lone bull near residential structures', () => {
      const description = 'Aggressive lone bull elephant entering home garden';
      const level = conflictService.classifyThreatLevel(description);
      expect(level).toBe(THREAT_LEVELS.HIGH);
    });

    it('Positive (High): detects elephant presence near village school or residential zone', () => {
      const description = 'Elephant encroaching near primary school compound';
      const level = conflictService.classifyThreatLevel(description);
      expect(level).toBe(THREAT_LEVELS.HIGH);
    });

    it('Positive (Medium): detects crop and farmland encroachment keywords', () => {
      const description = 'Elephant herd crossing paddy cultivation field';
      const level = conflictService.classifyThreatLevel(description);
      expect(level).toBe(THREAT_LEVELS.MEDIUM);
    });

    it('Positive (Medium): detects fence crossing and road crossings', () => {
      const description = 'Three elephants crossing main road near farmland fence';
      const level = conflictService.classifyThreatLevel(description);
      expect(level).toBe(THREAT_LEVELS.MEDIUM);
    });

    it('Positive (Low): detects distant sightings and non-threatening tracks', () => {
      const description = 'Distant sighting of elephant tracks and dung along forest edge';
      const level = conflictService.classifyThreatLevel(description);
      expect(level).toBe(THREAT_LEVELS.LOW);
    });

    it('Positive (Low): detects peaceful grazing along jungle boundary', () => {
      const description = 'Elephants observed peaceful grazing at jungle boundary';
      const level = conflictService.classifyThreatLevel(description);
      expect(level).toBe(THREAT_LEVELS.LOW);
    });

    it('Edge: case-insensitivity in keyword evaluation', () => {
      expect(conflictService.classifyThreatLevel('ELEPHANT ATTACK')).toBe(THREAT_LEVELS.CRITICAL);
      expect(conflictService.classifyThreatLevel('LONE BULL ENCOUNTER')).toBe(THREAT_LEVELS.HIGH);
      expect(conflictService.classifyThreatLevel('pAdDy CrOp DaMaGe')).toBe(THREAT_LEVELS.MEDIUM);
    });

    it('Edge: returns fallback Medium level when description is generic without explicit keywords', () => {
      const description = 'Wildlife spotted near marker post 14';
      const level = conflictService.classifyThreatLevel(description);
      expect(level).toBe(THREAT_LEVELS.MEDIUM);
    });

    it('Edge / Negative: returns Pending for empty or invalid descriptions', () => {
      expect(conflictService.classifyThreatLevel('')).toBe(THREAT_LEVELS.PENDING);
      expect(conflictService.classifyThreatLevel('   ')).toBe(THREAT_LEVELS.PENDING);
      expect(conflictService.classifyThreatLevel(null)).toBe(THREAT_LEVELS.PENDING);
      expect(conflictService.classifyThreatLevel(undefined)).toBe(THREAT_LEVELS.PENDING);
      expect(conflictService.classifyThreatLevel(12345)).toBe(THREAT_LEVELS.PENDING);
    });
  });

  // -----------------------------------------------------------------------
  // Duplicate Report Detection & Configurable Time Window
  // -----------------------------------------------------------------------
  describe('checkDuplicate() with Configurable Window', () => {
    const existingReports = [
      {
        id: 'conf-101',
        village: 'Habarana North',
        description: 'Herd sighted near lake',
        reportedAt: new Date('2026-10-07T10:00:00.000Z'),
      },
      {
        id: 'conf-102',
        village: 'Minneriya East',
        description: 'Bull elephant near road',
        reportedAt: new Date('2026-10-07T08:00:00.000Z'),
      },
    ];

    it('Positive: identifies report as duplicate if within 30-minute window in same village', () => {
      const targetTime = new Date('2026-10-07T10:15:00.000Z'); // 15 mins later
      const result = conflictService.checkDuplicate(
        'Habarana North',
        'Another elephant seen nearby',
        targetTime,
        DUPLICATE_WINDOW_MINUTES,
        existingReports
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateOf).toBe('conf-101');
      expect(result.originalReport.id).toBe('conf-101');
    });

    it('Negative: does not flag report as duplicate if outside the 30-minute window', () => {
      const targetTime = new Date('2026-10-07T10:35:00.000Z'); // 35 mins later (> 30 mins)
      const result = conflictService.checkDuplicate(
        'Habarana North',
        'New sighting',
        targetTime,
        DUPLICATE_WINDOW_MINUTES,
        existingReports
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateOf).toBeNull();
      expect(result.originalReport).toBeNull();
    });

    it('Negative: does not flag as duplicate if report is in a different village even if within window', () => {
      const targetTime = new Date('2026-10-07T10:10:00.000Z');
      const result = conflictService.checkDuplicate(
        'Sigiriya West',
        'Elephant sighting',
        targetTime,
        DUPLICATE_WINDOW_MINUTES,
        existingReports
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateOf).toBeNull();
    });

    it('Edge: case-insensitivity on village names during duplicate detection', () => {
      const targetTime = new Date('2026-10-07T10:10:00.000Z');
      const result = conflictService.checkDuplicate(
        '  hAbArAnA NoRtH  ',
        'Sighting test',
        targetTime,
        DUPLICATE_WINDOW_MINUTES,
        existingReports
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateOf).toBe('conf-101');
    });

    it('Edge: returns false duplicate status for null/empty village input', () => {
      const result = conflictService.checkDuplicate(null);
      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateOf).toBeNull();
    });

    it('Edge: handles empty existing reports array safely', () => {
      const result = conflictService.checkDuplicate('Habarana North', 'test', new Date(), 30, []);
      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateOf).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // End-to-End SMS Ingestion & Queue Flow
  // -----------------------------------------------------------------------
  describe('receiveSmsReport() End-to-End Pipeline', () => {
    it('Positive: ingests new unique SMS report, classifies threat and sets status to Pending Dispatch', async () => {
      const payload = {
        sender: '+94770002222',
        village: 'Wilpattu Buffer',
        message: 'Bull elephant destroying crop harvest fence',
      };

      const report = await conflictService.receiveSmsReport(payload);

      expect(report.id).toMatch(/^conf-\d+/);
      expect(report.village).toBe('Wilpattu Buffer');
      expect(report.threatLevel).toBe('High');
      expect(report.status).toBe(REPORT_STATUSES.PENDING_DISPATCH);
      expect(report.isDuplicate).toBe(false);
      expect(report.dispatchedRanger).toBeNull();

      const all = await conflictService.getAllReports();
      expect(all.some((r) => r.id === report.id)).toBe(true);
    });

    it('Positive: auto-flags and dismisses duplicate reports received within window', async () => {
      const payload1 = {
        sender: '+94770001111',
        village: 'Polonnaruwa Border',
        message: 'Wild elephant near tank bund',
      };
      const firstReport = await conflictService.receiveSmsReport(payload1);
      expect(firstReport.isDuplicate).toBe(false);

      const payload2 = {
        sender: '+94770003333',
        village: 'Polonnaruwa Border',
        message: 'Another caller reported same elephant near bund',
      };
      const secondReport = await conflictService.receiveSmsReport(payload2);

      expect(secondReport.isDuplicate).toBe(true);
      expect(secondReport.duplicateOf).toBe(firstReport.id);
      expect(secondReport.status).toBe(REPORT_STATUSES.DISMISSED);
      expect(secondReport.triageNotes).toContain(firstReport.id);
    });

    it('Negative: throws error on invalid payload submission', async () => {
      await expect(conflictService.receiveSmsReport(null)).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Queue Retrieval & Filtering
  // -----------------------------------------------------------------------
  describe('getAllReports() & Filtering', () => {
    it('Positive: retrieves all reports from queue', async () => {
      const reports = await conflictService.getAllReports();
      expect(Array.isArray(reports)).toBe(true);
      expect(reports.length).toBeGreaterThanOrEqual(2);
    });

    it('Positive: filters reports by status', async () => {
      const filtered = await conflictService.getAllReports({
        status: REPORT_STATUSES.RANGER_ASSIGNED,
      });
      expect(filtered.every((r) => r.status === REPORT_STATUSES.RANGER_ASSIGNED)).toBe(true);
    });

    it('Positive: filters reports by threat level', async () => {
      const filtered = await conflictService.getAllReports({
        threatLevel: THREAT_LEVELS.HIGH,
      });
      expect(filtered.every((r) => r.threatLevel === THREAT_LEVELS.HIGH)).toBe(true);
    });

    it('Positive: filters reports by village substring', async () => {
      const filtered = await conflictService.getAllReports({
        village: 'Habarana',
      });
      expect(filtered.every((r) => r.village.includes('Habarana'))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Single Report Retrieval
  // -----------------------------------------------------------------------
  describe('getReportById()', () => {
    it('Positive: retrieves existing report by ID', async () => {
      const report = await conflictService.getReportById('conf-501');
      expect(report).toBeDefined();
      expect(report.id).toBe('conf-501');
      expect(report.village).toBe('Habarana North');
    });

    it('Negative: returns null when report ID is non-existent', async () => {
      const report = await conflictService.getReportById('conf-non-existent');
      expect(report).toBeNull();
    });

    it('Edge: returns null when ID is null/undefined', async () => {
      const report = await conflictService.getReportById(null);
      expect(report).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Ranger Assignment
  // -----------------------------------------------------------------------
  describe('assignRanger()', () => {
    it('Positive: assigns ranger to an existing conflict report', async () => {
      const report = await conflictService.assignRanger('conf-501', {
        rangerName: 'Unit Charlie',
        assignedBy: 'A.M.H.M. Abeykoon',
      });

      expect(report.dispatchedRanger).toBe('Unit Charlie');
      expect(report.status).toBe(REPORT_STATUSES.RANGER_ASSIGNED);
      expect(report.assignedBy).toBe('A.M.H.M. Abeykoon');
      expect(report.assignedAt).toBeDefined();
    });

    it('Negative: throws 404 error if report to assign is not found', async () => {
      await expect(
        conflictService.assignRanger('conf-99999', { rangerName: 'Unit Delta' })
      ).rejects.toThrow('Conflict report with ID conf-99999 not found');
    });

    it('Edge: defaults ranger name when omitted', async () => {
      const report = await conflictService.assignRanger('conf-501', {});
      expect(report.dispatchedRanger).toBe('Ranger Unit Alpha');
    });
  });

  // -----------------------------------------------------------------------
  // Manual Triage
  // -----------------------------------------------------------------------
  describe('triageReport()', () => {
    it('Positive: updates threat severity, status, and triage notes', async () => {
      const updated = await conflictService.triageReport('conf-501', {
        threatLevel: THREAT_LEVELS.CRITICAL,
        status: REPORT_STATUSES.TRIAGED,
        triageNotes: 'Escalated following thermal drone confirmation',
        triagedBy: 'Chief Wildlife Officer',
      });

      expect(updated.threatLevel).toBe(THREAT_LEVELS.CRITICAL);
      expect(updated.status).toBe(REPORT_STATUSES.TRIAGED);
      expect(updated.triageNotes).toBe('Escalated following thermal drone confirmation');
      expect(updated.triagedBy).toBe('Chief Wildlife Officer');
      expect(updated.triagedAt).toBeDefined();
    });

    it('Negative: throws 404 error if report to triage is not found', async () => {
      await expect(
        conflictService.triageReport('conf-unknown', { threatLevel: 'Low' })
      ).rejects.toThrow('Conflict report with ID conf-unknown not found');
    });
  });
});
