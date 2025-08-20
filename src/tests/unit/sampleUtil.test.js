// Exemplo de função utilitária
function soma(a, b) {
  return a + b;
}

describe('Função soma', () => {
  it('deve somar dois números corretamente', () => {
    expect(soma(2, 3)).toBe(5);
    expect(soma(-1, 1)).toBe(0);
    expect(soma(0, 0)).toBe(0);
  });
}); 