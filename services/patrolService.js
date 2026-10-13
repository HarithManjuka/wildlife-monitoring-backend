const mongoose = require('mongoose');
const Patrol = require('../models/Patrol');
const Incident = require('../models/Incident');
const {
  PATROL_STATUSES,
  INCIDENT_TYPES,
  INCIDENT_SEVERITY,
  SYNC_STATUSES,
  PREDEFINED_ROUTES,
} = require('../config/patrolConstants');

/**
 * Service Layer: Manage Field Patrol & Report Incidents (UC-01)
 * Author: M.U. Handaragama (IT23819092)
 *
 * Implements:
 * - Start, Waypoint stream, and End Patrol lifecycle
 * - Haversine distance tracking across GPS breadcrumbs
 * - Incident reporting with mandatory field validation (E3)
 * - Manual waypoints capture (A1)
 * - Incident update/editing before lock (A2)
 * - Offline batch synchronization engine (E1 / Sync Queue)
 * - Dual-layer persistence: Mongoose ODM + In-memory mock store
 */

// Haversine formula to compute distance in kilometers between two GPS points
function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // round to 2 decimals
}

const INITIAL_MOCK_PATROLS = [
  {
    id: 'pat-101',
    localId: 'loc-pat-001',
    rangerId: 'USR-8822',
    rangerName: 'M.U. Handaragama',
    routeId: 'route-1a',
    routeName: 'Yala Block 1: Palatupana to Menik Ganga Basin',
    status: PATROL_STATUSES.IN_PROGRESS,
    startTime: new Date(Date.now() - 5400000).toISOString(),
    endTime: null,
    durationMinutes: 90,
    distanceKm: 4.2,
    batteryLevel: 82,
    waypoints: [
      { latitude: 6.4715, longitude: 80.8985, timestamp: new Date(Date.now() - 5400000).toISOString(), accuracyMeters: 4.2, isManual: false, note: '' },
      { latitude: 6.4735, longitude: 80.9015, timestamp: new Date(Date.now() - 3600000).toISOString(), accuracyMeters: 3.8, isManual: false, note: '' },
      { latitude: 6.4760, longitude: 80.9045, timestamp: new Date(Date.now() - 1800000).toISOString(), accuracyMeters: 4.0, isManual: true, note: 'Damaged perimeter wire noticed' },
    ],
    incidentsCount: 1,
    syncStatus: SYNC_STATUSES.SYNCED,
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'pat-100',
    localId: 'loc-pat-000',
    rangerId: 'USR-8822',
    rangerName: 'M.U. Handaragama',
    routeId: 'route-2b',
    routeName: 'Patrol Route 2B - Boundary Electric Fence',
    status: PATROL_STATUSES.COMPLETED,
    startTime: new Date(Date.now() - 86400000).toISOString(),
    endTime: new Date(Date.now() - 72000000).toISOString(),
    durationMinutes: 240,
    distanceKm: 11.8,
    batteryLevel: 45,
    waypoints: [
      { latitude: 6.4500, longitude: 80.8800, timestamp: new Date(Date.now() - 86400000).toISOString(), accuracyMeters: 4.0, isManual: false, note: '' },
      { latitude: 6.4620, longitude: 80.8950, timestamp: new Date(Date.now() - 72000000).toISOString(), accuracyMeters: 3.5, isManual: false, note: '' },
    ],
    incidentsCount: 2,
    syncStatus: SYNC_STATUSES.SYNCED,
    lastSyncedAt: new Date().toISOString(),
  },
];

const INITIAL_MOCK_INCIDENTS = [
  {
    id: 'inc-201',
    localId: 'loc-inc-001',
    patrolId: 'pat-101',
    rangerId: 'USR-8822',
    rangerName: 'M.U. Handaragama',
    incidentType: INCIDENT_TYPES.SNARE,
    severity: INCIDENT_SEVERITY.HIGH,
    coordinates: { latitude: 6.4740, longitude: 80.9020, accuracyMeters: 3.5 },
    landmark: 'Eastern riverbed near old mahogany tree',
    description: 'Single wire snare found on the eastern trail, near the old riverbed. Snare was dismantled.',
    photos: ['https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80'],
    status: 'RESOLVED',
    syncStatus: SYNC_STATUSES.SYNCED,
    reportedAt: new Date(Date.now() - 2400000).toISOString(),
  },
];

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PATROLS_FILE = path.join(DATA_DIR, 'patrols.json');
const INCIDENTS_FILE = path.join(DATA_DIR, 'incidents.json');
const ROUTES_FILE = path.join(DATA_DIR, 'routes.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // ignore
  }
}

