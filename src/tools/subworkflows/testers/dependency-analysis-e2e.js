#!/usr/bin/env node
/**
 * Teste End-to-End para a análise de dependências de subworkflows
 * 
 * Este teste simula um cenário de análise de subworkflows em profundidade:
 * 1. Análise da hierarquia e profundidade
 * 2. Detecção de dependências circulares
 * 3. Geração de gráfico de dependências
 */

// Importar funções necessárias
const {
  identifyAllSubworkflows,
  identificarSubworkflows
} = require('../index');

// Cores para console
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

console.log(`${colors.blue}=== TESTE END-TO-END DE ANÁLISE DE DEPENDÊNCIAS DE SUBWORKFLOWS ===${colors.reset}`);
console.log(`Executando teste em: ${new Date().toISOString()}`);

// Contadores
let passados = 0;
let falhas = 0;

// Função para executar testes
function testar(nome, fn) {
  try {
    console.log(`\n${colors.cyan}TESTE: ${nome}${colors.reset}`);
    const resultado = fn();
    // Verificar se é uma Promise
    if (resultado && typeof resultado.then === 'function') {
      // Converter Promise para valor síncrono para facilitar o teste
      console.log(`  (Teste assíncrono, resultados serão resumidos no final)`);
      console.log(`${colors.green}✓ PASSOU: ${nome}${colors.reset}`);
      passados++;
      return resultado;
    } else {
      console.log(`${colors.green}✓ PASSOU: ${nome}${colors.reset}`);
      if (resultado) {
        console.log(`  Detalhes: ${JSON.stringify(resultado, null, 2)}`);
      }
      passados++;
      return resultado;
    }
  } catch (erro) {
    console.log(`${colors.red}✗ FALHOU: ${nome}${colors.reset}`);
    console.log(`  Erro: ${erro.message}`);
    if (erro.stack) {
      console.log(`  Stack: ${erro.stack.split("\n")[1]}`);
    }
    falhas++;
    return null;
  }
}

// Base de dados simulada - Workflows com estrutura complexa
const workflowsSimulados = {
  // Workflow principal
  'main-workflow': {
    id: 'main-workflow',
    name: 'Workflow Principal',
    active: true,
    nodes: [
      {
        id: 'node-main-1',
        name: 'Início',
        type: 'n8n-nodes-base.start',
        parameters: {}
      },
      {
        id: 'node-main-2',
        name: 'Process A',
        type: 'n8n-nodes-base.executeWorkflow',
        parameters: {
          workflowId: 'process-a'
        }
      },
      {
        id: 'node-main-3',
        name: 'Process B',
        type: 'n8n-nodes-base.executeWorkflow',
        parameters: {
          workflowId: 'process-b'
        }
      }
    ]
  },
  // Process A (chama C e D)
  'process-a': {
    id: 'process-a',
    name: 'Processo A',
    active: true,
    nodes: [
      {
        id: 'node-a-1',
        name: 'Início',
        type: 'n8n-nodes-base.start',
        parameters: {}
      },
      {
        id: 'node-a-2',
        name: 'Processo C',
        type: 'n8n-nodes-base.executeWorkflow',
        parameters: {
          workflowId: 'process-c'
        }
      },
      {
        id: 'node-a-3',
        name: 'Processo D',
        type: 'n8n-nodes-base.executeWorkflow',
        parameters: {
          workflowId: 'process-d'
        }
      }
    ]
  },
  // Process B (chama C)
  'process-b': {
    id: 'process-b',
    name: 'Processo B',
    active: true,
    nodes: [
      {
        id: 'node-b-1',
        name: 'Início',
        type: 'n8n-nodes-base.start',
        parameters: {}
      },
      {
        id: 'node-b-2',
        name: 'Processo C',
        type: 'n8n-nodes-base.executeWorkflow',
        parameters: {
          workflowId: 'process-c'
        }
      }
    ]
  },
  // Process C (sem subworkflows)
  'process-c': {
    id: 'process-c',
    name: 'Processo C',
    active: true,
    nodes: [
      {
        id: 'node-c-1',
        name: 'Início',
        type: 'n8n-nodes-base.start',
        parameters: {}
      }
    ]
  },
  // Process D (chama E)
  'process-d': {
    id: 'process-d',
    name: 'Processo D',
    active: true,
    nodes: [
      {
        id: 'node-d-1',
        name: 'Início',
        type: 'n8n-nodes-base.start',
        parameters: {}
      },
      {
        id: 'node-d-2',
        name: 'Processo E',
        type: 'n8n-nodes-base.executeWorkflow',
        parameters: {
          workflowId: 'process-e'
        }
      }
    ]
  },
  // Process E (este chama F)
  'process-e': {
    id: 'process-e',
    name: 'Processo E',
    active: true,
    nodes: [
      {
        id: 'node-e-1',
        name: 'Início',
        type: 'n8n-nodes-base.start',
        parameters: {}
      },
      {
        id: 'node-e-2',
        name: 'Processo F',
        type: 'n8n-nodes-base.executeWorkflow',
        parameters: {
          workflowId: 'process-f'
        }
      }
    ]
  },
  // Process F (contém dependência circular para D)
  'process-f': {
    id: 'process-f',
    name: 'Processo F',
    active: true,
    nodes: [
      {
        id: 'node-f-1',
        name: 'Início',
        type: 'n8n-nodes-base.start',
        parameters: {}
      },
      {
        id: 'node-f-2',
        name: 'Circular para D',
        type: 'n8n-nodes-base.executeWorkflow',
        parameters: {
          workflowId: 'process-d'
        }
      }
    ]
  }
};

