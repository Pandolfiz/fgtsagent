# Scripts de Utilitários

Este diretório contém scripts de utilitários para o sistema, organizados por funcionalidade.

## Scripts Disponíveis

### Gerenciador de Subworkflows

Script para gerenciar subworkflows no n8n, incluindo identificação e duplicação de workflows com seus subworkflows.

**Uso:**

```bash
# Iniciar modo interativo
npm run subworkflows interactive

# Identificar subworkflows em um workflow (arquivo ou ID)
npm run subworkflows identify <arquivo-ou-id>

# Duplicar workflow com seus subworkflows
npm run subworkflows duplicate <workflow-id> -n "Novo Nome"

# Executar teste de detecção
npm run subworkflows test
```

## Estrutura

- `subworkflow-manager.js` - CLI para gerenciar subworkflows do n8n 