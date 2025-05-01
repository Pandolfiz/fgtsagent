/**
 * Identificador Unificado de Subworkflows
 * 
 * Este script combina múltiplas estratégias para identificar subworkflows
 * em workflows do n8n com alta precisão.
 */

const fs = require('fs');
const path = require('path');
const { SUBWORKFLOW_PATTERNS, identifyAllSubworkflows } = require('../core/patterns');

// Configurações
const CONFIG = {
  // Diretório para salvar resultados
  outputDir: path.join(__dirname, '..', '..', '..', '..', 'resultados'),
  // Nível mínimo de confiança para considerar um subworkflow (0-100)
  minConfidence: 70,
  // Estratégias de detecção e seus pesos
  strategies: [
    { name: 'padroes-conhecidos', peso: 10 },
    { name: 'analise-de-nome', peso: 5 },
    { name: 'estrutura-do-no', peso: 8 },
    { name: 'parametros', peso: 7 },
    { name: 'relacoes', peso: 6 }
  ]
};

/**
 * Função principal para identificar subworkflows
 * @param {Object|string} input - Dados do workflow ou caminho para arquivo JSON
 * @param {Object} options - Opções de configuração
 * @returns {Object} Resultado da análise
 */
async function identificarSubworkflows(input, options = {}) {
  console.log('=== INICIANDO IDENTIFICAÇÃO DE SUBWORKFLOWS ===');
  
  // Mesclar opções com configuração padrão
  const config = { ...CONFIG, ...options };
  
  // Carregar workflow (de objeto ou arquivo)
  let workflowData;
  if (typeof input === 'string') {
    console.log(`Carregando workflow do arquivo: ${input}`);
    try {
      const fileData = fs.readFileSync(input, 'utf8');
      workflowData = JSON.parse(fileData);
    } catch (error) {
      console.error(`Erro ao carregar arquivo: ${error.message}`);
      return { success: false, error: `Erro ao carregar arquivo: ${error.message}` };
    }
  } else if (typeof input === 'object') {
    workflowData = input;
  } else {
    console.error('Entrada inválida: forneça um objeto de workflow ou caminho para arquivo JSON');
    return { success: false, error: 'Entrada inválida' };
  }
  
  // Validar estrutura do workflow
  if (!workflowData || !workflowData.nodes || !Array.isArray(workflowData.nodes)) {
    console.error('Estrutura de workflow inválida');
    return { success: false, error: 'Estrutura de workflow inválida' };
  }
  
  console.log(`Workflow: ${workflowData.name || 'Sem nome'}`);
  console.log(`Total de nós: ${workflowData.nodes.length}`);
  
  // 1. Aplicar todas as estratégias de detecção
  const candidatos = await aplicarEstrategias(workflowData, config);
  
  // 2. Combinar e classificar resultados
  const resultadoFinal = combinarResultados(candidatos, config);
  
  // 3. Determinar os 3 subworkflows mais prováveis
  const topSubworkflows = resultadoFinal.subworkflows
    .filter(sub => sub.confianca >= config.minConfidence)
    .sort((a, b) => b.confianca - a.confianca)
    .slice(0, 3);
  
  // 4. Preparar relatório
  const relatorio = {
    success: true,
    workflowName: workflowData.name,
    totalNos: workflowData.nodes.length,
    totalCandidatos: candidatos.length,
    totalSubworkflows: resultadoFinal.total,
    topSubworkflows: topSubworkflows,
    todosSubworkflows: resultadoFinal.subworkflows,
    estrategiasAplicadas: config.strategies.map(s => s.name),
    timestamp: new Date().toISOString()
  };
  
  // 5. Salvar relatório se necessário
  if (config.saveReport) {
    salvarRelatorio(relatorio, config);
  }
  
  // 6. Exibir resultados
  exibirResultados(relatorio);
  
  return relatorio;
}

/**
 * Aplica todas as estratégias de detecção configuradas
 * @param {Object} workflowData - Dados do workflow
 * @param {Object} config - Configuração
 * @returns {Array} Lista de candidatos a subworkflow
 */
async function aplicarEstrategias(workflowData, config) {
  console.log('\n=== APLICANDO ESTRATÉGIAS DE DETECÇÃO ===');
  
  const candidatos = [];
  
  // 1. Detecção por padrões conhecidos
  console.log('\n> Estratégia: Padrões Conhecidos');
  const resultado = identifyAllSubworkflows(workflowData);
  
  if (resultado.hasSubworkflows) {
    console.log(`Encontrados ${resultado.subworkflows.length} subworkflows`);
    
    for (const sub of resultado.subworkflows) {
      candidatos.push({
        id: sub.subworkflowId,
        nodeId: sub.nodeId,
        nodeName: sub.nodeName,
        nodeType: sub.nodeType,
        fonte: 'padroes-conhecidos',
        detalhes: {
          padraoDetectado: sub.detectionSource || 'padrão-geral'
        }
      });
    }
  } else {
    console.log('Nenhum subworkflow encontrado por padrões conhecidos');
  }
  
  // 2. Detecção por análise de nome
  console.log('\n> Estratégia: Análise de Nome');
  for (const node of workflowData.nodes) {
    if (node.name && (
      node.name.toLowerCase().includes('workflow') || 
      node.name.toLowerCase().includes('subflow') ||
      node.name.toLowerCase().includes('execut')
    )) {
      // Verificar se já existe como candidato
      const existente = candidatos.find(c => c.nodeId === node.id);
      
      if (!existente) {
        let subworkflowId = null;
        
        // Procurar ID em parâmetros
        if (node.parameters) {
          for (const [key, value] of Object.entries(node.parameters)) {
            if (
              (key.toLowerCase().includes('id') || key.toLowerCase().includes('workflow')) && 
              (typeof value === 'string' || typeof value === 'number')
            ) {
              subworkflowId = value.toString();
              break;
            }
          }
        }
        
        if (subworkflowId) {
          candidatos.push({
            id: subworkflowId,
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.type,
            fonte: 'analise-de-nome',
            detalhes: {
              nomeEncontrado: node.name
            }
          });
        }
      }
    }
  }
  
  // 3. Mais estratégias podem ser adicionadas aqui
  
  console.log(`\nTotal de candidatos após todas as estratégias: ${candidatos.length}`);
  return candidatos;
}

