/**
 * Script para testar conversão de valores numéricos
 * 
 * Este script simula diferentes tipos e formatos de valores numéricos
 * para verificar como a conversão e formatação funcionam.
 */

const { logger } = require('../utils/logger');

// Função para formatar como moeda (formatação robusta)
function formataMoeda(valor) {
  // Se o valor for null, undefined ou não numérico, retornar null
  if (valor === null || valor === undefined) {
    return null;
  }
  
  try {
    // Garantir que estamos trabalhando com um número
    let numero;
    
    // Verificar se já é um número
    if (typeof valor === 'number') {
      numero = valor;
    } else {
      // Tentar converter string para número
      // Remover qualquer formatação que possa existir
      const valorLimpo = String(valor).replace(/[^\d.,]/g, '')
        .replace(/\./g, '#')  // Substituir temporariamente pontos
        .replace(/,/g, '.')   // Substituir vírgulas por pontos
        .replace(/#/g, '');   // Remover pontos temporários
      
      numero = parseFloat(valorLimpo);
    }
    
    // Verificar se a conversão resultou em um número válido
    if (isNaN(numero)) {
      console.warn(`Não foi possível converter "${valor}" para número`);
      return null;
    }
    
    // Formatar o número como moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(numero);
  } catch (error) {
    console.error(`Erro ao formatar valor monetário: ${error.message}`);
    // Fallback simples
    return `R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}`;
  }
}

// Função para testar a conversão de valores numéricos
function testarConversao() {
  console.log('=== TESTE DE CONVERSÃO NUMÉRICA ===');
  
  // Array de valores para testar
  const valores = [
    // Números como diferentes tipos
    { valor: 1234.56, desc: 'Número literal' },
    { valor: '1234.56', desc: 'String com ponto decimal' },
    { valor: '1234,56', desc: 'String com vírgula decimal (formato BR)' },
    { valor: 'R$ 1.234,56', desc: 'String formatada como moeda BR' },
    { valor: '1,234.56', desc: 'String formatada como moeda EN' },
    
    // Valores problemáticos
    { valor: null, desc: 'Valor nulo' },
    { valor: undefined, desc: 'Valor indefinido' },
    { valor: '', desc: 'String vazia' },
    { valor: 'abc', desc: 'String não numérica' },
    { valor: '12.34.56', desc: 'Formato inválido (múltiplos pontos)' },
    { valor: '12,34,56', desc: 'Formato inválido (múltiplas vírgulas)' },
    
    // Valores de banco de dados
    { valor: '{"balance": 1234.56}', desc: 'JSON stringificado' },
    { valor: {balance: 1234.56}, desc: 'Objeto JSON' }
  ];
  
  // Testar cada valor
  for (const item of valores) {
    console.log(`\nValor: ${item.valor} (${typeof item.valor})`);
    console.log(`Descrição: ${item.desc}`);
    
    // Teste 1: Conversão direta para Number
    try {
      const num = Number(item.valor);
      console.log(`Number(): ${num} (${typeof num}, isNaN: ${isNaN(num)})`);
    } catch (e) {
      console.log(`Number() falhou: ${e.message}`);
    }
    
    // Teste 2: Conversão com parseFloat
    try {
      const num = parseFloat(item.valor);
      console.log(`parseFloat(): ${num} (${typeof num}, isNaN: ${isNaN(num)})`);
    } catch (e) {
      console.log(`parseFloat() falhou: ${e.message}`);
    }
    
    // Teste 3: Formatação com toFixed (se possível)
    try {
      if (typeof item.valor === 'number' || 
         (typeof item.valor === 'string' && !isNaN(Number(item.valor)))) {
        const num = Number(item.valor);
        console.log(`toFixed(2): ${num.toFixed(2)}`);
      } else {
        console.log('toFixed(2): Não aplicável (não é número)');
      }
    } catch (e) {
      console.log(`toFixed(2) falhou: ${e.message}`);
    }
    
    // Teste 4: Função robusta formataMoeda
    try {
      const formatado = formataMoeda(item.valor);
      console.log(`formataMoeda(): ${formatado}`);
    } catch (e) {
      console.log(`formataMoeda() falhou: ${e.message}`);
    }
  }
}

// Executar o teste
testarConversao(); 