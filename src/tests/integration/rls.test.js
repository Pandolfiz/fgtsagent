const request = require('supertest');
const app = require('../../app');

describe('RLS (Row Level Security)', () => {
  it('deve negar acesso a leads de outra organização', async () => {
    // Simule um token de outro tenant
    const fakeToken = 'Bearer token_de_outra_org';
    const res = await request(app)
      .get('/api/leads')
      .set('Authorization', fakeToken);
    expect([401, 403]).toContain(res.statusCode);
  });
}); 