/**
 * Combina os resultados das várias estratégias e calcula confiança
 * @param {Array} candidatos - Lista de candidatos a subworkflow
 * @param {Object} config - Configuração
 * @returns {Object} Resultado combinado
 */
function combinarResultados(candidatos, config) {
  console.log('\n=== COMBINANDO RESULTADOS ===');
  
  // Agrupar candidatos por ID
  const grupos = {};
  
  for (const candidato of candidatos) {
    if (!candidato.id) continue;
    
    if (!grupos[candidato.id]) {
      grupos[candidato.id] = {
        id: candidato.id,
        nos: new Set(),
        fontes: new Set(),
        detalhes: [],
        confianca: 0
      };
    }
    
    const grupo = grupos[candidato.id];
    grupo.nos.add(candidato.nodeId);
    grupo.fontes.add(candidato.fonte);
    grupo.detalhes.push({
      nodeId: candidato.nodeId,
      nodeName: candidato.nodeName,
      nodeType: candidato.nodeType,
      fonte: candidato.fonte,
      detalhes: candidato.detalhes
    });
  }
  
  // Calcular confiança para cada grupo
  const subworkflows = Object.values(grupos).map(grupo => {
    // Confiança baseada em número de fontes e número de nós
    let confianca = 0;
    
    // 1. Peso por fontes que encontraram este subworkflow
    for (const fonte of grupo.fontes) {
      const estrategia = config.strategies.find(s => s.name === fonte);
      if (estrategia) {
        confianca += estrategia.peso;
      }
    }
    
    // 2. Ajuste por número de nós que apontam para este subworkflow
    confianca += Math.min(grupo.nos.size * 2, 10);
    
    // 3. Normalizar para escala 0-100
    confianca = Math.min(Math.round(confianca * 5), 100);
    
    return {
      id: grupo.id,
      numeroDeNos: grupo.nos.size,
      fontes: Array.from(grupo.fontes),
      confianca: confianca,
      detalhes: grupo.detalhes
    };
  });
  
  return {
    total: subworkflows.length,
    subworkflows: subworkflows.sort((a, b) => b.confianca - a.confianca)
  };
}

/**
 * Salva o relatório em um arquivo JSON
 * @param {Object} relatorio - Relatório gerado
 * @param {Object} config - Configuração
 */
function salvarRelatorio(relatorio, config) {
  try {
    // Criar diretório se não existir
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `subworkflows-${relatorio.workflowName || 'sem-nome'}-${timestamp}.json`;
    const filepath = path.join(config.outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(relatorio, null, 2), 'utf8');
    console.log(`\nRelatório salvo em: ${filepath}`);
  } catch (error) {
    console.error(`Erro ao salvar relatório: ${error.message}`);
  }
}

/**
 * Exibe os resultados da análise
 * @param {Object} relatorio - Relatório gerado
 */
function exibirResultados(relatorio) {
  console.log('\n===== OS 3 SUBWORKFLOWS MAIS PROVÁVEIS =====');
  
  if (relatorio.topSubworkflows.length === 0) {
    console.log('❌ Nenhum subworkflow encontrado com confiança suficiente');
    return;
  }
  
  if (relatorio.topSubworkflows.length === 3) {
    console.log('✅ Sucesso! Identificamos os 3 subworkflows com alta confiança:');
  } else {
    console.log(`⚠️ Encontramos apenas ${relatorio.topSubworkflows.length} subworkflow(s) com confiança suficiente:`);
  }
  
  for (let i = 0; i < relatorio.topSubworkflows.length; i++) {
    const sub = relatorio.topSubworkflows[i];
    const detalhePrincipal = sub.detalhes[0] || {};
    
    console.log(`\n[${i+1}] ${sub.id}`);
    console.log(`   Nó: ${detalhePrincipal.nodeName || 'Desconhecido'}`);
    console.log(`   Tipo: ${detalhePrincipal.nodeType || 'Desconhecido'}`);
    console.log(`   Confiança: ${sub.confianca}%`);
  }
}

// Exportar funções
module.exports = {
  identificarSubworkflows,
  identificarPorPadroes: identifyAllSubworkflows
};

// Se executado diretamente
if (require.main === module) {
  const args = process.argv.slice(2);
  const inputFile = args[0];
  
  if (!inputFile) {
    console.error('Uso: node identificador.js <caminho-do-workflow.json> [--save]');
    process.exit(1);
  }
  
  const options = {
    saveReport: args.includes('--save')
  };
  
  identificarSubworkflows(inputFile, options)
    .then(result => {
      if (!result.success) {
        console.error('Falha na análise:', result.error);
        process.exit(1);
      }
      // Processo concluído com sucesso
    })
    .catch(error => {
      console.error('Erro fatal:', error);
      process.exit(1);
    });
} 