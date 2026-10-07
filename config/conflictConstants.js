/**
 * UC-03 Community Conflict Triage - Operational Constants & Configuration
 * Eliminates magic numbers across conflict processing, duplicate detection, and threat analysis.
 */

// Duplicate detection window in minutes (configurable via process.env)
const DUPLICATE_WINDOW_MINUTES =
  parseInt(process.env.DUPLICATE_WINDOW_MINUTES, 10) || 30;

// Threat severity categories
const THREAT_LEVELS = Object.freeze({
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
  PENDING: 'Pending Triage',
});

// Lifecycle status states for community reports
const REPORT_STATUSES = Object.freeze({
  PENDING_TRIAGE: 'Pending Triage',
  PENDING_DISPATCH: 'Pending Dispatch',
  TRIAGED: 'Triaged',
  RANGER_ASSIGNED: 'Ranger Assigned',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
});

// Ingestion channels
const REPORT_SOURCES = Object.freeze({
  SMS_GATEWAY: 'SMS Gateway',
  COMMUNITY_HOTLINE: 'Community Hotline',
  MOBILE_APP: 'Mobile App',
  MANUAL_ENTRY: 'Manual Entry',
});

// Domain keyword patterns for automated NLP threat classification
const THREAT_KEYWORD_RULES = Object.freeze({
  CRITICAL: [
    'attack',
    'injured',
    'injury',
    'casualty',
    'stampede',
    'trampled',
    'charging',
    'home damaged',
    'house damage',
    'destroyed home',
    'life threatening',
  ],
  HIGH: [
    'bull',
    'lone bull',
    'aggressive',
    'home garden',
    'residential',
    'compound',
    'village center',
    'school',
    'kitchen',
    'breaking fence',
    'encroaching',
    'near house',
  ],
  MEDIUM: [
    'herd',
    'crossing',
    'paddy',
    'crop',
    'cultivation',
    'field',
    'farmland',
    'fence',
    'railway',
    'road',
  ],
  LOW: [
    'distant',
    'forest edge',
    'tracks',
    'footprint',
    'dung',
    'sighting',
    'peaceful',
    'grazing',
    'jungle boundary',
  ],
});

// Known village geospatial anchor coordinates (Sri Lanka wildlife corridors)
const VILLAGE_COORDINATES = Object.freeze({
  'Habarana North': { latitude: 8.0338, longitude: 80.7512 },
  'Habarana South': { latitude: 8.0125, longitude: 80.742 },
  'Minneriya East': { latitude: 8.0514, longitude: 80.8931 },
  'Sigiriya West': { latitude: 7.9542, longitude: 80.7389 },
  'Dambulla Corridor': { latitude: 7.8731, longitude: 80.6517 },
  'Polonnaruwa Border': { latitude: 7.9403, longitude: 81.0188 },
  'Wilpattu Buffer': { latitude: 8.4521, longitude: 80.0154 },
});

module.exports = {
  DUPLICATE_WINDOW_MINUTES,
  THREAT_LEVELS,
  REPORT_STATUSES,
  REPORT_SOURCES,
  THREAT_KEYWORD_RULES,
  VILLAGE_COORDINATES,
};
