# Sistema de Cobrança por Consumo de Tokens (Estrutura Simplificada)

## 📋 Visão Geral

O sistema foi simplificado para rastrear o consumo de tokens com **estrutura mínima** (apenas 4 colunas na `token_consumption` e apenas `client_id` nas duas tabelas), com consolidação automática por cliente.

## 🗄️ Estrutura das Tabelas

### `token_consumption` - Estrutura Simplificada
Cada linha representa **um consumo de tokens**:

```sql
CREATE TABLE token_consumption (
  id UUID PRIMARY KEY,                      -- ID único do registro
  client_id UUID NOT NULL,                  -- ID do cliente (referência única)
  tokens_used INTEGER NOT NULL,             -- Tokens usados
  created_at TIMESTAMP WITH TIME ZONE       -- Timestamp da criação
);
```

### `token_usage_summary` - Resumo Consolidado
Uma linha por cliente com estatísticas consolidadas:

```sql
CREATE TABLE token_usage_summary (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL,                  -- ID do cliente (referência única)
  billing_period_start TIMESTAMP,           -- Início do período de cobrança
  billing_period_end TIMESTAMP,             -- Fim do período de cobrança
  total_tokens_used INTEGER,                -- Total de tokens no período
  total_responses INTEGER,                  -- Total de consumos no período
  average_tokens_per_response NUMERIC,      -- Média de tokens por consumo
  last_response_at TIMESTAMP,               -- Último consumo
  fixed_fee_charged INTEGER,                -- Taxa fixa cobrada
  tier_charges_total INTEGER,               -- Total de cobranças por faixas
  total_amount_charged INTEGER,             -- Total geral cobrado
  status TEXT,                              -- Status do resumo
  created_at TIMESTAMP,                     -- Data de criação
  updated_at TIMESTAMP                      -- Data de atualização
);
```

## 📅 Período de Cobrança Baseado na Data da Assinatura

O sistema agora calcula o período de cobrança baseado no **dia da assinatura** de cada cliente:

### Como Funciona
- **Início**: Dia da assinatura no mês atual (ex: 15/08/2025 se assinatura foi criada no dia 15)
- **Fim**: Dia anterior da assinatura no próximo mês (ex: 14/09/2025)
- **Timezone**: UTC para evitar problemas de fuso horário
- **Flexibilidade**: Cada cliente pode ter seu período personalizado

### Exemplo Prático
```javascript
// Cliente com assinatura criada no dia 15
// Período atual: 15/08/2025 a 14/09/2025
// Próximo período: 15/09/2025 a 14/10/2025

// Cliente com assinatura criada no dia 1
// Período atual: 01/09/2025 a 30/09/2025
// Próximo período: 01/10/2025 a 31/10/2025
```

### Definir Data de Início da Assinatura
```javascript
// POST /api/token-billing/set-subscription-day
const response = await fetch('/api/token-billing/set-subscription-day', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: 'client-uuid',
    startDay: 15  // Dia do mês (1-31)
  })
});
```

## 🔧 Uso da API

### Processar Resposta Individual do Agente

```javascript
// POST /api/token-billing/process-usage
const response = await fetch('/api/token-billing/process-usage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: 'client-uuid',               // ID do cliente (obrigatório)
    tokensUsed: 1500                       // Tokens usados
  })
});

const result = await response.json();
// {
//   "success": true,
//   "data": {
//     "consumptionId": "uuid",
//     "totalTokens": 7003500,              // Total consolidado
//     "totalResponses": 4,                 // Total de respostas
//     "averageTokensPerResponse": 1750875, // Média por resposta
//     "tierCharges": []
//   }
// }
```

### Obter Resumo Consolidado por Cliente

```javascript
// GET /api/token-billing/client-summary/:clientId
const response = await fetch('/api/token-billing/client-summary/client-uuid');
const summary = await response.json();
// {
//   "success": true,
//   "data": {
//     "client_id": "client-uuid",
//     "total_tokens": 7003500,
//     "total_responses": 4,
//     "average_tokens_per_response": 1750875,
//     "current_tier": "0-8M",
//     "fixed_fee_charged": 40000,
//     "tier_charges_total": 0,
//     "total_charged": 40000,
//     "last_response_at": "2025-09-12T15:57:33.985688Z"
//   }
// }
```

