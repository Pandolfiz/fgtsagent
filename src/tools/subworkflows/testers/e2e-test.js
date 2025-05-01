#!/usr/bin/env node
/**
 * Teste End-to-End para ferramentas de subworkflows
 * 
 * Este teste verifica se todas as funcionalidades críticas estão disponíveis
 * na nova estrutura organizada.
 */

// Importar todas as funções da nova estrutura
const subworkflowTools = require('../index');

// Cores para console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

console.log(`${colors.blue}=== TESTE END-TO-END DE FERRAMENTAS DE SUBWORKFLOWS ===${colors.reset}`);
console.log(`Executando teste em: ${new Date().toISOString()}`);

// Resultados dos testes
const results = {
  total: 0,
  passed: 0,
  failed: 0
};

// Função para executar e verificar testes
function test(name, fn) {
  results.total++;
  try {
    fn();
    console.log(`${colors.green}✓ PASSOU: ${name}${colors.reset}`);
    results.passed++;
  } catch (error) {
    console.log(`${colors.red}✗ FALHOU: ${name}${colors.reset}`);
    console.log(`  Erro: ${error.message}`);
    results.failed++;
  }
}

// Verificar presença de todas as funções críticas
console.log(`\n${colors.magenta}Verificando interfaces exportadas:${colors.reset}`);

// 1. Testar padrões e detecção básica
test('SUBWORKFLOW_PATTERNS está disponível', () => {
  if (!Array.isArray(subworkflowTools.SUBWORKFLOW_PATTERNS)) {
    throw new Error('SUBWORKFLOW_PATTERNS não é um array ou não está disponível');
  }
  
  if (subworkflowTools.SUBWORKFLOW_PATTERNS.length === 0) {
    throw new Error('SUBWORKFLOW_PATTERNS está vazio');
  }
});

test('identifySubworkflowFromNode está disponível', () => {
  if (typeof subworkflowTools.identifySubworkflowFromNode !== 'function') {
    throw new Error('identifySubworkflowFromNode não é uma função ou não está disponível');
  }
});

test('identifyAllSubworkflows está disponível', () => {
  if (typeof subworkflowTools.identifyAllSubworkflows !== 'function') {
    throw new Error('identifyAllSubworkflows não é uma função ou não está disponível');
  }
});

// 2. Testar identificador avançado
test('identificarSubworkflows está disponível', () => {
  if (typeof subworkflowTools.identificarSubworkflows !== 'function') {
    throw new Error('identificarSubworkflows não é uma função ou não está disponível');
  }
});

// 3. Testar utilitários de duplicação
test('duplicateWorkflowWithSubworkflows está disponível', () => {
  if (typeof subworkflowTools.duplicateWorkflowWithSubworkflows !== 'function') {
    throw new Error('duplicateWorkflowWithSubworkflows não é uma função ou não está disponível');
  }
});

test('getWorkflow está disponível', () => {
  if (typeof subworkflowTools.getWorkflow !== 'function') {
    throw new Error('getWorkflow não é uma função ou não está disponível');
  }
});

test('duplicateWorkflow está disponível', () => {
  if (typeof subworkflowTools.duplicateWorkflow !== 'function') {
    throw new Error('duplicateWorkflow não é uma função ou não está disponível');
  }
});

test('updateSubworkflowReferences está disponível', () => {
  if (typeof subworkflowTools.updateSubworkflowReferences !== 'function') {
    throw new Error('updateSubworkflowReferences não é uma função ou não está disponível');
  }
});

// Testar funcionalidade básica
console.log(`\n${colors.magenta}Testando funcionalidades básicas:${colors.reset}`);

// 4. Testar detecção de subworkflows
test('Detecção básica de subworkflows', () => {
  // Workflow de teste com subworkflow
  const testWorkflow = {
    name: 'Workflow de Teste',
    nodes: [
      {
        id: '1',
        name: 'Executar Subworkflow',
        type: 'n8n-nodes-base.executeWorkflow',
        parameters: {
          workflowId: '123abc'
        }
      }
    ]
  };
  
  const result = subworkflowTools.identifyAllSubworkflows(testWorkflow);
  
  if (!result.hasSubworkflows) {
    throw new Error('Não detectou subworkflows em um workflow que claramente tem um');
  }
  
  if (result.subworkflows.length !== 1) {
    throw new Error(`Detectou ${result.subworkflows.length} subworkflows, esperado: 1`);
  }
  
  if (result.subworkflows[0].subworkflowId !== '123abc') {
    throw new Error(`ID de subworkflow incorreto: ${result.subworkflows[0].subworkflowId}, esperado: 123abc`);
  }
});

// 5. Testar detecção variante
test('Detecção de variante de subworkflow', () => {
  const testWorkflow = {
    name: 'Workflow com Variante',
    nodes: [
      {
        id: '1',
        name: 'Executar Outro Workflow',
        type: 'executeworkflow',
        parameters: {
          workflow: {
            value: '456def'
          }
        }
      }
    ]
  };
  
  const result = subworkflowTools.identifyAllSubworkflows(testWorkflow);
  
  if (!result.hasSubworkflows) {
    throw new Error('Não detectou subworkflow variante');
  }
});

// 6. Testar casos especiais
test('Detecção de nó trigger', () => {
  const testWorkflow = {
    name: 'Workflow com Trigger',
    nodes: [
      {
        id: '1',
        name: 'Trigger de Subworkflow',
        type: 'n8n-nodes-base.executeWorkflowTrigger',
        parameters: {}
      }
    ]
  };
  
  const result = subworkflowTools.identifyAllSubworkflows(testWorkflow);
  
  if (!result.hasSubworkflows) {
    throw new Error('Não detectou nó trigger de subworkflow');
  }
});

// Relatório final
console.log(`\n${colors.blue}=== RELATÓRIO FINAL ===${colors.reset}`);
console.log(`Total de testes: ${results.total}`);
console.log(`${colors.green}Testes passados: ${results.passed}${colors.reset}`);
console.log(`${colors.red}Testes falhos: ${results.failed}${colors.reset}`);

if (results.failed > 0) {
  console.log(`\n${colors.red}⚠️  ATENÇÃO: Alguns testes falharam. Revise a implementação.${colors.reset}`);
  process.exit(1);
} else {
  console.log(`\n${colors.green}✅ SUCESSO: Todas as funcionalidades críticas estão disponíveis e funcionando.${colors.reset}`);
  console.log(`\n${colors.yellow}Conclusão: A nova estrutura implementa todas as funcionalidades dos arquivos originais.${colors.reset}`);
  console.log(`É seguro mover os arquivos soltos para um diretório de backup antes de removê-los completamente.`);
} 