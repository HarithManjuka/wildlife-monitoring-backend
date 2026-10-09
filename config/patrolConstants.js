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
  { id: 'route-1a', name: 'Yala Block 1: Palatupana to Menik Ganga Basin', sector: 'Block 1 (Ruhuna)', targetDistanceKm: 9.2, description: 'Main coastal plain safari sector monitoring leopard trails and riverine crossing points.' },
  { id: 'route-2b', name: 'Yala Block 1: Patanangala Coastline & Buthawa Tank', sector: 'Block 1 (Coastal)', targetDistanceKm: 11.5, description: 'Coastal electric fence perimeter, waterhole monitoring, and marine turtle beach protection.' },
  { id: 'route-3c', name: 'Yala Block 2: Kumbukkan Oya Boundary & Strict Reserve', sector: 'Block 2 (Strict Reserve)', targetDistanceKm: 14.0, description: 'Dense wilderness riverbank boundary monitoring bordering Kumana National Park.' },
  { id: 'route-4d', name: 'Yala Block 3: Sithulpawwa Sanctuary & Monastic Corridor', sector: 'Block 3 (Sithulpawwa)', targetDistanceKm: 8.4, description: 'Ancient rocky monastery corridor and elephant movement buffer towards Katagamuwa Sanctuary.' },
  { id: 'route-5e', name: 'Yala Block 5: Lunugamvehera Elephant Migration Corridor', sector: 'Block 5 (Corridor)', targetDistanceKm: 12.8, description: 'High-risk human-elephant conflict boundary fence monitoring connecting to Weerawila.' },
];

module.exports = {
  PATROL_STATUSES,
  INCIDENT_TYPES,
  INCIDENT_SEVERITY,
  SYNC_STATUSES,
  PREDEFINED_ROUTES,
};