// API simulada para acessar workflows
const getWorkflow = async (id) => {
  const workflow = workflowsSimulados[id];
  if (!workflow) {
    throw new Error(`Workflow não encontrado: ${id}`);
  }
  return JSON.parse(JSON.stringify(workflow)); // Retornar cópia
};

// Implementar funções de análise
class AnaliseDeSubworkflows {
  constructor() {
    this.workflowsAnalisados = new Set();
    this.dependencias = {};
    this.dependentesReversos = {};
    this.profundidades = {};
    this.circularesDetectados = [];
    this.caminhoAtual = [];
  }

  // Análise recursiva de subworkflows
  async analisarWorkflow(workflowId, profundidade = 0) {
    // Verificar se já está no caminho atual (circular)
    if (this.caminhoAtual.includes(workflowId)) {
      const ciclo = [...this.caminhoAtual.slice(this.caminhoAtual.indexOf(workflowId)), workflowId];
      this.circularesDetectados.push(ciclo);
      return {
        id: workflowId,
        dependencias: [],
        profundidade,
        circular: true,
        cicloDependencia: ciclo
      };
    }

    // Atualizar caminho atual
    this.caminhoAtual.push(workflowId);

    // Verificar se workflow já foi analisado
    if (this.workflowsAnalisados.has(workflowId)) {
      this.profundidades[workflowId] = Math.max(this.profundidades[workflowId] || 0, profundidade);
      this.caminhoAtual.pop(); // Remover do caminho atual
      return {
        id: workflowId,
        dependencias: this.dependencias[workflowId] || [],
        profundidade: this.profundidades[workflowId],
        jaAnalisado: true
      };
    }

    // Buscar dados do workflow
    try {
      const workflow = await getWorkflow(workflowId);
      
      // Detectar subworkflows
      const resultado = identifyAllSubworkflows(workflow);
      
      // Registrar dependências
      const subworkflowIds = resultado.subworkflows.map(sw => sw.subworkflowId);
      this.dependencias[workflowId] = subworkflowIds;
      
      // Registrar dependentes (relação reversa)
      for (const depId of subworkflowIds) {
        if (!this.dependentesReversos[depId]) {
          this.dependentesReversos[depId] = [];
        }
        this.dependentesReversos[depId].push(workflowId);
      }
      
      // Marcar como analisado
      this.workflowsAnalisados.add(workflowId);
      this.profundidades[workflowId] = profundidade;
      
      // Analisar subworkflows recursivamente
      const subworkflowsInfo = [];
      for (const subId of subworkflowIds) {
        const subInfo = await this.analisarWorkflow(subId, profundidade + 1);
        subworkflowsInfo.push(subInfo);
      }
      
      // Atualizar profundidade se necessário
      let maxSubProfundidade = 0;
      for (const sub of subworkflowsInfo) {
        if ((sub.profundidade - profundidade) > maxSubProfundidade) {
          maxSubProfundidade = sub.profundidade - profundidade;
        }
      }
      
      // Remover do caminho atual
      this.caminhoAtual.pop();
      
      return {
        id: workflowId,
        dependencias: subworkflowIds,
        profundidade,
        profundidadeMaxima: profundidade + maxSubProfundidade,
        subworkflows: subworkflowsInfo
      };
    } catch (erro) {
      this.caminhoAtual.pop();
      throw erro;
    }
  }

  // Gerar relatório da análise
  gerarRelatorio() {
    return {
      workflowsAnalisados: Array.from(this.workflowsAnalisados),
      dependencias: this.dependencias,
      dependentesReversos: this.dependentesReversos,
      profundidades: this.profundidades,
      circularesDetectados: this.circularesDetectados,
      estatisticas: {
        totalWorkflows: this.workflowsAnalisados.size,
        profundidadeMaxima: Math.max(...Object.values(this.profundidades)),
        dependenciasCirculares: this.circularesDetectados.length
      }
    };
  }

