/**
 * Utilitário para duplicar workflows com seus subworkflows
 */

const fetch = require('node-fetch');
const { identifyAllSubworkflows } = require('../core/patterns');

/**
 * Duplicar um workflow com todos os seus subworkflows
 * @param {string} workflowId - ID do workflow principal
 * @param {string} newName - Novo nome para o workflow duplicado
 * @param {Object} options - Opções de configuração
 * @returns {Promise<Object>} Resultado da duplicação
 */
async function duplicateWorkflowWithSubworkflows(workflowId, newName, options = {}) {
  console.log(`\n=== INICIANDO DUPLICAÇÃO COMPLETA DE WORKFLOW ===`);
  
  // Configurações
  const config = {
    n8nApiUrl: process.env.N8N_API_URL?.endsWith('/') 
      ? process.env.N8N_API_URL.slice(0, -1) 
      : process.env.N8N_API_URL,
    n8nApiKey: process.env.N8N_API_KEY,
    ...options
  };
  
  // Validar configurações
  if (!config.n8nApiUrl || !config.n8nApiKey) {
    return {
      success: false,
      error: 'Variáveis de ambiente N8N_API_URL e N8N_API_KEY são obrigatórias'
    };
  }
  
  try {
    // 1. Obter dados do workflow original
    console.log(`\n--- Obtendo workflow original: ${workflowId} ---`);
    const workflow = await getWorkflow(workflowId, config);
    console.log(`Nome do workflow: ${workflow.name}`);
    console.log(`Número de nós: ${workflow.nodes.length}`);
    
    // 2. Duplicar workflow principal
    console.log(`\n--- Duplicando workflow principal ---`);
    const duplicatedWorkflow = await duplicateWorkflow(workflowId, newName, config);
    
    if (!duplicatedWorkflow || !duplicatedWorkflow.id) {
      throw new Error('Falha ao duplicar workflow principal');
    }
    
    console.log(`Workflow principal duplicado com ID: ${duplicatedWorkflow.id}`);
    
    // 3. Identificar subworkflows
    console.log('\n--- Identificando subworkflows ---');
    const subworkflowsInfo = identifyAllSubworkflows(workflow);
    
    if (subworkflowsInfo.hasSubworkflows) {
      console.log(`Encontrados ${subworkflowsInfo.subworkflows.length} potenciais subworkflows`);
    } else {
      console.log('Nenhum subworkflow encontrado');
      return {
        success: true,
        mainWorkflow: duplicatedWorkflow,
        subworkflows: []
      };
    }
    
    // 4. Duplicar cada subworkflow
    console.log('\n--- Duplicando subworkflows ---');
    const subworkflowsMap = [];
    const duplicatedSubworkflows = [];
    
    for (const sub of subworkflowsInfo.subworkflows) {
      // Pular nós de trigger (que não têm ID de workflow)
      if (!sub.subworkflowId || sub.nodeType === 'executeWorkflowTrigger') {
        console.log(`Pulando nó ${sub.nodeName} (tipo: ${sub.nodeType})`);
        continue;
      }
      
      try {
        // Obter dados do subworkflow original
        const subWorkflowData = await getWorkflow(sub.subworkflowId, config);
        
        // Verificar se é realmente um subworkflow (tem nó de trigger)
        const isActualSubworkflow = subWorkflowData.nodes?.some(
          node => node.type === 'n8n-nodes-base.executeWorkflowTrigger'
        );
        
        if (isActualSubworkflow) {
          const subName = `${newName} - ${subWorkflowData.name}`;
          console.log(`Duplicando subworkflow "${subWorkflowData.name}" como "${subName}"`);
          
          const duplicatedSub = await duplicateWorkflow(sub.subworkflowId, subName, config);
          
          subworkflowsMap.push({
            oldId: sub.subworkflowId,
            newId: duplicatedSub.id,
            name: duplicatedSub.name
          });
          
          duplicatedSubworkflows.push(duplicatedSub);
          console.log(`Subworkflow "${subName}" criado com ID: ${duplicatedSub.id}`);
        } else {
          console.log(`Workflow ${sub.subworkflowId} não é um subworkflow (não tem nó trigger)`);
        }
      } catch (error) {
        console.error(`Erro ao duplicar subworkflow ${sub.subworkflowId}: ${error.message}`);
        // Continuar mesmo com erro em um subworkflow
      }
    }
    
    // 5. Atualizar referências no workflow principal
    if (subworkflowsMap.length > 0) {
      console.log('\n--- Atualizando referências no workflow principal ---');
      const updatedWorkflow = await updateSubworkflowReferences(
        duplicatedWorkflow.id, 
        subworkflowsMap,
        config
      );
      console.log('Workflow principal atualizado com novas referências');
    }
    
    // 6. Retornar resultado
    return {
      success: true,
      mainWorkflow: duplicatedWorkflow,
      subworkflows: duplicatedSubworkflows,
      mappings: subworkflowsMap
    };
    
  } catch (error) {
    console.error('Erro durante a duplicação:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtém dados de um workflow
 * @param {string} workflowId - ID do workflow
 * @param {Object} config - Configuração
 * @returns {Promise<Object>} Dados do workflow
 */
async function getWorkflow(workflowId, config) {
  const response = await fetch(`${config.n8nApiUrl}/api/v1/workflows/${workflowId}`, {
    method: 'GET',
    headers: {
      'X-N8N-API-KEY': config.n8nApiKey
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao obter workflow: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

/**
 * Duplica um workflow
 * @param {string} workflowId - ID do workflow original
 * @param {string} newName - Novo nome
 * @param {Object} config - Configuração
 * @returns {Promise<Object>} Workflow duplicado
 */
async function duplicateWorkflow(workflowId, newName, config) {
  // 1. Obter workflow original
  const workflow = await getWorkflow(workflowId, config);
  
  // 2. Preparar payload para criação
  const payload = {
    name: newName || `Cópia de ${workflow.name}`,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings || {},
    active: false // Criar desativado por segurança
  };
  
  // 3. Criar novo workflow
  const response = await fetch(`${config.n8nApiUrl}/api/v1/workflows`, {
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': config.n8nApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao criar workflow: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

/**
 * Atualiza referências de subworkflows em um workflow
 * @param {string} workflowId - ID do workflow principal
 * @param {Array} subworkflowsMap - Mapa de IDs antigos para novos
 * @param {Object} config - Configuração
 * @returns {Promise<Object>} Workflow atualizado
 */
async function updateSubworkflowReferences(workflowId, subworkflowsMap, config) {
  console.log(`Atualizando referências de subworkflows no workflow ${workflowId}`);
  
  try {
    // 1. Obter workflow atual
    const workflow = await getWorkflow(workflowId, config);
    
    // 2. Atualizar referências nos nós
    let referenciasAtualizadas = 0;
    
    for (const node of workflow.nodes) {
      if (node.type === 'n8n-nodes-base.executeWorkflow' && node.parameters?.workflowId) {
        const mapping = subworkflowsMap.find(m => m.oldId === node.parameters.workflowId);
        
        if (mapping) {
          console.log(`Atualizando referência em nó "${node.name}": ${node.parameters.workflowId} -> ${mapping.newId}`);
          node.parameters.workflowId = mapping.newId;
          referenciasAtualizadas++;
        }
      }
    }
    
    console.log(`Total de referências atualizadas: ${referenciasAtualizadas}`);
    
    if (referenciasAtualizadas === 0) {
      console.log('Nenhuma referência precisou ser atualizada');
      return workflow;
    }
    
    // 3. Preparar payload para atualização
    const updatePayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings || {}
    };
    
    // 4. Atualizar workflow
    const updateResponse = await fetch(`${config.n8nApiUrl}/api/v1/workflows/${workflowId}`, {
      method: 'PUT',
      headers: {
        'X-N8N-API-KEY': config.n8nApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Erro ao atualizar workflow: ${updateResponse.status} - ${errorText}`);
    }
    
    return updateResponse.json();
  } catch (error) {
    console.error(`Erro ao atualizar referências: ${error.message}`);
    throw error;
  }
}

// Exportar funções
module.exports = {
  duplicateWorkflowWithSubworkflows,
  getWorkflow,
  duplicateWorkflow,
  updateSubworkflowReferences
};

// Se executado diretamente
if (require.main === module) {
  // Obter parâmetros da linha de comando
  const args = process.argv.slice(2);
  const workflowId = args[0];
  const newName = args[1] || `Duplicado ${new Date().toISOString()}`;
  
  if (!workflowId) {
    console.error('Uso: node duplicator.js <workflow_id> [novo_nome]');
    process.exit(1);
  }
  
  console.log(`Iniciando duplicação de workflow ${workflowId} com nome "${newName}"`);
  
  duplicateWorkflowWithSubworkflows(workflowId, newName)
    .then(result => {
      if (result.success) {
        console.log('\nDuplicação concluída com sucesso!');
        console.log(`Workflow principal: ${result.mainWorkflow.id}`);
        console.log(`Subworkflows duplicados: ${result.subworkflows.length}`);
      } else {
        console.error('\nErro na duplicação:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Erro fatal:', error);
      process.exit(1);
    });
} 