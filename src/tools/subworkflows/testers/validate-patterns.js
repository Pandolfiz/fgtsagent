#!/usr/bin/env node
/**
 * Script de validação para os padrões de detecção de subworkflows
 * Este script testa todos os padrões de detecção em um conjunto de nós de teste
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Importar os padrões e funções
const { SUBWORKFLOW_PATTERNS, identifySubworkflowFromNode, identifyAllSubworkflows } = require('../core/patterns');

// Função de teste
function teste(nome, fn) {
  try {
    fn();
    console.log(`${colors.green}✓ ${nome}${colors.reset}`);
    return true;
  } catch (erro) {
    console.log(`${colors.red}✗ ${nome}${colors.reset}`);
    console.log(`  Erro: ${erro.message}`);
    return false;
  }
}

// Contadores
let total = 0;
let passou = 0;

// Validação de estrutura básica
console.log(`\n${colors.magenta}Validando estrutura dos padrões:${colors.reset}`);

// Teste 1: Verificar array de padrões
total++;
if (teste('SUBWORKFLOW_PATTERNS deve ser um array válido', () => {
  if (!Array.isArray(SUBWORKFLOW_PATTERNS)) {
    throw new Error('SUBWORKFLOW_PATTERNS não é um array');
  }
  if (SUBWORKFLOW_PATTERNS.length === 0) {
    throw new Error('SUBWORKFLOW_PATTERNS está vazio');
  }
})) passou++;

// Nós de teste para cada padrão
const nosParaTeste = [
  {
    nome: 'Padrão Execute Workflow',
    no: {
      id: '1',
      name: 'Executar Workflow',
      type: 'n8n-nodes-base.executeWorkflow',
      parameters: {
        workflowId: '123abc'
      }
    },
    esperado: {
      subworkflowId: '123abc'
    }
  },
  {
    nome: 'Padrão Execute Workflow (variante)',
    no: {
      id: '2',
      name: 'Outro Workflow',
      type: 'executeworkflow',
      parameters: {
        workflow: {
          value: '456def'
        }
      }
    },
    esperado: {
      subworkflowId: '456def'
    }
  },
  {
    nome: 'Padrão Execute Workflow Trigger',
    no: {
      id: '3',
      name: 'Trigger de Workflow',
      type: 'n8n-nodes-base.executeWorkflowTrigger',
      parameters: {}
    },
    esperado: {
      nodeType: 'executeWorkflowTrigger'
    }
  },
  {
    nome: 'Padrão Nome com Workflow',
    no: {
      id: '4',
      name: 'Chamar Workflow de Processamento',
      type: 'n8n-nodes-base.function',
      parameters: {
        workflowId: '789ghi'
      }
    },
    esperado: {
      subworkflowId: '789ghi'
    }
  },
  {
    nome: 'Padrão Referência Direta',
    no: {
      id: '5',
      name: 'Função Genérica',
      type: 'n8n-nodes-base.function',
      parameters: {
        workflowId: 'param123'
      }
    },
    esperado: {
      subworkflowId: 'param123'
    }
  },
  {
    nome: 'Padrão Estrutura Aninhada',
    no: {
      id: '6',
      name: 'Nó com Estrutura Aninhada',
      type: 'n8n-nodes-base.complex',
      parameters: {
        workflow: {
          value: 'nested456'
        }
      }
    },
    esperado: {
      subworkflowId: 'nested456'
    }
  }
];

// Testar cada padrão com seu nó específico
console.log(`\n${colors.magenta}Testando cada padrão de detecção:${colors.reset}`);
nosParaTeste.forEach(caso => {
  total++;
  if (teste(caso.nome, () => {
    const resultado = identifySubworkflowFromNode(caso.no);
    if (!resultado) {
      throw new Error('Não identificou o subworkflow');
    }
    
    // Verificar o resultado esperado
    Object.entries(caso.esperado).forEach(([chave, valor]) => {
      if (resultado[chave] !== valor) {
        throw new Error(`Valor de ${chave} incorreto. Esperado: ${valor}, Obtido: ${resultado[chave]}`);
      }
    });
  })) passou++;
});

// Testar a função de identificação completa
console.log(`\n${colors.magenta}Testando identificação de todos os subworkflows:${colors.reset}`);

// Workflow com múltiplos subworkflows
const workflowTeste = {
  name: 'Workflow de Teste',
  nodes: [
    {
      id: '1',
      name: 'Início',
      type: 'n8n-nodes-base.start',
      parameters: {}
    },
    {
      id: '2',
      name: 'Executar Subworkflow',
      type: 'n8n-nodes-base.executeWorkflow',
      parameters: {
        workflowId: '123abc'
      }
    },
    {
      id: '3',
      name: 'Outro Workflow',
      type: 'executeworkflow',
      parameters: {
        workflow: {
          value: '456def'
        }
      }
    }
  ]
};

// Teste da função completa
total++;
if (teste('Deve identificar todos os subworkflows corretamente', () => {
  const resultado = identifyAllSubworkflows(workflowTeste);
  if (!resultado.hasSubworkflows) {
    throw new Error('Não detectou subworkflows no workflow');
  }
  if (resultado.subworkflows.length !== 2) {
    throw new Error(`Detectou ${resultado.subworkflows.length} subworkflows, esperado: 2`);
  }
  
  // Verificar IDs dos subworkflows
  const ids = resultado.subworkflows.map(sw => sw.subworkflowId);
  if (!ids.includes('123abc') || !ids.includes('456def')) {
    throw new Error(`IDs incorretos: ${JSON.stringify(ids)}`);
  }
})) passou++;

// Workflow sem subworkflows
const workflowSimples = {
  name: 'Workflow Simples',
  nodes: [
    {
      id: '1',
      name: 'Início',
      type: 'n8n-nodes-base.start',
      parameters: {}
    },
    {
      id: '2',
      name: 'Função',
      type: 'n8n-nodes-base.function',
      parameters: {}
    }
  ]
};

// Teste do workflow sem subworkflows
total++;
if (teste('Deve retornar hasSubworkflows=false para workflow sem subworkflows', () => {
  const resultado = identifyAllSubworkflows(workflowSimples);
  if (resultado.hasSubworkflows) {
    throw new Error('Detectou subworkflows em um workflow que não tem');
  }
  if (resultado.subworkflows.length !== 0) {
    throw new Error(`Detectou ${resultado.subworkflows.length} subworkflows, esperado: 0`);
  }
})) passou++;

// Resumo final
console.log(`\n${colors.blue}=== RESUMO ====${colors.reset}`);
console.log(`Total de testes: ${total}`);
console.log(`${colors.green}Testes passados: ${passou}${colors.reset}`);

if (passou < total) {
  console.log(`${colors.red}Testes falhos: ${total - passou}${colors.reset}`);
  console.log(`\n${colors.red}⚠️  ATENÇÃO: Alguns testes falharam!${colors.reset}`);
  process.exit(1);
} else {
  console.log(`\n${colors.green}✅ TODOS OS TESTES PASSARAM!${colors.reset}`);
  console.log(`\n${colors.cyan}Os padrões de detecção de subworkflows estão funcionando corretamente.${colors.reset}`);
} 