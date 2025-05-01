/**
 * Módulo principal para ferramentas de subworkflows
 * 
 * Este arquivo exporta todas as funções relacionadas a subworkflows
 * para facilitar sua importação em outros módulos.
 */

// Importar padrões e funções principais
const patterns = require('./core/patterns');

// Importar ferramentas de identificação
const identificador = require('./detectors/identificador');

// Importar utilitários
const duplicator = require('./utils/duplicator');

// Exportar todos os módulos
module.exports = {
  // Padrões e detecção básica
  SUBWORKFLOW_PATTERNS: patterns.SUBWORKFLOW_PATTERNS,
  identifySubworkflowFromNode: patterns.identifySubworkflowFromNode,
  identifyAllSubworkflows: patterns.identifyAllSubworkflows,
  
  // Identificador avançado
  identificarSubworkflows: identificador.identificarSubworkflows,
  
  // Utilitários de duplicação
  duplicateWorkflowWithSubworkflows: duplicator.duplicateWorkflowWithSubworkflows,
  getWorkflow: duplicator.getWorkflow,
  duplicateWorkflow: duplicator.duplicateWorkflow,
  updateSubworkflowReferences: duplicator.updateSubworkflowReferences
}; 