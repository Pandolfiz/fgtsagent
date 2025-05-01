# Ferramentas para Gerenciamento de Subworkflows

Este diretório contém scripts e utilitários para trabalhar com subworkflows no n8n.

## Organização

- `core/` - Funções e padrões essenciais
- `detectors/` - Scripts para detectar subworkflows
- `utils/` - Utilitários auxiliares
- `testers/` - Scripts de teste

## Como usar

1. Para usar padrões comuns de detecção:
   ```js
   const { SUBWORKFLOW_PATTERNS } = require('./core/patterns');
   ```

2. Para identificar subworkflows em um workflow:
   ```js
   const { identifySubworkflows } = require('./detectors/identificador');
   const resultado = identifySubworkflows(workflowData);
   ```

3. Para duplicar workflows com seus subworkflows:
   ```js
   const { duplicateWorkflowWithSubworkflows } = require('./utils/duplicator');
   const resultado = await duplicateWorkflowWithSubworkflows(workflowId, newName);
   ```

## Documentação Adicional

Para mais informações, consulte o [README-subworkflows.md](../../../README-subworkflows.md) principal. 