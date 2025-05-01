# Scripts para Gerenciamento de Agentes

Este diretório contém scripts para gerenciar a criação e consulta de agentes no sistema. Os scripts interagem com a API Supabase para criar agentes a partir de templates predefinidos.

## Configuração

Antes de utilizar os scripts, certifique-se de que o arquivo `.env` está configurado corretamente com as seguintes variáveis:

```
SUPABASE_URL=https://sua-instancia.supabase.co
SUPABASE_SERVICE_KEY=sua-chave-de-serviço
```

## Scripts Disponíveis

### 1. `create-agent.js`

Cria novos agentes a partir de templates disponíveis. O script:
- Verifica se o usuário existe e tem acesso à organização
- Lista os templates disponíveis
- Cria os agentes para cada template disponível
- Configura as permissões necessárias

**Uso:**
```bash
node src/create-agent.js
```

### 2. `list-agents.js`

Lista todos os agentes criados no sistema. O script:
- Consulta a tabela `client_agents` via API Supabase
- Tenta executar consultas SQL alternativas se necessário
- Mostra informações detalhadas sobre cada agente

**Uso:**
```bash
node src/list-agents.js
```

### 3. `list-templates.js`

Lista todos os templates disponíveis no sistema. O script:
- Consulta a tabela `agent_templates` via API Supabase
- Mostra informações detalhadas sobre cada template, incluindo IDs de workflow do n8n

**Uso:**
```bash
node src/list-templates.js
```

### 4. `test-rpc.js`

Testa a funcionalidade RPC (Remote Procedure Call) para executar consultas SQL diretas. O script:
- Testa a função `exec_sql` com consultas simples
- Lista tabelas disponíveis no esquema público
- Verifica funções SQL disponíveis

**Uso:**
```bash
node src/test-rpc.js
```

### 5. `summary.js`

Gera um resumo completo e organizado de todos os templates e agentes no sistema. O script:
- Lista todos os templates disponíveis com detalhes
- Lista todos os agentes criados com associação aos seus templates
- Fornece estatísticas gerais do sistema
- Agrupa agentes por organização

**Uso:**
```bash
node src/summary.js
```

## Estrutura do Banco de Dados

O sistema utiliza as seguintes tabelas principais:

1. `agent_templates` - Armazena os templates disponíveis para criar agentes
   - Campos principais: id, name, description, n8n_workflow_id, is_active

2. `client_agents` - Armazena os agentes criados para os clientes
   - Campos principais: id, name, description, template_id, organization_id, created_by, is_active

## Notas Importantes

- O script de criação de agentes pode encontrar erros ao tentar criar funções SQL. Nesses casos, as funções são criadas manualmente.
- Para visualizar os detalhes completos dos agentes e templates, use o script `summary.js`.
- Os IDs de usuário, organização e templates são específicos para cada ambiente. 