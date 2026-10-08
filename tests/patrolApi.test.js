const request = require('supertest');
const app = require('../app');
const patrolService = require('../services/patrolService');

describe('UC-01 Patrol & Incident REST API Integration Tests', () => {
  beforeEach(() => {
    patrolService.resetStore();
  });

  it('GET /api/patrols should return module status and metadata', async () => {
    const res = await request(app).get('/api/patrols');
    expect(res.statusCode).toBe(200);
    expect(res.body.module).toBe('Field Patrols & Incidents');
    expect(res.body.code).toBe('UC-01');
    expect(res.body.author).toContain('M.U. Handaragama');
  });

  it('GET /api/patrols/routes should return predefined patrol routes', async () => {
    const res = await request(app).get('/api/patrols/routes');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.routes)).toBe(true);
    expect(res.body.routes.length).toBeGreaterThan(0);
  });

  it('POST /api/patrols/start should initialize a patrol session', async () => {
    const res = await request(app)
      .post('/api/patrols/start')
      .send({
        rangerId: 'USR-8822',
        rangerName: 'M.U. Handaragama',
        routeId: 'route-1a',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.patrol.status).toBe('IN_PROGRESS');
  });

  it('POST /api/patrols/:id/waypoint should add a waypoint to an active patrol', async () => {
    const res = await request(app)
      .post('/api/patrols/pat-101/waypoint')
      .send({
        latitude: 6.478,
        longitude: 80.908,
        accuracyMeters: 3.2,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.patrol.waypoints.length).toBeGreaterThan(0);
  });

  it('POST /api/patrols/:id/end should end a patrol successfully', async () => {
    const res = await request(app)
      .post('/api/patrols/pat-101/end')
      .send({
        batteryLevel: 75,
        summaryNotes: 'Patrol route complete',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.patrol.status).toBe('COMPLETED');
  });

  it('POST /api/incidents should record an incident report with 201 Created', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .send({
        patrolId: 'pat-101',
        rangerId: 'USR-8822',
        incidentType: 'SNARE',
        severity: 'HIGH',
        coordinates: { latitude: 6.473, longitude: 80.901 },
        description: 'Wire snare trapped on game trail',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.incident.id).toMatch(/^inc-/);
  });

  it('POST /api/incidents should return 400 when missing mandatory description (E3)', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .send({
        patrolId: 'pat-101',
        incidentType: 'SNARE',
        coordinates: { latitude: 6.473, longitude: 80.901 },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('PUT /api/incidents/:id should update an existing incident (Alternative Flow A2)', async () => {
    const res = await request(app)
      .put('/api/incidents/inc-201')
      .send({
        description: 'Updated field description: Wire neutralized completely.',
        severity: 'CRITICAL',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.incident.description).toContain('Wire neutralized');
  });

  it('POST /api/patrols/sync should process batch offline records', async () => {
    const res = await request(app)
      .post('/api/patrols/sync')
      .send({
        patrols: [
          {
            localId: 'batch-pat-1',
            rangerId: 'USR-8822',
            rangerName: 'M.U. Handaragama',
            routeName: 'Batch Sync Route',
          },
        ],
        incidents: [
          {
            localId: 'batch-inc-1',
            incidentType: 'SNARE',
            description: 'Offline snare item',
            coordinates: { latitude: 6.47, longitude: 80.90 },
          },
        ],
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.syncedPatrolsCount).toBe(1);
    expect(res.body.syncedIncidentsCount).toBe(1);
  });

  it('GET /api/patrols/list should return list of patrols', async () => {
    const res = await request(app).get('/api/patrols/list');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.patrols)).toBe(true);
  });

  it('GET /api/patrols/:id should return single patrol or 404', async () => {
    const res = await request(app).get('/api/patrols/pat-101');
    expect(res.statusCode).toBe(200);
    expect(res.body.patrol.id).toBe('pat-101');

    const res404 = await request(app).get('/api/patrols/pat-unknown-404');
    expect(res404.statusCode).toBe(404);
  });

  it('GET /api/incidents should return all incidents', async () => {
    const res = await request(app).get('/api/incidents');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.incidents)).toBe(true);
  });

  it('GET /api/incidents/:id should return single incident or 404', async () => {
    const res = await request(app).get('/api/incidents/inc-201');
    expect(res.statusCode).toBe(200);
    expect(res.body.incident.id).toBe('inc-201');

    const res404 = await request(app).get('/api/incidents/inc-unknown-404');
    expect(res404.statusCode).toBe(404);
  });
});
