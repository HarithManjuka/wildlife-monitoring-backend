/**
 * Patrol and Incident Domain Constants (UC-01)
 * Author: M.U. Handaragama (IT23819092)
 */

const PATROL_STATUSES = {
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

const INCIDENT_TYPES = {
  SNARE: 'SNARE',
  POACHING: 'POACHING',
  ANIMAL_CARCASS: 'ANIMAL_CARCASS',
  ILLEGAL_CAMP: 'ILLEGAL_CAMP',
  WILDLIFE_SIGHTING: 'WILDLIFE_SIGHTING',
  OTHER: 'OTHER',
};

const INCIDENT_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

const SYNC_STATUSES = {
  PENDING_SYNC: 'PENDING_SYNC',
  SYNCED: 'SYNCED',
  FAILED: 'FAILED',
};

const PREDEFINED_ROUTES = [
  { id: 'route-1a', name: 'Patrol Route 1A - Eastern River Basin', sector: 'Sector 4', targetDistanceKm: 8.5 },
  { id: 'route-2b', name: 'Patrol Route 2B - Boundary Electric Fence', sector: 'Sector 2', targetDistanceKm: 12.0 },
  { id: 'route-3c', name: 'Patrol Route 3C - Southern Scrub Corridor', sector: 'Sector 7', targetDistanceKm: 6.2 },
  { id: 'route-4d', name: 'Patrol Route 4D - Mountain Ridge Lookout', sector: 'Sector 1', targetDistanceKm: 9.8 },
];

module.exports = {
  PATROL_STATUSES,
  INCIDENT_TYPES,
  INCIDENT_SEVERITY,
  SYNC_STATUSES,
  PREDEFINED_ROUTES,
};