function loadFromDisk(file, defaultData) {
  try {
    ensureDataDir();
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback to defaultData
  }
  return defaultData;
}

function saveToDisk(file, data) {
  try {
    ensureDataDir();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch {
    // ignore
  }
}

class PatrolService {
  constructor() {
    this.memoryPatrols = loadFromDisk(PATROLS_FILE, JSON.parse(JSON.stringify(INITIAL_MOCK_PATROLS)));
    this.memoryIncidents = loadFromDisk(INCIDENTS_FILE, JSON.parse(JSON.stringify(INITIAL_MOCK_INCIDENTS)));
    this.customRoutes = loadFromDisk(ROUTES_FILE, []);
    this.activeRangersGps = new Map();
  }

  saveDisk() {
    saveToDisk(PATROLS_FILE, this.memoryPatrols);
    saveToDisk(INCIDENTS_FILE, this.memoryIncidents);
    saveToDisk(ROUTES_FILE, this.customRoutes);
  }

  resetStore() {
    this.memoryPatrols = JSON.parse(JSON.stringify(INITIAL_MOCK_PATROLS));
    this.memoryIncidents = JSON.parse(JSON.stringify(INITIAL_MOCK_INCIDENTS));
    this.customRoutes = [];
    this.activeRangersGps = new Map();
  }

  isMongoConnected() {
    return mongoose.connection.readyState === 1;
  }

  // Predefined and Park Manager added routes
  getAvailableRoutes() {
    return [...PREDEFINED_ROUTES, ...this.customRoutes];
  }

  async createRoute({ name, sector, targetDistanceKm, description = '', riskLevel = 'MEDIUM', createdBy = 'Park Manager' }) {
    if (!name || !name.trim()) {
      const err = new Error('Route name is required');
      err.statusCode = 400;
      throw err;
    }
    const distance = parseFloat(targetDistanceKm);
    if (isNaN(distance) || distance <= 0) {
      const err = new Error('Target distance must be a positive number');
      err.statusCode = 400;
      throw err;
    }

    const routeId = `route-${Date.now().toString().slice(-6)}`;
    const newRoute = {
      id: routeId,
      name: name.trim(),
      sector: (sector && sector.trim()) || 'General Reserve Sector',
      targetDistanceKm: Math.round(distance * 10) / 10,
      description: description ? description.trim() : 'Operational patrol path created by Park Manager',
      riskLevel: riskLevel || 'MEDIUM',
      createdBy: createdBy || 'Park Manager',
      createdAt: new Date().toISOString(),
      isCustom: true,
    };

    this.customRoutes.unshift(newRoute);
    this.saveDisk();
    return newRoute;
  }

  async deleteRoute(routeId) {
    const isPredefined = PREDEFINED_ROUTES.some((r) => r.id === routeId);
    if (isPredefined) {
      const err = new Error('Cannot delete system predefined route');
      err.statusCode = 403;
      throw err;
    }

    const index = this.customRoutes.findIndex((r) => r.id === routeId);
    if (index === -1) {
      const err = new Error(`Route with ID ${routeId} not found`);
      err.statusCode = 404;
      throw err;
    }

    const deleted = this.customRoutes.splice(index, 1)[0];
    this.saveDisk();
    return deleted;
  }

  // ==========================================
  // LIVE GPS SHARING WITH LIAISON OFFICER
  // ==========================================

  shareLiveGps({
    rangerId,
    rangerName,
    latitude,
    longitude,
    accuracyMeters = 5.0,
    batteryLevel = 100,
    routeId = null,
    routeName = null,
    status = 'ON_PATROL',
    note = '',
  }) {
    if (!rangerId || !rangerId.trim()) {
      const err = new Error('Ranger ID is required to share GPS');
      err.statusCode = 400;
      throw err;
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) {
      const err = new Error('Valid latitude and longitude coordinates are required');
      err.statusCode = 400;
      throw err;
    }

    const telemetry = {
      rangerId: rangerId.trim(),
      rangerName: rangerName || 'M.U. Handaragama',
      latitude: lat,
      longitude: lon,
      accuracyMeters: parseFloat(accuracyMeters) || 5.0,
      batteryLevel: Math.max(0, Math.min(100, parseInt(batteryLevel, 10) || 100)),
      routeId: routeId || 'route-1a',
      routeName: routeName || 'Patrol Route 1A - Eastern River Basin',
      status: status || 'ON_PATROL',
      note: note || '',
      lastPing: new Date().toISOString(),
      sharedWith: ['LIAISON_OFFICER', 'PARK_MANAGER'],
    };

    this.activeRangersGps.set(rangerId.trim(), telemetry);
    return telemetry;
  }

  getActiveRangersGps() {
    if (this.activeRangersGps.size === 0) {
      const activePatrols = this.memoryPatrols.filter((p) => p.status === PATROL_STATUSES.IN_PROGRESS);
      for (const p of activePatrols) {
        const latestWp = p.waypoints && p.waypoints.length > 0 ? p.waypoints[p.waypoints.length - 1] : { latitude: 6.4715, longitude: 80.8985, accuracyMeters: 4.2 };
        this.activeRangersGps.set(p.rangerId, {
          rangerId: p.rangerId,
          rangerName: p.rangerName,
          latitude: latestWp.latitude,
          longitude: latestWp.longitude,
          accuracyMeters: latestWp.accuracyMeters || 4.2,
          batteryLevel: p.batteryLevel || 85,
          routeId: p.routeId,
          routeName: p.routeName,
          status: 'ON_PATROL',
          note: `Active on ${p.routeName}`,
          lastPing: latestWp.timestamp || p.startTime || new Date().toISOString(),
          sharedWith: ['LIAISON_OFFICER', 'PARK_MANAGER'],
        });
      }
    }
    return Array.from(this.activeRangersGps.values());
  }

  // ==========================================
  // PATROL LIFECYCLE
  // ==========================================

  async startPatrol({ rangerId, rangerName, routeId, routeName, initialBattery = 100, localId = null }) {
    if (!rangerId || !rangerId.trim()) {
      const err = new Error('Ranger ID is required to start a patrol');
      err.statusCode = 400;
      throw err;
    }

    const availableRoutes = this.getAvailableRoutes();
    const matchedRoute = availableRoutes.find((r) => r.id === routeId) || {
      id: routeId || 'route-custom',
      name: routeName || 'Assigned Custom Patrol Route',
    };

    const newPatrol = {
      id: `pat-${Date.now().toString().slice(-6)}`,
      localId: localId || `loc-pat-${Date.now()}`,
      rangerId: rangerId.trim(),
      rangerName: rangerName || 'Ranger Officer',
      routeId: matchedRoute.id,
      routeName: matchedRoute.name,
      status: PATROL_STATUSES.IN_PROGRESS,
      startTime: new Date().toISOString(),
      endTime: null,
      durationMinutes: 0,
      distanceKm: 0,
      batteryLevel: Math.max(0, Math.min(100, initialBattery)),
      waypoints: [],
      incidentsCount: 0,
      syncStatus: SYNC_STATUSES.SYNCED,
      lastSyncedAt: new Date().toISOString(),
    };

    // Auto-register in live GPS broadcast for Liaison Officer
    this.activeRangersGps.set(newPatrol.rangerId, {
      rangerId: newPatrol.rangerId,
      rangerName: newPatrol.rangerName,
      latitude: 6.4715,
      longitude: 80.8985,
      accuracyMeters: 4.2,
      batteryLevel: newPatrol.batteryLevel,
      routeId: newPatrol.routeId,
      routeName: newPatrol.routeName,
      status: 'ON_PATROL',
      note: `Patrol shift started on ${newPatrol.routeName}`,
      lastPing: new Date().toISOString(),
      sharedWith: ['LIAISON_OFFICER', 'PARK_MANAGER'],
    });

    if (this.isMongoConnected()) {
      try {
        const created = await Patrol.create(newPatrol);
        return created.toObject();
      } catch (e) {
        console.warn('[PatrolService] MongoDB insert failed, falling back to memory:', e.message);
      }
    }

    this.memoryPatrols.unshift(newPatrol);
    this.saveDisk();
    return newPatrol;
  }

  async addWaypoint(patrolId, { latitude, longitude, accuracyMeters = 5.0, isManual = false, note = '' }) {
    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
      const err = new Error('Latitude and Longitude are mandatory for waypoints');
      err.statusCode = 400;
      throw err;
    }

    const latNum = Number(latitude);
    const lonNum = Number(longitude);

    if (isNaN(latNum) || latNum < -90 || latNum > 90 || isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      const err = new Error('Waypoint coordinates are out of valid geographic range');
      err.statusCode = 400;
      throw err;
    }

    const waypoint = {
      latitude: latNum,
      longitude: lonNum,
      timestamp: new Date().toISOString(),
      accuracyMeters: Number(accuracyMeters) || 5.0,
      isManual: Boolean(isManual),
      note: note ? note.trim() : '',
    };

    if (this.isMongoConnected()) {
      const patrolDoc = await Patrol.findOne({ $or: [{ id: patrolId }, { localId: patrolId }] });
      if (patrolDoc) {
        let addedDistance = 0;
        if (patrolDoc.waypoints.length > 0) {
          const lastWp = patrolDoc.waypoints[patrolDoc.waypoints.length - 1];
          addedDistance = calculateHaversineKm(lastWp.latitude, lastWp.longitude, latNum, lonNum);
        }
        patrolDoc.waypoints.push(waypoint);
        patrolDoc.distanceKm = Math.round((patrolDoc.distanceKm + addedDistance) * 100) / 100;
        await patrolDoc.save();
        return patrolDoc.toObject();
      }
    }

    // In-memory fallback
    const patrol = this.memoryPatrols.find((p) => p.id === patrolId || p.localId === patrolId);
    if (!patrol) {
      const err = new Error(`Patrol not found with ID ${patrolId}`);
      err.statusCode = 404;
      throw err;
    }

    if (patrol.status === PATROL_STATUSES.COMPLETED) {
      const err = new Error('Cannot add waypoint to a completed patrol');
      err.statusCode = 400;
      throw err;
    }

    let addedDistance = 0;
    if (patrol.waypoints && patrol.waypoints.length > 0) {
      const lastWp = patrol.waypoints[patrol.waypoints.length - 1];
      addedDistance = calculateHaversineKm(lastWp.latitude, lastWp.longitude, latNum, lonNum);
    }

    patrol.waypoints.push(waypoint);
    patrol.distanceKm = Math.round(((patrol.distanceKm || 0) + addedDistance) * 100) / 100;

    // Automatically sync live GPS telemetry for Liaison Officer
    this.shareLiveGps({
      rangerId: patrol.rangerId,
      rangerName: patrol.rangerName,
      latitude: latNum,
      longitude: lonNum,
      accuracyMeters: waypoint.accuracyMeters,
      batteryLevel: patrol.batteryLevel,
      routeId: patrol.routeId,
      routeName: patrol.routeName,
      status: 'ON_PATROL',
      note: waypoint.note || 'Active GPS waypoint recorded',
    });

    this.saveDisk();
    return patrol;
  }

  async endPatrol(patrolId, { batteryLevel = 80, summaryNotes = '' } = {}) {
    const endTime = new Date().toISOString();

    if (this.isMongoConnected()) {
      const doc = await Patrol.findOne({ $or: [{ id: patrolId }, { localId: patrolId }] });
      if (doc) {
        const startMs = new Date(doc.startTime).getTime();
        const endMs = new Date(endTime).getTime();
        const durationMins = Math.max(1, Math.round((endMs - startMs) / 60000));

        doc.status = PATROL_STATUSES.COMPLETED;
        doc.endTime = endTime;
        doc.durationMinutes = durationMins;
        if (batteryLevel !== undefined) doc.batteryLevel = batteryLevel;
        await doc.save();
        this.activeRangersGps.delete(doc.rangerId);
        return doc.toObject();
      }
    }

    const patrol = this.memoryPatrols.find((p) => p.id === patrolId || p.localId === patrolId);
    if (!patrol) {
      const err = new Error(`Patrol not found with ID ${patrolId}`);
      err.statusCode = 404;
      throw err;
    }

    const startMs = new Date(patrol.startTime).getTime();
    const endMs = new Date(endTime).getTime();
    const durationMins = Math.max(1, Math.round((endMs - startMs) / 60000));

    patrol.status = PATROL_STATUSES.COMPLETED;
    patrol.endTime = endTime;
    patrol.durationMinutes = durationMins;
    if (batteryLevel !== undefined) patrol.batteryLevel = batteryLevel;
    if (summaryNotes) patrol.summaryNotes = summaryNotes.trim();

    // Remove from active rangers GPS broadcast
    this.activeRangersGps.delete(patrol.rangerId);

    this.saveDisk();
    return patrol;
  }

  async getPatrolById(patrolId) {
    if (this.isMongoConnected()) {
      const doc = await Patrol.findOne({ $or: [{ id: patrolId }, { localId: patrolId }] }).lean();
      if (doc) return doc;
    }
    return this.memoryPatrols.find((p) => p.id === patrolId || p.localId === patrolId) || null;
  }

  async getAllPatrols({ rangerId, status } = {}) {
    if (this.isMongoConnected()) {
      const query = {};
      if (rangerId) query.rangerId = rangerId;
      if (status) query.status = status;
      return await Patrol.find(query).sort({ startTime: -1 }).lean();
    }

    let results = [...this.memoryPatrols];
    if (rangerId) results = results.filter((p) => p.rangerId === rangerId);
    if (status) results = results.filter((p) => p.status === status);
    return results;
  }

  // ==========================================
  // INCIDENT REPORTING
  // ==========================================

  async logIncident({
    patrolId,
    rangerId,
    rangerName,
    incidentType,
    severity = INCIDENT_SEVERITY.MEDIUM,
    coordinates,
    landmark = '',
    description,
    photos = [],
    localId = null,
  }) {
    // E3: Mandatory field validations
    if (!incidentType || !incidentType.trim()) {
      const err = new Error('Incident Type is required');
      err.statusCode = 400;
      throw err;
    }

    if (!description || !description.trim()) {
      const err = new Error('Incident description is required');
      err.statusCode = 400;
      throw err;
    }

    if (!coordinates || coordinates.latitude === undefined || coordinates.longitude === undefined) {
      const err = new Error('Geographic coordinates (latitude and longitude) are mandatory for field incident logging');
      err.statusCode = 400;
      throw err;
    }

    const latNum = Number(coordinates.latitude);
    const lonNum = Number(coordinates.longitude);

    if (isNaN(latNum) || latNum < -90 || latNum > 90 || isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      const err = new Error('Incident coordinates are outside valid geographic latitude/longitude range');
      err.statusCode = 400;
      throw err;
    }

    const newIncident = {
      id: `inc-${Date.now().toString().slice(-6)}`,
      localId: localId || `loc-inc-${Date.now()}`,
      patrolId: patrolId || 'unassigned',
      rangerId: rangerId || 'USR-8822',
      rangerName: rangerName || 'M.U. Handaragama',
      incidentType: incidentType.trim().toUpperCase(),
      severity: severity || INCIDENT_SEVERITY.MEDIUM,
      coordinates: {
        latitude: latNum,
        longitude: lonNum,
        accuracyMeters: Number(coordinates.accuracyMeters) || 4.0,
      },
      landmark: landmark ? landmark.trim() : '',
      description: description.trim(),
      photos: Array.isArray(photos) ? photos : [],
      status: 'OPEN',
      syncStatus: SYNC_STATUSES.SYNCED,
      reportedAt: new Date().toISOString(),
    };

    if (this.isMongoConnected()) {
      try {
        const created = await Incident.create(newIncident);
        // increment patrol incidentsCount if patrol exists
        if (patrolId) {
          await Patrol.updateOne({ $or: [{ id: patrolId }, { localId: patrolId }] }, { $inc: { incidentsCount: 1 } });
        }
        return created.toObject();
      } catch (e) {
        console.warn('[PatrolService] Incident MongoDB insert failed, falling back to memory:', e.message);
      }
    }

    this.memoryIncidents.unshift(newIncident);

    // Update patrol incident count in memory
    const patrol = this.memoryPatrols.find((p) => p.id === patrolId || p.localId === patrolId);
    if (patrol) {
      patrol.incidentsCount = (patrol.incidentsCount || 0) + 1;
    }
    this.saveDisk();

    return newIncident;
  }

  // A2: Ranger Edits a Locally Saved Incident
  async updateIncident(incidentId, updateData = {}) {
    if (this.isMongoConnected()) {
      const incidentDoc = await Incident.findOne({ $or: [{ id: incidentId }, { localId: incidentId }] });
      if (incidentDoc) {
        if (updateData.description !== undefined) incidentDoc.description = updateData.description.trim();
        if (updateData.severity !== undefined) incidentDoc.severity = updateData.severity;
        if (updateData.landmark !== undefined) incidentDoc.landmark = updateData.landmark.trim();
        if (updateData.incidentType !== undefined) incidentDoc.incidentType = updateData.incidentType;
        if (Array.isArray(updateData.photos)) incidentDoc.photos = updateData.photos;
        await incidentDoc.save();
        return incidentDoc.toObject();
      }
    }

    const incident = this.memoryIncidents.find((i) => i.id === incidentId || i.localId === incidentId);
    if (!incident) {
      const err = new Error(`Incident not found with ID ${incidentId}`);
      err.statusCode = 404;
      throw err;
    }

    if (updateData.description !== undefined) incident.description = updateData.description.trim();
    if (updateData.severity !== undefined) incident.severity = updateData.severity;
    if (updateData.landmark !== undefined) incident.landmark = updateData.landmark.trim();
    if (updateData.incidentType !== undefined) incident.incidentType = updateData.incidentType;
    if (Array.isArray(updateData.photos)) incident.photos = updateData.photos;
    this.saveDisk();

    return incident;
  }

  async getAllIncidents({ patrolId, incidentType, severity } = {}) {
    if (this.isMongoConnected()) {
      const query = {};
      if (patrolId) query.patrolId = patrolId;
      if (incidentType) query.incidentType = incidentType;
      if (severity) query.severity = severity;
      return await Incident.find(query).sort({ reportedAt: -1 }).lean();
    }

    let results = [...this.memoryIncidents];
    if (patrolId) results = results.filter((i) => i.patrolId === patrolId);
    if (incidentType) results = results.filter((i) => i.incidentType === incidentType);
    if (severity) results = results.filter((i) => i.severity === severity);
    return results;
  }

  async getIncidentById(incidentId) {
    if (this.isMongoConnected()) {
      const doc = await Incident.findOne({ $or: [{ id: incidentId }, { localId: incidentId }] }).lean();
      if (doc) return doc;
    }
    return this.memoryIncidents.find((i) => i.id === incidentId || i.localId === incidentId) || null;
  }

  // ==========================================
  // BATCH SYNC ENGINE (Offline-first Synchronization)
  // ==========================================

  async syncBatch({ patrols = [], incidents = [] }) {
    const syncedPatrols = [];
    const syncedIncidents = [];

    // Sync Patrols
    for (const p of patrols) {
      const existing = this.memoryPatrols.find(
        (item) => (p.id && item.id === p.id) || (p.localId && item.localId === p.localId)
      );

      if (existing) {
        // Update existing with synced data
        Object.assign(existing, p, {
          syncStatus: SYNC_STATUSES.SYNCED,
          lastSyncedAt: new Date().toISOString(),
        });
        syncedPatrols.push(existing);
      } else {
        const toSave = {
          ...p,
          id: p.id || `pat-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900)}`,
          syncStatus: SYNC_STATUSES.SYNCED,
          lastSyncedAt: new Date().toISOString(),
        };
        this.memoryPatrols.unshift(toSave);
        syncedPatrols.push(toSave);
      }
    }

    // Sync Incidents
    for (const inc of incidents) {
      const existing = this.memoryIncidents.find(
        (item) => (inc.id && item.id === inc.id) || (inc.localId && item.localId === inc.localId)
      );

      if (existing) {
        Object.assign(existing, inc, {
          syncStatus: SYNC_STATUSES.SYNCED,
        });
        syncedIncidents.push(existing);
      } else {
        const toSave = {
          ...inc,
          id: inc.id || `inc-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900)}`,
          syncStatus: SYNC_STATUSES.SYNCED,
        };
        this.memoryIncidents.unshift(toSave);
        syncedIncidents.push(toSave);
      }
    }

    this.saveDisk();

    return {
      success: true,
      message: 'Batch synchronization completed successfully',
      syncedPatrolsCount: syncedPatrols.length,
      syncedIncidentsCount: syncedIncidents.length,
      timestamp: new Date().toISOString(),
      patrols: syncedPatrols,
      incidents: syncedIncidents,
    };
  }
}

module.exports = new PatrolService();
