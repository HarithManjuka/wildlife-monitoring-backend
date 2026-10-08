const patrolService = require('../services/patrolService');
const {
  PATROL_STATUSES,
  INCIDENT_TYPES,
  INCIDENT_SEVERITY,
  SYNC_STATUSES,
} = require('../config/patrolConstants');

describe('UC-01 Field Patrols & Incidents - PatrolService Unit Tests', () => {
  beforeEach(() => {
    patrolService.resetStore();
  });

  describe('Patrol Lifecycle Management', () => {
    it('should start a new patrol with valid ranger and route parameters', async () => {
      const patrol = await patrolService.startPatrol({
        rangerId: 'USR-8822',
        rangerName: 'M.U. Handaragama',
        routeId: 'route-1a',
        initialBattery: 95,
      });

      expect(patrol).toBeDefined();
      expect(patrol.id).toMatch(/^pat-/);
      expect(patrol.status).toBe(PATROL_STATUSES.IN_PROGRESS);
      expect(patrol.distanceKm).toBe(0);
      expect(patrol.waypoints).toEqual([]);
      expect(patrol.batteryLevel).toBe(95);
      expect(patrol.syncStatus).toBe(SYNC_STATUSES.SYNCED);
    });

    it('should reject starting a patrol without rangerId with status 400', async () => {
      await expect(
        patrolService.startPatrol({
          rangerId: '',
          routeId: 'route-1a',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Ranger ID is required to start a patrol',
      });
    });

    it('should append GPS waypoints and increment distance accurately using Haversine formula', async () => {
      const patrol = await patrolService.startPatrol({
        rangerId: 'USR-8822',
        routeId: 'route-1a',
      });

      // Point 1: Yala base coordinates
      await patrolService.addWaypoint(patrol.id, {
        latitude: 6.4715,
        longitude: 80.8985,
        accuracyMeters: 3.5,
      });

      // Point 2: ~1.5 km away
      const updated = await patrolService.addWaypoint(patrol.id, {
        latitude: 6.4800,
        longitude: 80.9050,
        accuracyMeters: 4.0,
      });

      expect(updated.waypoints.length).toBe(2);
      expect(updated.distanceKm).toBeGreaterThan(0.5);
    });

    it('should support Alternative Flow A1: Ranger Manually Adds a Waypoint with note', async () => {
      const patrol = await patrolService.startPatrol({
        rangerId: 'USR-8822',
        routeId: 'route-1a',
      });

      const updated = await patrolService.addWaypoint(patrol.id, {
        latitude: 6.4760,
        longitude: 80.9045,
        accuracyMeters: 4.0,
        isManual: true,
        note: 'Damaged perimeter wire noticed',
      });

      const lastWp = updated.waypoints[updated.waypoints.length - 1];
      expect(lastWp.isManual).toBe(true);
      expect(lastWp.note).toBe('Damaged perimeter wire noticed');
    });

    it('should reject invalid coordinates outside geographic bounds', async () => {
      const patrol = await patrolService.startPatrol({
        rangerId: 'USR-8822',
        routeId: 'route-1a',
      });

      await expect(
        patrolService.addWaypoint(patrol.id, {
          latitude: 95.0, // Invalid lat > 90
          longitude: 80.0,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Waypoint coordinates are out of valid geographic range',
      });
    });

    it('should finalize patrol, calculate duration and mark status as COMPLETED', async () => {
      const patrol = await patrolService.startPatrol({
        rangerId: 'USR-8822',
        routeId: 'route-1a',
      });

      const completed = await patrolService.endPatrol(patrol.id, {
        batteryLevel: 72,
        summaryNotes: 'Patrol finished safely, no major breaches.',
      });

      expect(completed.status).toBe(PATROL_STATUSES.COMPLETED);
      expect(completed.endTime).toBeDefined();
      expect(completed.durationMinutes).toBeGreaterThanOrEqual(0);
      expect(completed.batteryLevel).toBe(72);
    });

    it('should reject adding waypoints to a completed patrol', async () => {
      const patrol = await patrolService.startPatrol({
        rangerId: 'USR-8822',
        routeId: 'route-1a',
      });

      await patrolService.endPatrol(patrol.id);

      await expect(
        patrolService.addWaypoint(patrol.id, {
          latitude: 6.4715,
          longitude: 80.8985,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Cannot add waypoint to a completed patrol',
      });
    });
  });

  describe('Field Incident Reporting', () => {
    it('should log a valid snare incident with coordinates and photo', async () => {
      const incident = await patrolService.logIncident({
        patrolId: 'pat-101',
        rangerId: 'USR-8822',
        rangerName: 'M.U. Handaragama',
        incidentType: INCIDENT_TYPES.SNARE,
        severity: INCIDENT_SEVERITY.HIGH,
        coordinates: { latitude: 6.4740, longitude: 80.9020, accuracyMeters: 3.0 },
        landmark: 'Riverbed crossing',
        description: 'Single wire snare found and removed.',
        photos: ['photo1.jpg'],
      });

      expect(incident.id).toMatch(/^inc-/);
      expect(incident.incidentType).toBe(INCIDENT_TYPES.SNARE);
      expect(incident.severity).toBe(INCIDENT_SEVERITY.HIGH);
      expect(incident.coordinates.latitude).toBe(6.4740);
      expect(incident.coordinates.longitude).toBe(80.9020);
      expect(incident.photos.length).toBe(1);
    });

    it('should enforce Exception Flow E3: Reject incident without incidentType', async () => {
      await expect(
        patrolService.logIncident({
          patrolId: 'pat-101',
          incidentType: '',
          description: 'Description without type',
          coordinates: { latitude: 6.4740, longitude: 80.9020 },
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Incident Type is required',
      });
    });

    it('should enforce Exception Flow E3: Reject incident without coordinates', async () => {
      await expect(
        patrolService.logIncident({
          patrolId: 'pat-101',
          incidentType: INCIDENT_TYPES.POACHING,
          description: 'Missing GPS coordinates',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Geographic coordinates (latitude and longitude) are mandatory for field incident logging',
      });
    });

    it('should support Alternative Flow A2: Ranger Edits a Locally Saved Incident', async () => {
      const incident = await patrolService.logIncident({
        patrolId: 'pat-101',
        incidentType: INCIDENT_TYPES.SNARE,
        description: 'Snare found',
        coordinates: { latitude: 6.4740, longitude: 80.9020 },
      });

      const updated = await patrolService.updateIncident(incident.id, {
        description: 'Updated: Snare dismantled and wire confiscated. Footprints lead south.',
        severity: INCIDENT_SEVERITY.CRITICAL,
      });

      expect(updated.description).toContain('wire confiscated');
      expect(updated.severity).toBe(INCIDENT_SEVERITY.CRITICAL);
    });
  });

  describe('Offline Batch Synchronization Engine', () => {
    it('should ingest and sync batch of offline patrols and incidents (E1/Sync Queue)', async () => {
      const offlinePatrols = [
        {
          localId: 'loc-offline-pat-1',
          rangerId: 'USR-8822',
          rangerName: 'M.U. Handaragama',
          routeName: 'Offline Sector 9 Patrol',
          status: PATROL_STATUSES.COMPLETED,
          distanceKm: 6.5,
          waypoints: [{ latitude: 6.45, longitude: 80.89, timestamp: new Date().toISOString() }],
        },
      ];

      const offlineIncidents = [
        {
          localId: 'loc-offline-inc-1',
          incidentType: INCIDENT_TYPES.ILLEGAL_CAMP,
          severity: INCIDENT_SEVERITY.MEDIUM,
          description: 'Remains of illegal poacher campfire found',
          coordinates: { latitude: 6.452, longitude: 80.892 },
        },
      ];

      const syncResult = await patrolService.syncBatch({
        patrols: offlinePatrols,
        incidents: offlineIncidents,
      });

      expect(syncResult.success).toBe(true);
      expect(syncResult.syncedPatrolsCount).toBe(1);
      expect(syncResult.syncedIncidentsCount).toBe(1);
      expect(syncResult.patrols[0].syncStatus).toBe(SYNC_STATUSES.SYNCED);
      expect(syncResult.incidents[0].syncStatus).toBe(SYNC_STATUSES.SYNCED);
    });

    it('should update existing items during batch sync idempotently', async () => {
      const syncResult1 = await patrolService.syncBatch({
        patrols: [{ id: 'pat-sync-test', routeName: 'Route 1', status: PATROL_STATUSES.IN_PROGRESS }],
        incidents: [{ id: 'inc-sync-test', incidentType: INCIDENT_TYPES.SNARE, description: 'Snare 1', coordinates: { latitude: 6.47, longitude: 80.9 } }],
      });

      expect(syncResult1.syncedPatrolsCount).toBe(1);

      // Second sync updates existing
      const syncResult2 = await patrolService.syncBatch({
        patrols: [{ id: 'pat-sync-test', routeName: 'Route 1 Updated', status: PATROL_STATUSES.COMPLETED }],
        incidents: [{ id: 'inc-sync-test', incidentType: INCIDENT_TYPES.SNARE, description: 'Snare 1 Disarmed', coordinates: { latitude: 6.47, longitude: 80.9 } }],
      });

      expect(syncResult2.patrols[0].status).toBe(PATROL_STATUSES.COMPLETED);
      expect(syncResult2.incidents[0].description).toBe('Snare 1 Disarmed');
    });
  });

  describe('Query and Finder Operations', () => {
    it('should retrieve patrol by ID or return null if not found', async () => {
      const found = await patrolService.getPatrolById('pat-101');
      expect(found).not.toBeNull();
      expect(found.id).toBe('pat-101');

      const notFound = await patrolService.getPatrolById('pat-non-existent');
      expect(notFound).toBeNull();
    });

    it('should list and filter patrols by rangerId and status', async () => {
      const all = await patrolService.getAllPatrols();
      expect(all.length).toBeGreaterThan(0);

      const filtered = await patrolService.getAllPatrols({ status: PATROL_STATUSES.IN_PROGRESS });
      expect(filtered.every((p) => p.status === PATROL_STATUSES.IN_PROGRESS)).toBe(true);
    });

    it('should list and filter incidents by type and severity', async () => {
      const incidents = await patrolService.getAllIncidents({ incidentType: INCIDENT_TYPES.SNARE });
      expect(incidents.length).toBeGreaterThan(0);
      expect(incidents[0].incidentType).toBe(INCIDENT_TYPES.SNARE);

      const byId = await patrolService.getIncidentById('inc-201');
      expect(byId).not.toBeNull();
      expect(byId.id).toBe('inc-201');

      const nonExistent = await patrolService.getIncidentById('inc-none');
      expect(nonExistent).toBeNull();
    });

    it('should throw 404 when updating non-existent incident', async () => {
      await expect(
        patrolService.updateIncident('inc-does-not-exist', { description: 'test' })
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('should throw 404 when adding waypoint to non-existent patrol', async () => {
      await expect(
        patrolService.addWaypoint('pat-unknown', { latitude: 6.47, longitude: 80.9 })
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('should throw 404 when ending non-existent patrol', async () => {
      await expect(
        patrolService.endPatrol('pat-unknown')
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
