const { sanitizeRequest } = require('../../middleware/sanitizationMiddleware');

describe('Sanitização', () => {
  it('deve remover scripts maliciosos do body', () => {
    const req = { body: { nome: '<script>alert(1)</script>' } };
    const res = {};
    const next = jest.fn();
    sanitizeRequest(['body'])(req, res, next);
    expect(req.body.nome).not.toContain('<script>');
    expect(next).toHaveBeenCalled();
  });
}); 