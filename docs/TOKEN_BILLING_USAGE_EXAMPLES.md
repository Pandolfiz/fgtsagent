# Exemplos de Uso do Sistema de Cobrança por Faixas de Tokens

## 📋 Visão Geral

O sistema implementado permite cobrança por faixas de tokens com:
- **Taxa fixa**: R$ 400 no início do mês (cobre até 8M tokens)
- **Cobrança dinâmica**: R$ 100 a cada 8M tokens adicionais (cobrança contínua)
- **Cobrança imediata**: Quando limites são excedidos

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas

1. **`token_consumption`** - Registra cada operação de consumo
2. **`token_billing_charges`** - Registra cobranças por faixas
3. **`token_usage_summary`** - Resumo mensal por usuário

### Funções SQL

- `calculate_billing_tier(tokens_used)` - Calcula faixa de cobrança
- `get_user_token_summary(user_id, period)` - Resumo de uso
- `record_token_consumption(...)` - Registra consumo

## 🔧 Uso da API

### 1. Processar Uso de Tokens

```javascript
// POST /api/token-billing/process-usage
const response = await fetch('/api/token-billing/process-usage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid',
    tokensUsed: 5000000, // 5M tokens
    operationType: 'chat',
    clientId: 'client-uuid',
    metadata: {
      conversationId: 'conv-123',
      agentId: 'agent-456'
    }
  })
});

const result = await response.json();
// {
//   "success": true,
//   "data": {
//     "consumptionId": "uuid",
//     "totalTokens": 5000000,
//     "tierCharges": [
//       {
//         "id": "uuid",
//         "billing_tier": "4M-12M",
//         "amount_charged": 10000,
//         "status": "succeeded"
//       }
//     ]
//   }
// }
```

### 2. Obter Resumo de Uso

```javascript
// GET /api/token-billing/user-summary/:userId
const response = await fetch('/api/token-billing/user-summary/user-uuid');
const summary = await response.json();
// {
//   "success": true,
//   "data": {
//     "total_tokens": 5000000,
//     "current_tier": "4M-12M",
//     "fixed_fee_charged": 40000,
//     "tier_charges_count": 1,
//     "tier_charges_total": 10000,
//     "total_charged": 50000
//   }
// }
```

### 3. Criar Subscription Mensal

```javascript
// POST /api/token-billing/create-subscription
const response = await fetch('/api/token-billing/create-subscription', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: 'cus_stripe_id'
  })
});
```

## 💻 Uso no Código

### Backend - Serviço

```javascript
const tokenBillingService = require('./services/tokenBillingService');

// Processar uso de tokens
const result = await tokenBillingService.processTokenUsage(
  userId,
  tokensUsed,
  'chat',
  clientId,
  { conversationId: 'conv-123' }
);

// Obter resumo
const summary = await tokenBillingService.getUserTokenSummary(userId);
```

### Frontend - Integração

```javascript
// Exemplo de integração no frontend
class TokenUsageTracker {
  async trackTokenUsage(userId, tokensUsed, operationType = 'chat') {
    try {
      const response = await fetch('/api/token-billing/process-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          tokensUsed,
          operationType
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Tokens processados:', result.data);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Erro ao processar tokens:', error);
      throw error;
    }
  }
}
```

## 📊 Monitoramento

### Consultas SQL Úteis

```sql
-- Resumo de uso por usuário no mês atual
SELECT * FROM get_user_token_summary('user-uuid');

-- Consumo de tokens por operação
SELECT 
  operation_type,
  SUM(tokens_used) as total_tokens,
  COUNT(*) as operations
FROM token_consumption 
WHERE user_id = 'user-uuid'
  AND created_at >= date_trunc('month', NOW())
GROUP BY operation_type;

-- Cobranças por faixas no período
SELECT 
  billing_tier,
  COUNT(*) as charges_count,
  SUM(amount_charged) as total_charged
FROM token_billing_charges 
WHERE user_id = 'user-uuid'
  AND created_at >= date_trunc('month', NOW())
GROUP BY billing_tier;
```

## 🔄 Fluxo Completo

1. **Usuário faz uma operação** (chat, API call, etc.)
2. **Sistema calcula tokens usados**
3. **Chama API** `/api/token-billing/process-usage`
4. **Sistema registra consumo** na tabela `token_consumption`
5. **Verifica se excedeu limites** e precisa cobrar
6. **Se excedeu, cobra imediatamente** via Stripe PaymentIntent
7. **Registra cobrança** na tabela `token_billing_charges`
8. **Retorna resultado** para o frontend

## ⚠️ Considerações Importantes

- **Cobrança imediata**: Quando limites são excedidos
- **Não duplicar cobranças**: Sistema verifica se já foi cobrado
- **RLS habilitado**: Usuários só veem seus próprios dados
- **Logs completos**: Todas as operações são registradas
- **Integração Stripe**: Usa PaymentIntents para cobranças imediatas

## 🧪 Testes

```javascript
// Teste básico
const testTokenUsage = async () => {
  const result = await tokenBillingService.processTokenUsage(
    'test-user-id',
    1000000, // 1M tokens
    'chat'
  );
  
  console.log('Resultado:', result);
  // Deve retornar: { consumptionId: 'uuid', totalTokens: 1000000, tierCharges: [] } (dentro do limite de 8M)
};

// Teste com excedente
const testTokenOverage = async () => {
  const result = await tokenBillingService.processTokenUsage(
    'test-user-id',
    10000000, // 10M tokens (excede 8M)
    'chat'
  );
  
  console.log('Resultado:', result);
  // Deve retornar: { consumptionId: 'uuid', totalTokens: 10000000, tierCharges: [charge] }
};
```
