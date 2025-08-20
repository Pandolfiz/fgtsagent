const { sanitizeRequest } = require('../../middleware/sanitizationMiddleware');

describe('Segurança', () => {
  it('deve remover scripts maliciosos do body', () => {
    const req = { body: { nome: '<script>alert(1)</script>' } };
    const res = {};
    const next = jest.fn();
    sanitizeRequest(['body'])(req, res, next);
    expect(req.body.nome).not.toContain('<script>');
    expect(next).toHaveBeenCalled();
  });

  // Teste de rate limiting seria feito via integração, mas pode ser simulado:
  // it('deve limitar requisições excessivas', async () => {
  //   // Simule várias requisições rápidas e espere status 429
  // });
}); 