const request = require('supertest');
const app = require('../../app');

describe('Autenticação', () => {
  it('deve negar login com credenciais inválidas', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'naoexiste@email.com', password: 'senhaerrada' });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // Para testar login válido, é necessário ter um usuário válido no banco.
  // it('deve permitir login com credenciais válidas', async () => {
  //   const res = await request(app)
  //     .post('/auth/login')
  //     .send({ email: 'usuario@valido.com', password: 'senha_correta' });
  //   expect(res.statusCode).toBe(200);
  //   expect(res.body.success).toBe(true);
  //   expect(res.body.user).toHaveProperty('email', 'usuario@valido.com');
  // });
}); 