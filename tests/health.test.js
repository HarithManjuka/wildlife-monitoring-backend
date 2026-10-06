const request = require('supertest');
const app = require('../app');

describe('System Health and Diagnostic API Endpoints', () => {
  jest.setTimeout(15000);
  it('GET / should return service information', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Smart Wildlife Conservation System - REST API');
    expect(res.body.status).toBe('online');
  });

  it('GET /api/health should return system status and port', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('wildlife-monitoring-backend');
    expect(res.body.port).toBeDefined();
  });

  it('GET /api/unknown-endpoint should return 404', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
