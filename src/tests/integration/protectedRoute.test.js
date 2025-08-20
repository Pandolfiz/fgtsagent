const request = require('supertest');
const app = require('../../app');

describe('Rotas protegidas', () => {
  it('deve negar acesso sem autenticação', async () => {
    const res = await request(app).get('/api/agents');
    expect([401, 403]).toContain(res.statusCode); // Pode ser 401 ou 403 dependendo do middleware
  });
}); 