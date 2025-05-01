/**
 * Padrões para detecção de subworkflows no n8n
 * Este módulo pode ser importado em outros scripts para garantir uma detecção consistente
 */

// Lista de padrões conhecidos para detectar subworkflows
const SUBWORKFLOW_PATTERNS = [
  // Padrão 1: Nó de execução de workflow padrão
  {
    check: (node) => node.type === 'n8n-nodes-base.executeWorkflow',
    extract: (node) => ({
      id: node.parameters?.workflowId,
      source: 'executeWorkflow-standard'
    })
  },
  
  // Padrão 2: Variação de caixa (sem maiúsculas)
  {
    check: (node) => node.type === 'n8n-nodes-base.executeworkflow',
    extract: (node) => ({
      id: node.parameters?.workflowId,
      source: 'executeworkflow-lowercase'
    })
  },
  
  // Padrão 3: Execute Workflow (antigo formato)
  {
    check: (node) => node.type?.includes('executeWorkflow') || node.name?.includes('Execute Workflow'),
    extract: (node) => ({
      id: node.parameters?.workflowId || node.parameters?.workflow?.value,
      source: 'executeWorkflow-legacy'
    })
  },
  
  // Padrão 4: Execute Sub-workflow (novo formato)
  {
    check: (node) => node.type?.includes('executeworkflow') || node.name?.includes('Execute Sub-workflow'),
    extract: (node) => ({
      id: node.parameters?.workflowId || node.parameters?.workflow?.value,
      source: 'executeSubworkflow'
    })
  },
  
  // Padrão 5: Referência direta em parâmetros
  {
    check: (node) => node.parameters?.hasOwnProperty('workflowId'),
    extract: (node) => ({
      id: node.parameters.workflowId,
      source: 'direct-parameter'
    })
  },
  
  // Padrão 6: Estrutura de objeto de workflow aninhada
  {
    check: (node) => node.parameters?.workflow?.value,
    extract: (node) => ({
      id: node.parameters.workflow.value,
      source: 'nested-workflow-object'
    })
  },
  
  // Padrão 7: Nós com nome relacionado a workflows
  {
    check: (node) => node.name?.toLowerCase().includes('workflow') || node.name?.toLowerCase().includes('subflow'),
    extract: (node) => {
      // Procurar IDs em parâmetros
      if (node.parameters) {
        for (const [key, value] of Object.entries(node.parameters)) {
          if (
            (key.toLowerCase().includes('id') || key.toLowerCase().includes('workflow')) && 
            (typeof value === 'string' || typeof value === 'number')
          ) {
            return { id: value, source: `parameter-${key}` };
          }
        }
      }
      return { id: null, source: 'name-pattern-only' };
    }
  }
];

/**
 * Identifica subworkflow a partir de um nó
 * @param {Object} node - Nó do workflow
 * @returns {Object|null} Informações do subworkflow ou null
 */
function identifySubworkflowFromNode(node) {
  if (!node || typeof node !== 'object') return null;
  
  for (const pattern of SUBWORKFLOW_PATTERNS) {
    if (pattern.check(node)) {
      const subworkflowInfo = pattern.extract(node);
      
      if (subworkflowInfo && subworkflowInfo.id) {
        return {
          nodeId: node.id,
          nodeName: node.name || `Node ${node.id}`,
          subworkflowId: subworkflowInfo.id.toString(),
          nodeType: node.type,
          detectionSource: subworkflowInfo.source
        };
      } else if (node.type === 'n8n-nodes-base.executeWorkflowTrigger') {
        // Caso especial para nós de trigger
        return {
          nodeId: node.id,
          nodeName: node.name || `Node ${node.id}`,
          nodeType: 'executeWorkflowTrigger',
          detectionSource: 'trigger-node'
        };
      }
    }
  }
  
  return null;
}

/**
 * Identificar todos os subworkflows em um workflow
 * @param {Object} workflowData - Dados do workflow
 * @returns {Object} Resultado da identificação de subworkflows
 */
function identifyAllSubworkflows(workflowData) {
  if (!workflowData || !workflowData.nodes || !Array.isArray(workflowData.nodes)) {
    return { hasSubworkflows: false, subworkflows: [] };
  }
  
  // Identificar todos os subworkflows
  const subworkflows = [];
  
  for (const node of workflowData.nodes) {
    const subworkflowInfo = identifySubworkflowFromNode(node);
    if (subworkflowInfo) {
      subworkflows.push(subworkflowInfo);
    }
  }
  
  return {
    hasSubworkflows: subworkflows.length > 0,
    subworkflows: subworkflows
  };
}

// Exportar funções e constantes
module.exports = {
  SUBWORKFLOW_PATTERNS,
  identifySubworkflowFromNode,
  identifyAllSubworkflows
}; 