## 💻 Integração no Código

### Backend - Serviço

```javascript
const tokenBillingService = require('./services/tokenBillingService');

// Processar consumo de tokens (estrutura simplificada)
const result = await tokenBillingService.processTokenUsage(
  clientId,             // ID do cliente (obrigatório)
  tokensUsed            // Tokens usados
);

// Obter resumo consolidado
const summary = await tokenBillingService.getClientTokenSummary(clientId);
```

### Frontend - Integração

```javascript
class TokenUsageTracker {
  async trackTokenUsage(clientId, tokensUsed) {
    try {
      const response = await fetch('/api/token-billing/process-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,                           // ID do cliente (obrigatório)
          tokensUsed                          // Tokens usados
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Consumo registrado:', result.data);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Erro ao registrar consumo:', error);
      throw error;
    }
  }
}
```

## 📊 Monitoramento e Análise

### Consultas SQL Úteis

```sql
-- Respostas por conversa
SELECT 
  conversation_id,
  COUNT(*) as total_responses,
  SUM(tokens_used) as total_tokens,
  AVG(tokens_used) as avg_tokens_per_response
FROM token_consumption 
WHERE client_id = 'client-uuid'
  AND created_at >= date_trunc('month', NOW())
GROUP BY conversation_id
ORDER BY total_tokens DESC;

-- Respostas por modelo
SELECT 
  metadata->>'model' as model,
  COUNT(*) as responses,
  SUM(tokens_used) as total_tokens,
  AVG(tokens_used) as avg_tokens
FROM token_consumption 
WHERE client_id = 'client-uuid'
  AND created_at >= date_trunc('month', NOW())
GROUP BY metadata->>'model';

-- Respostas mais custosas
SELECT 
  response_id,
  conversation_id,
  tokens_used,
  agent_response,
  created_at
FROM token_consumption 
WHERE client_id = 'client-uuid'
  AND created_at >= date_trunc('month', NOW())
ORDER BY tokens_used DESC
LIMIT 10;
```

## 🔄 Fluxo Completo

1. **Agente gera resposta** para o usuário
2. **Sistema calcula tokens** usados nesta resposta específica
3. **Chama API** `/api/token-billing/process-usage` com dados da resposta
4. **Sistema registra** resposta individual na `token_consumption`
5. **Trigger automático** atualiza resumo consolidado na `token_usage_summary`
6. **Verifica cobranças** por faixas se necessário
7. **Retorna estatísticas** consolidadas para o frontend

## ⚠️ Considerações Importantes

- **Estrutura simplificada**: Apenas 4 colunas essenciais na `token_consumption`
- **Apenas client_id**: Ambas as tabelas usam apenas `client_id` (sem `user_id`)
- **Cada consumo é registrado individualmente** na `token_consumption`
- **Resumo é atualizado automaticamente** via trigger SQL
- **Estatísticas incluem**: total de tokens, total de consumos, média por consumo
- **API simplificada**: Apenas `clientId` e `tokensUsed` são necessários

## 🧪 Exemplo de Uso Completo

```javascript
// Simular múltiplos consumos de tokens
const tokenUsages = [1500, 2000, 3000, 1000];

// Processar cada consumo
for (const tokensUsed of tokenUsages) {
  await tokenBillingService.processTokenUsage(
    clientId,             // ID do cliente
    tokensUsed            // Tokens usados
  );
}

// Obter resumo final
const summary = await tokenBillingService.getClientTokenSummary(clientId);
console.log('Resumo consolidado:', summary);
// {
//   client_id: 'client-uuid',
//   total_tokens: 7500,
//   total_responses: 4,
//   average_tokens_per_response: 1875,
//   current_tier: '0-8M',
//   fixed_fee_charged: 40000,
//   tier_charges_total: 0,
//   total_charged: 40000
// }
```