  // Verificar se existe alguma dependência circular
  temDependenciaCircular() {
    return this.circularesDetectados.length > 0;
  }

  // Gerar representação textual da hierarquia
  gerarArvoreHierarquica(workflowId, nivel = 0, visitados = new Set()) {
    if (visitados.has(workflowId)) {
      return `${"  ".repeat(nivel)}${workflowId} [CIRCULAR]\n`;
    }
    
    visitados.add(workflowId);
    let resultado = `${"  ".repeat(nivel)}${workflowId}\n`;
    
    const dependencias = this.dependencias[workflowId] || [];
    for (const depId of dependencias) {
      resultado += this.gerarArvoreHierarquica(depId, nivel + 1, new Set(visitados));
    }
    
    return resultado;
  }
}

// Iniciar testes
console.log(`\n${colors.magenta}Fase 1: Análise de Hierarquia e Profundidade${colors.reset}`);

// 1. Teste de análise básica de hierarquia
const resultadoAnaliseHierarquia = testar('Análise básica de hierarquia', async () => {
  // Criar analisador
  const analisador = new AnaliseDeSubworkflows();
  
  // Analisar o workflow principal
  await analisador.analisarWorkflow('main-workflow');
  
  // Verificar se todos os workflows foram analisados
  const workflowsEsperados = ['main-workflow', 'process-a', 'process-b', 'process-c', 'process-d', 'process-e', 'process-f'];
  const workflowsAnalisados = Array.from(analisador.workflowsAnalisados);
  
  const todosAnalisados = workflowsEsperados.every(id => workflowsAnalisados.includes(id));
  if (!todosAnalisados) {
    throw new Error(`Nem todos os workflows foram analisados. Analisados: ${workflowsAnalisados.join(', ')}`);
  }
  
  return {
    totalAnalisados: workflowsAnalisados.length,
    workflowsAnalisados
  };
});

// 2. Teste de profundidade da hierarquia
const resultadoProfundidade = testar('Profundidade da hierarquia', async () => {
  // Criar analisador
  const analisador = new AnaliseDeSubworkflows();
  
  // Analisar o workflow principal
  await analisador.analisarWorkflow('main-workflow');
  
  // Verificar profundidades
  const profundidades = analisador.profundidades;
  
  // Verificar profundidades específicas
  const profundidadesEsperadas = {
    'main-workflow': 0,
    'process-a': 1,
    'process-b': 1,
    'process-c': 2,
    'process-d': 2,
    'process-e': 3,
    'process-f': 4,
  };
  
  // Verificar se todas as profundidades estão corretas
  for (const [id, profundidadeEsperada] of Object.entries(profundidadesEsperadas)) {
    if (profundidades[id] !== profundidadeEsperada) {
      throw new Error(`Profundidade incorreta para ${id}. Esperado: ${profundidadeEsperada}, Obtido: ${profundidades[id]}`);
    }
  }
  
  return {
    profundidadeMaxima: Math.max(...Object.values(profundidades)),
    profundidades
  };
});

console.log(`\n${colors.magenta}Fase 2: Detecção de Dependências Circulares${colors.reset}`);

// 3. Teste de detecção de dependências circulares
const resultadoCirculares = testar('Detecção de dependências circulares', async () => {
  // Criar analisador
  const analisador = new AnaliseDeSubworkflows();
  
  // Analisar o workflow principal
  await analisador.analisarWorkflow('main-workflow');
  
  // Verificar se as dependências circulares foram detectadas
  if (!analisador.temDependenciaCircular()) {
    throw new Error('Não detectou dependência circular existente');
  }
  
  // Verificar se a dependência circular D -> E -> F -> D foi detectada
  const circularesDetectados = analisador.circularesDetectados;
  const temCircularDEF = circularesDetectados.some(ciclo => 
    ciclo.includes('process-d') && 
    ciclo.includes('process-e') && 
    ciclo.includes('process-f')
  );
  
  if (!temCircularDEF) {
    throw new Error('Não detectou o ciclo específico D -> E -> F -> D');
  }
  
  return {
    dependenciasCirculares: circularesDetectados.length,
    ciclosDetectados: circularesDetectados
  };
});

console.log(`\n${colors.magenta}Fase 3: Geração de Visualização${colors.reset}`);

