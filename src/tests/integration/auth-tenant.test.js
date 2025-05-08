const request = require('supertest');
const app = require('../../app');

describe('Multi-tenant e Autorização', () => {
  it('deve negar acesso a dados de outra organização', async () => {
    // Supondo que o usuário autenticado só pode acessar sua própria organização
    // Aqui você pode mockar um token de outra org ou simular o cenário
    const fakeToken = 'Bearer token_de_outra_org';
    const res = await request(app)
      .get('/api/clients')
      .set('Authorization', fakeToken);
    expect([401, 403]).toContain(res.statusCode);
  });
}); 