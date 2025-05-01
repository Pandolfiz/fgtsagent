const validator = require('../../utils/validator');

describe('Validator', () => {
  it('deve validar e-mail corretamente', () => {
    const schema = { email: { required: true, isEmail: true } };
    expect(validator.validate({ email: 'teste@email.com' }, schema)).toHaveLength(0);
    expect(validator.validate({ email: 'invalido' }, schema)).toEqual([
      { field: 'email', message: 'O campo email deve ser um e-mail válido' }
    ]);
  });

  it('deve validar campo obrigatório', () => {
    const schema = { nome: { required: true, type: 'string' } };
    expect(validator.validate({ nome: 'João' }, schema)).toHaveLength(0);
    expect(validator.validate({}, schema)).toEqual([
      { field: 'nome', message: 'O campo nome é obrigatório' }
    ]);
  });
}); 