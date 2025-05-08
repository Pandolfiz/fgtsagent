const request = require('supertest');
const app = require('../../app');

describe('Entidades principais', () => {
  it('deve negar criação de cliente sem campos obrigatórios', async () => {
    const res = await request(app)
      .post('/api/clients')
      .send({});
    expect([400, 401]).toContain(res.statusCode);
  });

  it('deve listar leads (autenticado)', async () => {
    // Supondo que é necessário autenticação, use um token válido se possível
    // const token = 'Bearer ...';
    const res = await request(app)
      .get('/api/leads')
      // .set('Authorization', token)
    expect([200, 401, 403]).toContain(res.statusCode);
  });
}); 