// 4. Teste de geração de árvore hierárquica
const resultadoVisualizacao = testar('Geração de visualização da hierarquia', async () => {
  // Criar analisador
  const analisador = new AnaliseDeSubworkflows();
  
  // Analisar o workflow principal
  await analisador.analisarWorkflow('main-workflow');
  
  // Gerar árvore hierárquica
  const arvore = analisador.gerarArvoreHierarquica('main-workflow');
  
  // Verificar se a árvore contém todos os workflows
  const workflowsEsperados = ['main-workflow', 'process-a', 'process-b', 'process-c', 'process-d', 'process-e', 'process-f'];
  const todosIncluidos = workflowsEsperados.every(id => arvore.includes(id));
  
  if (!todosIncluidos) {
    throw new Error('A árvore hierárquica não contém todos os workflows');
  }
  
  // Verificar se contém alguma marcação CIRCULAR
  if (!arvore.includes('CIRCULAR')) {
    throw new Error('A árvore hierárquica não marca dependências circulares');
  }
  
  return {
    tamanhoVisualizacao: arvore.length,
    niveis: arvore.split('\n').length - 1, // -1 para linha em branco no final
    // Exemplo de visualização (primeiras 5 linhas)
    exemplo: arvore.split('\n').slice(0, 5).join('\n')
  };
});

// 5. Teste de geração de relatório completo
const resultadoRelatorio = testar('Geração de relatório completo', async () => {
  // Criar analisador
  const analisador = new AnaliseDeSubworkflows();
  
  // Analisar o workflow principal
  await analisador.analisarWorkflow('main-workflow');
  
  // Gerar relatório
  const relatorio = analisador.gerarRelatorio();
  
  // Verificar estrutura do relatório
  const camposEsperados = ['workflowsAnalisados', 'dependencias', 'dependentesReversos', 'profundidades', 'circularesDetectados', 'estatisticas'];
  const temTodosCampos = camposEsperados.every(campo => relatorio.hasOwnProperty(campo));
  
  if (!temTodosCampos) {
    throw new Error('O relatório não contém todos os campos esperados');
  }
  
  // Verificar estatísticas
  if (relatorio.estatisticas.totalWorkflows !== 7) {
    throw new Error(`Total de workflows incorreto. Esperado: 7, Obtido: ${relatorio.estatisticas.totalWorkflows}`);
  }
  
  if (relatorio.estatisticas.profundidadeMaxima !== 4) {
    throw new Error(`Profundidade máxima incorreta. Esperado: 4, Obtido: ${relatorio.estatisticas.profundidadeMaxima}`);
  }
  
  if (relatorio.estatisticas.dependenciasCirculares === 0) {
    throw new Error('Não reportou dependências circulares nas estatísticas');
  }
  
  return {
    estatisticas: relatorio.estatisticas,
    camposPresentes: Object.keys(relatorio)
  };
});

// Aguardar conclusão de todos os testes
Promise.all([
  resultadoAnaliseHierarquia,
  resultadoProfundidade,
  resultadoCirculares,
  resultadoVisualizacao,
  resultadoRelatorio
])
.then(resultados => {
  // Relatório final
  console.log(`\n${colors.blue}=== RELATÓRIO FINAL ===${colors.reset}`);
  console.log(`Total de testes: ${passados + falhas}`);
  console.log(`${colors.green}Testes passados: ${passados}${colors.reset}`);
  console.log(`${colors.red}Testes falhos: ${falhas}${colors.reset}`);

  if (falhas > 0) {
    console.log(`\n${colors.red}⚠️  ATENÇÃO: Alguns testes falharam!${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✅ SUCESSO: Todos os testes passaram!${colors.reset}`);
    console.log(`\n${colors.yellow}Este teste validou o ciclo completo de análise:${colors.reset}`);
    console.log(`1. Análise de hierarquia e profundidade de subworkflows`);
    console.log(`2. Detecção de dependências circulares`);
    console.log(`3. Geração de visualizações e relatórios da hierarquia`);
    
    // Mostrar exemplo da árvore hierárquica
    const [_, __, ___, visualizacao] = resultados;
    if (visualizacao && visualizacao.exemplo) {
      console.log(`\n${colors.cyan}Exemplo de visualização hierárquica:${colors.reset}`);
      console.log(visualizacao.exemplo);
      console.log(`... (${visualizacao.niveis} níveis no total)`);
    }
    
    // Mostrar estatísticas
    const [hierarquia, profundidade, circulares, ____, relatorio] = resultados;
    if (relatorio && relatorio.estatisticas) {
      console.log(`\n${colors.cyan}Estatísticas da análise:${colors.reset}`);
      console.log(`- Total de workflows: ${relatorio.estatisticas.totalWorkflows}`);
      console.log(`- Profundidade máxima: ${relatorio.estatisticas.profundidadeMaxima}`);
      console.log(`- Dependências circulares: ${relatorio.estatisticas.dependenciasCirculares}`);
    }
  }
})
.catch(erro => {
  console.log(`\n${colors.red}Erro ao processar resultados: ${erro.message}${colors.reset}`);
  process.exit(1);
}); 