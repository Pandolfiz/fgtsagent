#!/usr/bin/env node
/**
 * Teste simples para identificação de subworkflows
 */
const { identifyAllSubworkflows } = require('../core/patterns');

console.log('Iniciando teste de subworkflows...');

// Workflow de teste com subworkflow
const testWorkflow = {
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

console.log('Workflow de teste criado:', testWorkflow.name);
console.log('Nós:', testWorkflow.nodes.length);

// Verificar usando a função da biblioteca
const resultado = identifyAllSubworkflows(testWorkflow);

console.log('\nResultado da detecção:');
if (resultado.hasSubworkflows) {
  console.log('✅ Encontrados', resultado.subworkflows.length, 'subworkflows');
  
  console.log('\nDetalhes dos subworkflows:');
  for (const sub of resultado.subworkflows) {
    console.log(`- Nó: ${sub.nodeName}`);
    console.log(`  ID: ${sub.subworkflowId || 'N/A'}`);
    console.log(`  Tipo: ${sub.nodeType}`);
    console.log(`  Fonte: ${sub.detectionSource || 'não especificada'}`);
    console.log();
  }
} else {
  console.log('❌ Nenhum subworkflow encontrado');
}

// Testar casos adicionais
console.log('\n=== Testes adicionais ===');

// Caso 1: Nó com nome relacionado a workflow
const caso1 = {
  id: '4',
  name: 'Chamar Workflow de Processamento',
  type: 'n8n-nodes-base.function',
  parameters: {
    workflowID: '789ghi'
  }
};

console.log('\nCaso 1: Nó com nome relacionado a workflow');
const resultado1 = identifyAllSubworkflows({
  nodes: [caso1]
});

if (resultado1.hasSubworkflows) {
  console.log('✅ Subworkflow encontrado:', resultado1.subworkflows[0].subworkflowId);
} else {
  console.log('❌ Não detectado');
}

// Caso 2: Nó de trigger
const caso2 = {
  id: '5',
  name: 'Trigger de Subworkflow',
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  parameters: {}
};

console.log('\nCaso 2: Nó de trigger');
const resultado2 = identifyAllSubworkflows({
  nodes: [caso2]
});

if (resultado2.hasSubworkflows) {
  console.log('✅ Trigger encontrado');
} else {
  console.log('❌ Não detectado');
} 