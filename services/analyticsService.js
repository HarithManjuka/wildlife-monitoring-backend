const axios = require('axios');
const conflictService = require('./conflictService');
const auditService = require('./auditService');
const { getExportFormatter } = require('./exporters');

const PORT = process.env.PORT || 7050;
const PEER_BASE_URL = `http://localhost:${PORT}/api`;

/**
 * IncidentRepository — fetches patrol log incidents 
 */
class Incident {
  constructor(data) {
    this.id = data.id || `inc-${Math.random().toString(36).substring(2, 7)}`;
    this.type = data.type || data.incidentType || 'General Sighting';
    this.severity = (data.severity || 'LOW').toUpperCase();
    this.location = data.location || data.area || 'General Sector';
    this.park = data.park || 'General Reserve';
    this.species = data.species || 'Wildlife';
    this.loggedAt = new Date(data.loggedAt || data.reportedAt || data.createdAt || Date.now());
    this.ranger = data.ranger || data.reportedBy || 'Field Ranger';
  }

  isHighRisk() {
    return this.severity === 'HIGH' || this.severity === 'CRITICAL';
  }

  isWithinPeriod(from, to) {
    if (!from && !to) return true;
    const time = this.loggedAt.getTime();
    const fromTime = from ? new Date(from).getTime() : 0;
    const toTime = to ? new Date(to).setHours(23, 59, 59, 999) : Infinity;
    return time >= fromTime && time <= toTime;
  }

  matchesFilters(criteria) {
    if (criteria.park && criteria.park !== 'ALL' && this.park !== criteria.park && this.park !== 'General Reserve') return false;
    if (criteria.incidentType && criteria.incidentType !== 'ALL' && this.type !== criteria.incidentType) return false;
    if (criteria.severity && criteria.severity !== 'ALL' && this.severity !== criteria.severity) return false;
    if (criteria.species && criteria.species !== 'ALL' && this.species !== criteria.species) return false;
    if (criteria.zone && criteria.zone !== 'ALL' && this.location !== criteria.zone) return false;
    return this.isWithinPeriod(criteria.dateFrom, criteria.dateTo);
  }

  /**
   *queryIncidents(criteria) from DataStore
   */
  static async fetchIncidents(criteria) {
    const rawRecords = await DataStore.queryIncidents(criteria);
    return rawRecords.map((r) => new Incident(r)).filter((inc) => inc.matchesFilters(criteria));
  }
}

class Patrol {
  constructor(data) {
    this.id = data.id || `patrol-${Math.random().toString(36).substring(2, 7)}`;
    this.ranger = data.ranger || 'Field Ranger';
    this.area = data.area || data.zone || 'General Sector';
    this.park = data.park || 'General Reserve';
    this.status = data.status || 'Completed';
    this.loggedAt = new Date(data.loggedAt || Date.now());
  }

  isWithinPeriod(from, to) {
    if (!from && !to) return true;
    const time = this.loggedAt.getTime();
    const fromTime = from ? new Date(from).getTime() : 0;
    const toTime = to ? new Date(to).setHours(23, 59, 59, 999) : Infinity;
    return time >= fromTime && time <= toTime;
  }

  /**
   * queryPatrols(criteria) from DataStore
   */
  static async fetchPatrols(criteria) {
    const rawRecords = await DataStore.queryPatrols(criteria);
    return rawRecords.map((r) => new Patrol(r)).filter((p) => {
      const parkMatch = !criteria.park || criteria.park === 'ALL' || p.park === criteria.park || p.park === 'General Reserve';
      return parkMatch && p.isWithinPeriod(criteria.dateFrom, criteria.dateTo);
    });
  }
}

class Alert {
  constructor(data) {
    this.id = data.id || `alt-${Math.random().toString(36).substring(2, 7)}`;
    this.collarId = data.collarId || 'GPS-Collar';
    this.severity = (data.severity || 'MEDIUM').toUpperCase();
    this.zone = data.zone || data.location || 'Buffer Zone';
    this.park = data.park || 'General Reserve';
    this.triggeredAt = new Date(data.triggeredAt || Date.now());
  }

  isCriticalBreach() {
    return this.severity === 'HIGH' || this.severity === 'CRITICAL';
  }

