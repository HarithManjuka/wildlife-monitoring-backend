const analyticsService = require('../services/analyticsService');

describe('UC-04: Park Manager Conservation Analytics & Report Generation Unit Tests', () => {

  describe('1. Positive Tests (Happy Path)', () => {
    test('generateReport should return structured analytical report for INCIDENT_ANALYSIS', async () => {
      const criteria = {
        reportType: 'INCIDENT_ANALYSIS',
        park: 'Yala National Park',
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
        incidentType: 'ALL',
        severity: 'ALL'
      };

      const report = await analyticsService.generateReport(criteria, { id: 'manager-01', name: 'Park Manager' });

      expect(report).toBeDefined();
      expect(report.reportId).toBeDefined();
      expect(report.reportType).toBe('INCIDENT_ANALYSIS');
      expect(typeof report.totalIncidents).toBe('number');
      expect(Array.isArray(report.hotspots)).toBe(true);
      expect(report.patrolCoverage).toBeDefined();
    });

    test('generateReport should calculate correct patrol coverage metrics for PATROL_COVERAGE report type', async () => {
      const criteria = {
        reportType: 'PATROL_COVERAGE',
        park: 'ALL',
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31'
      };

      const report = await analyticsService.generateReport(criteria, { id: 'manager-admin' });
      
      expect(report.patrolCoverage).toBeDefined();
      expect(typeof report.patrolCoverage.coverageScore).toBe('number');
      expect(report.patrolCoverage.coverageScore).toBeGreaterThanOrEqual(0);
      expect(report.patrolCoverage.coverageScore).toBeLessThanOrEqual(100);
      expect(report.patrolCoverage.coverageScore + report.patrolCoverage.coverageGap).toBe(100);
    });

    test('exportReport should export CSV format correctly', async () => {
      const criteria = {
        reportType: 'INCIDENT_ANALYSIS',
        park: 'Yala National Park'
      };
      const report = await analyticsService.generateReport(criteria, { id: 'manager-01' });

      const exportResult = await analyticsService.exportReport(report, 'CSV', {}, { id: 'manager-01' });

      expect(exportResult).toBeDefined();
      expect(exportResult.success).toBe(true);
      expect(exportResult.mimeType).toBe('text/csv');
      expect(exportResult.filename).toContain('.csv');
      expect(typeof exportResult.fileContent).toBe('string');
    });

    test('exportReport should export PDF format correctly', async () => {
      const criteria = {
        reportType: 'INCIDENT_ANALYSIS',
        park: 'Yala National Park'
      };
      const report = await analyticsService.generateReport(criteria, { id: 'manager-01' });

      const exportResult = await analyticsService.exportReport(report, 'PDF', {}, { id: 'manager-01' });

      expect(exportResult).toBeDefined();
      expect(exportResult.success).toBe(true);
      expect(exportResult.mimeType).toBe('application/pdf');
      expect(exportResult.filename).toContain('.pdf');
      expect(exportResult.fileContent).toBeDefined();
    });
  });

  describe('2. Negative Tests (Sad Path / Validation)', () => {
    test('validateFilters should throw an error when dateFrom is after dateTo (Invalid Date Range)', async () => {
      const invalidCriteria = {
        reportType: 'INCIDENT_ANALYSIS',
        dateFrom: '2025-12-31',
        dateTo: '2025-01-01'
      };

      await expect(
        analyticsService.generateReport(invalidCriteria, { id: 'manager-01' })
      ).rejects.toThrow(/Invalid date range/i);
    });

    test('validateFilters should throw an error for unrecognized reportType', async () => {
      const invalidCriteria = {
        reportType: 'INVALID_UNKNOWN_TYPE',
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31'
      };

      await expect(
        analyticsService.generateReport(invalidCriteria, { id: 'manager-01' })
      ).rejects.toThrow(/Invalid report type/i);
    });

    test('exportReport should offer CSV fallback when PDF rendering times out (Exception Flow E2)', async () => {
      const mockReport = { reportId: 'REP-TEST', reportType: 'INCIDENT_ANALYSIS', totalIncidents: 0 };
      const result = await analyticsService.exportReport(mockReport, 'PDF', { simulateError: true });

      expect(result.success).toBe(false);
      expect(result.offerCSVFallback).toBe(true);
      expect(result.error).toContain('PDF rendering engine timeout');
    });
  });

  describe('3. Boundary & Edge Case Tests', () => {
    test('calculateStatistics should handle empty incidents array safely (0 boundary)', async () => {
      const emptyCriteria = {
        reportType: 'INCIDENT_ANALYSIS',
        park: 'NonExistentPark_BoundaryTest',
        dateFrom: '1970-01-01',
        dateTo: '1970-01-02'
      };

      const report = await analyticsService.generateReport(emptyCriteria, { id: 'manager-01' });

      expect(report.totalIncidents).toBe(0);
      expect(report.status).toBe('LIMITED_DATA');
      expect(report.warning).toContain('Limited data');
    });

    test('coverageScore boundary should stay strictly between 0 and 100 inclusive', async () => {
      const criteria = { reportType: 'PATROL_COVERAGE' };
      const report = await analyticsService.generateReport(criteria, { id: 'manager-01' });
      const score = report.patrolCoverage.coverageScore;

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(score + report.patrolCoverage.coverageGap).toBe(100);
    });
  });

  describe('4. Equivalence Partitioning Tests', () => {
    test.each([
      ['LOW'],
      ['MEDIUM'],
      ['HIGH'],
      ['CRITICAL']
    ])('should process severity equivalence partition: %s correctly', async (severityLevel) => {
      const criteria = {
        reportType: 'INCIDENT_ANALYSIS',
        severity: severityLevel
      };
      const report = await analyticsService.generateReport(criteria, { id: 'manager-01' });
      expect(report).toBeDefined();
      expect(report.reportId).toBeDefined();
      expect(report.reportType).toBe('INCIDENT_ANALYSIS');
    });
  });

  describe('5. Determinism Tests', () => {
    test('generateReport should produce deterministic invariant metrics for identical input criteria', async () => {
      const fixedCriteria = {
        reportType: 'INCIDENT_ANALYSIS',
        park: 'Yala National Park',
        dateFrom: '2025-05-01',
        dateTo: '2025-05-31'
      };

      const run1 = await analyticsService.generateReport(fixedCriteria, { id: 'test-mgr' });
      const run2 = await analyticsService.generateReport(fixedCriteria, { id: 'test-mgr' });

      expect(run1.totalIncidents).toBe(run2.totalIncidents);
      expect(run1.reportType).toBe(run2.reportType);
      expect(run1.patrolCoverage.coverageScore).toBe(run2.patrolCoverage.coverageScore);
    });
  });
});
