const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

/**
 * IncidentRepository — fetches patrol log incidents 
 */
const IncidentRepository = {
  async findByPeriod(park, dateFrom, dateTo) {
    try {
      const res = await axios.get(`${BASE_URL}/patrols`, {
        params: { park, dateFrom, dateTo },
        timeout: 3000,
      });
      return res.data.items || res.data.incidents || [];
    } catch {
      return [];
    }
  },
};

/**
 * AlertRepository — fetches GPS collar / geofence alerts
 */
const AlertRepository = {
  async findByPeriod(park, dateFrom, dateTo) {
    try {
      const res = await axios.get(`${BASE_URL}/alerts`, {
        params: { park, dateFrom, dateTo },
        timeout: 3000,
      });
      return res.data.alerts || [];
    } catch {
      return [];
    }
  },
};

/**
 * CommunityReportRepository — fetches SMS/community conflict reports 
 */
const CommunityReportRepository = {
  async findQueue(filters) {
    try {
      const res = await axios.get(`${BASE_URL}/conflicts/queue`, {
        params: filters,
        timeout: 3000,
      });
      return res.data.reports || [];
    } catch {
      return [];
    }
  },
};


// Statistics Calculator 

const StatisticsCalculator = {
  countByType(incidents) {
    return incidents.reduce((acc, inc) => {
      const key = inc.type || inc.incidentType || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  },

  buildTrendSeries(incidents, dateFrom, dateTo) {
    // Group incident counts by week within the given range
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const weeks = [];
    let cursor = new Date(from);

    while (cursor <= to) {
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const label = cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const count = incidents.filter((inc) => {
        const d = new Date(inc.loggedAt || inc.createdAt || inc.reportedAt || cursor);
        return d >= cursor && d <= weekEnd;
      }).length;
      weeks.push({ week: label, incidents: count });
      cursor.setDate(cursor.getDate() + 7);
    }
    return weeks;
  },

  computePatrolCoverage(patrols) {
    if (!patrols.length) return { coverageScore: 0, coverageGap: 100, zones: [] };
    const zoneMap = {};
    patrols.forEach((p) => {
      const zone = p.area || p.zone || 'Unknown Zone';
      zoneMap[zone] = (zoneMap[zone] || 0) + 1;
    });
    const totalZones = Object.keys(zoneMap).length;
    const coveredZones = Object.values(zoneMap).filter((c) => c > 0).length;
    const score = totalZones > 0 ? Math.round((coveredZones / totalZones) * 100) : 0;
    return {
      coverageScore: score,
      coverageGap: 100 - score,
      zones: Object.entries(zoneMap).map(([name, count]) => ({ name, patrols: count })),
    };
  },

  identifyHotspots(incidents) {
    const locationMap = {};
    incidents.forEach((inc) => {
      const loc = inc.location || inc.area || 'Unknown';
      if (!locationMap[loc]) locationMap[loc] = { location: loc, count: 0, severity: 'LOW' };
      locationMap[loc].count += 1;
    });
    return Object.values(locationMap)
      .map((h) => ({
        ...h,
        severity: h.count >= 10 ? 'CRITICAL' : h.count >= 6 ? 'HIGH' : h.count >= 3 ? 'MEDIUM' : 'LOW',
        density: Math.min(h.count / 15, 1),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  },
};


// Report Strategy Pattern 

const IncidentAnalysisStrategy = {
  type: 'INCIDENT_ANALYSIS',
  async generate(criteria) {
    const { park, dateFrom, dateTo, incidentType, severity } = criteria;
    const raw = await IncidentRepository.findByPeriod(park, dateFrom, dateTo);

    const filtered = raw.filter((inc) => {
      const typeMatch = !incidentType || incidentType === 'ALL' || inc.type === incidentType;
      const sevMatch = !severity || severity === 'ALL' || inc.severity === severity;
      return typeMatch && sevMatch;
    });

    return {
      reportType: 'INCIDENT_ANALYSIS',
      totalIncidents: filtered.length,
      byType: StatisticsCalculator.countByType(filtered),
      trend: StatisticsCalculator.buildTrendSeries(filtered, dateFrom, dateTo),
      hotspots: StatisticsCalculator.identifyHotspots(filtered),
    };
  },
};

const PatrolCoverageStrategy = {
  type: 'PATROL_COVERAGE',
  async generate(criteria) {
    const { park, dateFrom, dateTo } = criteria;
    const patrols = await IncidentRepository.findByPeriod(park, dateFrom, dateTo);
    return {
      reportType: 'PATROL_COVERAGE',
      totalPatrols: patrols.length,
      ...StatisticsCalculator.computePatrolCoverage(patrols),
    };
  },
};

const HumanWildlifeConflictStrategy = {
  type: 'HUMAN_WILDLIFE_CONFLICT',
  async generate(criteria) {
    const { park, dateFrom, dateTo } = criteria;
    const [incidents, alerts] = await Promise.all([
      IncidentRepository.findByPeriod(park, dateFrom, dateTo),
      AlertRepository.findByPeriod(park, dateFrom, dateTo),
    ]);
    const conflicts = incidents.filter(
      (i) => i.type === 'Human-Wildlife Conflict' || i.category === 'CONFLICT'
    );
    return {
      reportType: 'HUMAN_WILDLIFE_CONFLICT',
      totalConflicts: conflicts.length,
      geofenceBreaches: alerts.length,
      trend: StatisticsCalculator.buildTrendSeries(conflicts, dateFrom, dateTo),
      hotspots: StatisticsCalculator.identifyHotspots(conflicts),
    };
  },
};

// Registry 
const REPORT_STRATEGIES = {
  INCIDENT_ANALYSIS: IncidentAnalysisStrategy,
  PATROL_COVERAGE: PatrolCoverageStrategy,
  HUMAN_WILDLIFE_CONFLICT: HumanWildlifeConflictStrategy,
};

// ReportingEngine 
const ReportingEngine = {
  async generate(criteria) {
    const strategy = REPORT_STRATEGIES[criteria.reportType];
    if (!strategy) {
      throw new Error(`Unknown report type: ${criteria.reportType}`);
    }
    return strategy.generate(criteria);
  },
};

// Public Service API
module.exports = {

  async getDashboardSummary(park) {
    const [incidents, alerts, queue] = await Promise.all([
      IncidentRepository.findByPeriod(park, null, null),
      AlertRepository.findByPeriod(park, null, null),
      CommunityReportRepository.findQueue({ park }),
    ]);

    return {
      totalIncidents: incidents.length,
      activeAlerts: alerts.length,
      communityReports: queue.length,
      activeHotspots: StatisticsCalculator.identifyHotspots(incidents).filter(
        (h) => h.severity === 'HIGH' || h.severity === 'CRITICAL'
      ).length,
      generatedAt: new Date().toISOString(),
    };
  },

  /**
   * Generates a full report using the Strategy pattern.
   * criteria: { park, dateFrom, dateTo, reportType, incidentType, severity }
   */
  async generateReport(criteria) {
    return ReportingEngine.generate(criteria);
  },

  /**
   * Returns the community conflict queue consumed by the Park Manager.
   */
  async getCommunityQueue(filters) {
    return CommunityReportRepository.findQueue(filters);
  },
};
