const request = require('supertest');
const app = require('../../app');

describe('GET /health', () => {
  it('deve retornar status 200 e { status: "ok" }', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
}); 