  isWithinPeriod(from, to) {
    if (!from && !to) return true;
    const time = this.triggeredAt.getTime();
    const fromTime = from ? new Date(from).getTime() : 0;
    const toTime = to ? new Date(to).setHours(23, 59, 59, 999) : Infinity;
    return time >= fromTime && time <= toTime;
  }

  /**
   *queryAlerts(criteria) from DataStore
   */
  static async fetchAlerts(criteria) {
    const rawRecords = await DataStore.queryAlerts(criteria);
    return rawRecords.map((r) => new Alert(r)).filter((a) => {
      const parkMatch = !criteria.park || criteria.park === 'ALL' || a.park === criteria.park;
      return parkMatch && a.isWithinPeriod(criteria.dateFrom, criteria.dateTo);
    });
  }
}


// DataStore
const DataStore = {
  /**
   * Queries Patrol & Incident module (/api/patrols)
   */
  async queryIncidents(criteria = {}) {
    try {
      const res = await axios.get(`${PEER_BASE_URL}/patrols`, { timeout: 3000 });
      const items = res.data.items || res.data.incidents || [];
      return items.map((raw, idx) => ({
        id: raw.id || `inc-${idx + 1}`,
        type: raw.type || raw.incidentType || 'General Sighting',
        severity: (raw.severity || 'LOW').toUpperCase(),
        location: raw.area || raw.location || 'General Sector',
        park: raw.park || (criteria.park && criteria.park !== 'ALL' ? criteria.park : 'General Reserve'),
        species: raw.species || 'Wildlife',
        loggedAt: raw.loggedAt || raw.createdAt || new Date().toISOString(),
        ranger: raw.ranger || 'Field Ranger',
      }));
    } catch {
      return [];
    }
  },

  /**
   * Queries Patrol Route module (/api/patrols)
   */
  async queryPatrols(criteria = {}) {
    try {
      const res = await axios.get(`${PEER_BASE_URL}/patrols`, { timeout: 3000 });
      const items = res.data.items || [];
      return items.map((raw, idx) => ({
        id: raw.id || `patrol-${idx + 1}`,
        ranger: raw.ranger || 'Field Ranger',
        area: raw.area || raw.zone || 'General Sector',
        park: raw.park || (criteria.park && criteria.park !== 'ALL' ? criteria.park : 'General Reserve'),
        status: raw.status || 'Completed',
        loggedAt: raw.loggedAt || new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  },

  /**
   *  GPS Collar Alerts (/api/alerts)
   * Ingests live telemetry breaches from Sensor Dispatcher
   */
  async queryAlerts(criteria = {}) {
    try {
      const res = await axios.get(`${PEER_BASE_URL}/alerts`, { timeout: 3000 });
      const alerts = res.data.alerts || [];
      return alerts.map((raw, idx) => ({
        id: raw.id || `alt-${idx + 1}`,
        collarId: raw.collarId || 'GPS-Collar',
        severity: (raw.severity || 'MEDIUM').toUpperCase(),
        zone: raw.zone || raw.location || 'Buffer Zone',
        park: raw.park || (criteria.park && criteria.park !== 'ALL' ? criteria.park : 'General Reserve'),
        triggeredAt: raw.triggeredAt || new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  },

  /**
   * Queries Community Conflict Queue 
   */
  async queryCommunityQueue(filters = {}) {
    try {
      const reports = await conflictService.getAllReports(filters);
      return (reports || []).map((r) => ({
        id: r.id || r._id,
        reportedAt: r.reportedAt || r.createdAt || new Date().toISOString(),
        type: r.conflictType ? r.conflictType.replace(/_/g, ' ') : 'Human-Wildlife Conflict',
        location: r.locationDescription || r.village || 'Habarana North',
        threatLevel: (r.threatLevel || 'MEDIUM').toUpperCase(),
        status: (r.status || 'PENDING').toUpperCase(),
        source: r.source || 'SMS_GATEWAY',
        description: r.description || 'Field report submitted via community SMS gateway.',
      }));
    } catch {
      return [];
    }
  },
};


// Statistics Calculator
const StatisticsCalculator = {
  calculateStatistics(incidents, patrols, alerts) {
    const countByType = incidents.reduce((acc, inc) => {
      acc[inc.type] = (acc[inc.type] || 0) + 1;
      return acc;
    }, {});

    const ALL_ZONES = [
      'Boundary Fence North',
      'Zone B - River Crossing',
      'Central Plains',
      'Buffer Zone West',
      'Southern Ridge Corridor',
    ];

    const coveredZoneCounts = {};
    ALL_ZONES.forEach((z) => (coveredZoneCounts[z] = 0));
    patrols.forEach((p) => {
      if (coveredZoneCounts[p.area] !== undefined) {
        coveredZoneCounts[p.area] += 1;
      }
    });

    const coveredZones = Object.values(coveredZoneCounts).filter((c) => c > 0).length;
    const coverageScore = Math.round((coveredZones / ALL_ZONES.length) * 100);

    return {
      totalIncidents: incidents.length,
      highRiskIncidents: incidents.filter((i) => i.isHighRisk()).length,
      byType: countByType,
      patrolCoverage: {
        coverageScore,
        coverageGap: 100 - coverageScore,
        zones: ALL_ZONES.map((name) => ({
          name,
          patrols: coveredZoneCounts[name] || 0,
        })),
      },
      activeAlertsCount: alerts.filter((a) => a.isCriticalBreach()).length,
    };
  },

  identifyHotspots(incidents) {
    const map = {};
    incidents.forEach((inc) => {
      if (!map[inc.location]) {
        map[inc.location] = { location: inc.location, count: 0, criticalCount: 0 };
      }
      map[inc.location].count += 1;
      if (inc.isHighRisk()) {
        map[inc.location].criticalCount += 1;
      }
    });

    const maxCount = Math.max(...Object.values(map).map((m) => m.count), 1);

    return Object.values(map)
      .map((item) => ({
        location: item.location,
        count: item.count,
        severity: item.criticalCount >= 2 || item.count >= 4 ? 'CRITICAL' : item.count >= 3 ? 'HIGH' : item.count >= 2 ? 'MEDIUM' : 'LOW',
        density: Math.min(Number((item.count / maxCount).toFixed(2)), 1),
      }))
      .sort((a, b) => b.count - a.count);
  },
};

const ChartGenerator = {
  generateCharts(incidents, alerts, criteria) {
    const from = criteria.dateFrom ? new Date(criteria.dateFrom) : new Date(Date.now() - 30 * 86400000);
    const to = criteria.dateTo ? new Date(criteria.dateTo) : new Date();
    const weeks = [];
    let cursor = new Date(from);

    while (cursor <= to) {
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const label = cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const incCount = incidents.filter((i) => i.loggedAt >= cursor && i.loggedAt <= weekEnd).length;
      const alertCount = alerts.filter((a) => a.triggeredAt >= cursor && a.triggeredAt <= weekEnd).length;

      weeks.push({
        week: label,
        incidents: incCount,
        alerts: alertCount,
      });

      cursor.setDate(cursor.getDate() + 7);
    }

    return {
      trendSeries: weeks,
    };
  },
};


// Report Strategy Pattern 

class IncidentAnalysisStrategy {
  async execute(criteria, incidentList, patrolList, alertList) {
    const statisticsDTO = StatisticsCalculator.calculateStatistics(incidentList, patrolList, alertList);
    const hotspotData = StatisticsCalculator.identifyHotspots(incidentList);
    const chartData = ChartGenerator.generateCharts(incidentList, alertList, criteria);

    return {
      reportType: 'INCIDENT_ANALYSIS',
      statisticsDTO,
      hotspotData,
      chartData,
      patrolCoverage: statisticsDTO.patrolCoverage,
      recentIncidents: incidentList.map((inc) => ({
        id: inc.id,
        date: inc.loggedAt.toISOString().slice(0, 10),
        type: inc.type,
        location: inc.location,
        severity: inc.severity,
        ranger: inc.ranger,
      })),
    };
  }
}

class PatrolCoverageStrategy {
  async execute(criteria, incidentList, patrolList, alertList) {
    const statisticsDTO = StatisticsCalculator.calculateStatistics(incidentList, patrolList, alertList);
    const hotspotData = StatisticsCalculator.identifyHotspots(incidentList);
    const chartData = ChartGenerator.generateCharts(incidentList, alertList, criteria);

    return {
      reportType: 'PATROL_COVERAGE',
      statisticsDTO,
      hotspotData,
      chartData,
      patrolCoverage: statisticsDTO.patrolCoverage,
      recentIncidents: incidentList.map((inc) => ({
        id: inc.id,
        date: inc.loggedAt.toISOString().slice(0, 10),
        type: inc.type,
        location: inc.location,
        severity: inc.severity,
        ranger: inc.ranger,
      })),
    };
  }
}

class HumanWildlifeConflictStrategy {
  async execute(criteria, incidentList, patrolList, alertList) {
    const communityQueue = await DataStore.queryCommunityQueue({ park: criteria.park });
    const conflictIncidents = incidentList.filter(
      (i) => i.type === 'Wildlife Sighting' || i.type === 'Animal Carcass'
    );

    const statisticsDTO = StatisticsCalculator.calculateStatistics(conflictIncidents, patrolList, alertList);
    const hotspotData = StatisticsCalculator.identifyHotspots(conflictIncidents);
    const chartData = ChartGenerator.generateCharts(conflictIncidents, alertList, criteria);

    return {
      reportType: 'HUMAN_WILDLIFE_CONFLICT',
      statisticsDTO: {
        ...statisticsDTO,
        totalConflicts: communityQueue.length + conflictIncidents.length,
        geofenceBreaches: alertList.filter((a) => a.isCriticalBreach()).length,
      },
      hotspotData,
      chartData,
      patrolCoverage: statisticsDTO.patrolCoverage,
      recentIncidents: communityQueue.map((q) => ({
        id: q.id,
        date: q.reportedAt.slice(0, 10),
        type: q.type,
        location: q.location,
        severity: q.threatLevel,
        ranger: 'Community SMS Gateway',
      })),
    };
  }
}

const STRATEGY_REGISTRY = {
  INCIDENT_ANALYSIS: new IncidentAnalysisStrategy(),
  PATROL_COVERAGE: new PatrolCoverageStrategy(),
  HUMAN_WILDLIFE_CONFLICT: new HumanWildlifeConflictStrategy(),
};


// ReportingEngine 
class ReportingEngine {
  /**
   * Retrieves available filter options
   */
  getFilterOptions() {
    return {
      parks: ['Yala National Park', 'Wilpattu National Park', 'Udawalawe National Park', 'Horton Plains'],
      reportTypes: [
        { id: 'INCIDENT_ANALYSIS', name: 'Incident Analysis' },
        { id: 'PATROL_COVERAGE', name: 'Patrol Coverage' },
        { id: 'HUMAN_WILDLIFE_CONFLICT', name: 'Human-Wildlife Conflict' },
      ],
      incidentTypes: ['ALL', 'Poaching', 'Animal Carcass', 'Snare', 'Illegal Campsite', 'Wildlife Sighting', 'Other'],
      severities: ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      zones: ['ALL', 'Boundary Fence North', 'Zone B - River Crossing', 'Central Plains', 'Buffer Zone West', 'Southern Ridge Corridor'],
      species: ['ALL', 'Asian Elephant', 'Sri Lankan Leopard', 'Sloth Bear', 'Spotted Deer', 'Wild Boar'],
    };
  }

  /**
   * Validates criteria parameters
   * Handles Exception Flow: Invalid Date Range
   */
  validateFilters(criteria) {
    if (!criteria) {
      return { valid: false, error: 'Report parameters are required.' };
    }

    if (criteria.dateFrom && criteria.dateTo) {
      const from = new Date(criteria.dateFrom);
      const to = new Date(criteria.dateTo);
      if (to < from) {
        return {
          valid: false,
          error: 'Invalid date range: End date cannot be before start date. Please select a valid range.',
        };
      }
    }

    if (!criteria.reportType || !STRATEGY_REGISTRY[criteria.reportType]) {
      return {
        valid: false,
        error: `Invalid report type: '${criteria.reportType}'. Supported types are Incident Analysis, Patrol Coverage, or Human-Wildlife Conflict.`,
      };
    }

    return { valid: true };
  }

  //Report generatrer
  async generateReport(criteria, user = {}) {
    //  Validate
    const validation = this.validateFilters(criteria);
    if (!validation.valid) {
      const err = new Error(validation.error);
      err.statusCode = 400;
      throw err;
    }

    const reportId = `REP-${Date.now().toString().slice(-6)}`;

    //  Parallel Fetching
    const [incidentList, patrolList, alertList] = await Promise.all([
      Incident.fetchIncidents(criteria),
      Patrol.fetchPatrols(criteria),
      Alert.fetchAlerts(criteria),
    ]);

    // 3. Strategy execution
    const strategy = STRATEGY_REGISTRY[criteria.reportType];
    const generated = await strategy.execute(criteria, incidentList, patrolList, alertList);

    //  [Insufficient data] vs [Sufficient data] 
    const isInsufficient = incidentList.length === 0;
    const warning = isInsufficient
      ? 'Limited data: No incidents recorded for selected criteria. Suggest expanding date range or adjusting filters.'
      : null;

    const reportPayload = {
      reportId,
      reportType: criteria.reportType,
      criteria,
      userName: user?.name || 'Park Manager',
      status: isInsufficient ? 'LIMITED_DATA' : 'SUFFICIENT_DATA',
      warning,
      totalIncidents: generated.statisticsDTO.totalIncidents,
      byType: generated.statisticsDTO.byType,
      trend: generated.chartData.trendSeries,
      hotspots: generated.hotspotData,
      patrolCoverage: generated.patrolCoverage,
      recentIncidents: generated.recentIncidents,
      generatedAt: new Date().toISOString(),
    };

    //  Audit Logging via :AuditService (logReportGeneration -> persistAuditRecord)
    const auditStatus = await auditService.logReportGeneration({
      userId: user.userId || 'USR-8824',
      userName: user.name || 'Park Manager',
      reportId,
      reportType: criteria.reportType,
      criteria,
      status: isInsufficient ? 'LIMITED_DATA' : 'SUCCESS',
      recordCount: incidentList.length,
    });

    reportPayload.audit = auditStatus;

    return reportPayload;
  }

  /**
   * Export report handler
   * Handles alt [PDF fails] -> offers CSV fallback
   */
  async exportReport(payload, format = 'CSV', options = {}, user = {}) {
    const fmt = format.toUpperCase();

    // Exception: Rendering failure simulation
    if (fmt === 'PDF' && options.simulateError) {
      return {
        success: false,
        error: 'Export failed: PDF rendering engine timeout. You can retry or choose CSV format.',
        offerCSVFallback: true,
      };
    }

    // Format document structure using dedicated exporter files
    const formatter = getExportFormatter(fmt);
    const { mimeType, extension, content: fileContent } = formatter(payload, user);
    const filename = `report_${payload?.reportId || 'analytics'}_${Date.now()}${extension}`;

    // Audit log the export activity
    await auditService.logReportGeneration({
      userId: user.userId || 'USR-8824',
      userName: user.name || 'Park Manager',
      reportId: payload?.reportId || 'EXPORT',
      reportType: payload?.reportType || 'EXPORT',
      criteria: { format: fmt },
      status: 'SUCCESS',
      recordCount: payload?.totalIncidents || 0,
    });

    return {
      success: true,
      format: fmt,
      filename,
      mimeType,
      fileContent,
    };
  }

  /**
   * Summary card telemetry for landing page
   */
  async getDashboardSummary(park = 'ALL') {
    const [incidents, alerts, queue, patrols] = await Promise.all([
      DataStore.queryIncidents({ park }),
      DataStore.queryAlerts({ park }),
      DataStore.queryCommunityQueue({ park }),
      DataStore.queryPatrols({ park }),
    ]);

    const coverage = StatisticsCalculator.calculateStatistics(
      incidents.map((i) => new Incident(i)),
      patrols.map((p) => new Patrol(p)),
      alerts.map((a) => new Alert(a))
    );

    const hotspots = StatisticsCalculator.identifyHotspots(incidents.map((i) => new Incident(i)));

    return {
      totalIncidents: incidents.length,
      patrolCoverage: coverage.patrolCoverage.coverageScore,
      humanWildlifeConflicts: queue.length,
      activeAlerts: alerts.filter((a) => a.severity === 'HIGH' || a.severity === 'CRITICAL').length,
      activeHotspots: hotspots.filter((h) => h.severity === 'CRITICAL' || h.severity === 'HIGH').length,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves community conflict reports for Park Manager
   */
  async getCommunityQueue(filters = {}) {
    return DataStore.queryCommunityQueue(filters);
  }
}

module.exports = new ReportingEngine();
