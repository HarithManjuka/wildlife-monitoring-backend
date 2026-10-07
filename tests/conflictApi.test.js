const request = require('supertest');
const app = require('../app');
const conflictService = require('../services/conflictService');

describe('UC-03 Conflict API Integration Endpoints', () => {
  const liaisonToken = Buffer.from(
    JSON.stringify({
      userId: 'USR-8821',
      name: 'A.M.H.M. Abeykoon',
      role: 'LIAISON_OFFICER',
    })
  ).toString('base64');

  const rangerToken = Buffer.from(
    JSON.stringify({
      userId: 'USR-8822',
      name: 'M.U. Handaragama',
      role: 'RANGER',
    })
  ).toString('base64');

  beforeEach(() => {
    conflictService.resetStore();
  });

  it('GET /api/conflicts should return module overview metadata', async () => {
    const res = await request(app).get('/api/conflicts');
    expect(res.statusCode).toBe(200);
    expect(res.body.module).toBe('Community Conflict Triage');
    expect(res.body.status).toBe('active');
  });

  it('POST /api/conflicts/sms should ingest SMS report without authentication', async () => {
    const res = await request(app)
      .post('/api/conflicts/sms')
      .send({
        sender: '+94775551234',
        village: 'Habarana South',
        message: 'Elephants spotted near the electric fence line',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.report.id).toMatch(/^conf-/);
    expect(res.body.report.village).toBe('Habarana South');
  });

  it('GET /api/conflicts/queue should reject unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/conflicts/queue');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/conflicts/queue should forbid RANGER role with 403', async () => {
    const res = await request(app)
      .get('/api/conflicts/queue')
      .set('Authorization', `Bearer ${rangerToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/conflicts/queue should allow LIAISON_OFFICER and return reports list', async () => {
    const res = await request(app)
      .get('/api/conflicts/queue')
      .set('Authorization', `Bearer ${liaisonToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.reports)).toBe(true);
    expect(res.body.reports.length).toBeGreaterThanOrEqual(2);
  });

  it('PUT /api/conflicts/:reportId/assign should assign ranger successfully', async () => {
    const res = await request(app)
      .put('/api/conflicts/conf-501/assign')
      .set('Authorization', `Bearer ${liaisonToken}`)
      .send({
        rangerName: 'Ranger Unit Bravo',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.report.dispatchedRanger).toBe('Ranger Unit Bravo');
    expect(res.body.report.status).toBe('Ranger Assigned');
  });

  it('PUT /api/conflicts/:reportId/assign should return 404 for unknown reportId', async () => {
    const res = await request(app)
      .put('/api/conflicts/conf-unknown-id/assign')
      .set('Authorization', `Bearer ${liaisonToken}`)
      .send({
        rangerName: 'Ranger Unit Bravo',
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
