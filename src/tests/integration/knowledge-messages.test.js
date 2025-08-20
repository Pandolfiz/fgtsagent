const request = require('supertest');
const app = require('../../app');

describe('Base de conhecimento e mensagens', () => {
  it('deve negar criação de artigo sem autenticação', async () => {
    const res = await request(app)
      .post('/api/knowledge-base')
      .send({ title: 'Teste', content: 'Conteúdo' });
    expect([401, 403]).toContain(res.statusCode);
  });

  it('deve negar envio de mensagem sem autenticação', async () => {
    const res = await request(app)
      .post('/api/messages')
      .send({ content: 'Olá' });
    expect([401, 403]).toContain(res.statusCode);
  });
}); 