# Implementação de Cobrança por Faixas de Tokens

## Visão Geral

Este sistema implementa um modelo de cobrança híbrido que combina:
- **Cobrança fixa mensal**: R$ 400 no início de cada período (cobre até 4M tokens)
- **Cobrança por faixas**: R$ 100 por cada 8M tokens adicionais
- **Cobrança imediata**: Quando os limites são excedidos

## Estrutura do Modelo

### Faixas de Cobrança
- **0 - 8M tokens**: R$ 400 (cobrança fixa no início do mês)
- **8M+ tokens**: R$ 100 a cada 8M tokens (cobrança imediata e contínua)
  - 8M-16M: R$ 100
  - 16M-24M: R$ 100  
  - 24M-32M: R$ 100
  - 32M-40M: R$ 100
  - E assim por diante...

### Exemplos de Cobrança
- **5M tokens**: R$ 400 (dentro do limite incluso)
- **10M tokens**: R$ 400 + R$ 100 = R$ 500 (excede 8M)
- **18M tokens**: R$ 400 + R$ 200 = R$ 600 (excede 16M)
- **25M tokens**: R$ 400 + R$ 300 = R$ 700 (excede 24M)
- **50M tokens**: R$ 400 + R$ 600 = R$ 1000 (excede 48M)
- **100M tokens**: R$ 400 + R$ 1200 = R$ 1600 (excede 96M)

## Arquitetura da Solução

### Backend (Node.js/Express)

#### 1. TokenBillingService (`src/services/tokenBillingService.js`)
Serviço principal que gerencia toda a lógica de cobrança:

```javascript
// Criar subscription mensal
const subscription = await tokenBillingService.createMonthlySubscription(customerId);

// Processar uso de tokens
await tokenBillingService.processTokenUsage(customerId, tokensUsed);

// Resetar ciclo no início do mês
await tokenBillingService.resetBillingCycle(customerId);
```

#### 2. Rotas API (`src/routes/tokenBillingRoutes.js`)
Endpoints para integração:

- `POST /api/token-billing/create-subscription` - Criar subscription mensal
- `POST /api/token-billing/process-usage` - Processar uso de tokens
- `POST /api/token-billing/reset-cycle` - Resetar ciclo de cobrança
- `GET /api/token-billing/summary/:customerId` - Obter resumo de cobrança
- `POST /api/token-billing/charge-tier` - Cobrar por faixa específica

### Frontend (React)

#### 1. TokenBillingService (`frontend/src/services/tokenBillingService.js`)
Cliente para comunicação com a API:

```javascript
// Processar uso de tokens
const result = await tokenBillingService.processTokenUsage(customerId, tokensUsed);

// Calcular custo estimado
const calculation = tokenBillingService.calculateTokenCost(tokensUsed);
```

#### 2. TokenBillingDemo (`frontend/src/components/TokenBillingDemo.jsx`)
Componente de demonstração com interface completa.

## Como Usar

### 1. Configuração Inicial

```bash
# Instalar dependências (se necessário)
npm install stripe

# Configurar variáveis de ambiente
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 2. Criar Subscription Mensal

```javascript
// No início do mês para cada cliente
const subscription = await tokenBillingService.createMonthlySubscription('cus_customer_id');
```

### 3. Processar Uso de Tokens

```javascript
// Sempre que o cliente usar tokens
await tokenBillingService.processTokenUsage('cus_customer_id', 10000000);
```

### 4. Resetar Ciclo (Início do Mês)

```javascript
// No primeiro dia de cada mês
await tokenBillingService.resetBillingCycle('cus_customer_id');
```

## Fluxo de Cobrança

### 1. Início do Mês
1. Cliente é cobrado R$ 400 (taxa fixa)
2. Contador de tokens é resetado para 0
3. Flags de cobrança por faixa são resetadas

### 2. Durante o Mês
1. Sistema monitora uso de tokens
2. Quando excede 4M tokens: cobra R$ 100 imediatamente
3. Quando excede 12M tokens: cobra R$ 100 imediatamente
4. Quando excede 20M tokens: cobra R$ 100 imediatamente
5. Processo se repete para cada faixa de 8M tokens

### 3. Fim do Mês
1. Sistema prepara para reset do próximo ciclo
2. Dados de uso são arquivados
3. Processo recomeça no próximo mês

## Monitoramento e Logs

### Logs Importantes
- Criação de subscriptions
- Processamento de uso de tokens
- Cobranças por faixa
- Reset de ciclos
- Erros de cobrança

### Métricas Recomendadas
- Total de tokens processados por mês
- Número de cobranças por faixa
- Receita por faixa de uso
- Clientes que excedem limites

## Tratamento de Erros

### Erros Comuns
1. **Falha na cobrança**: Retry automático com backoff exponencial
2. **Cliente sem método de pagamento**: Notificação e suspensão do serviço
3. **Limite de tokens excedido**: Cobrança imediata + notificação

### Estratégias de Recuperação
- Retry automático para falhas temporárias
- Notificações por email/SMS
- Suspensão gradual do serviço
- Dashboard de monitoramento

## Testes

### Testes Unitários
```javascript
// Testar cálculo de custo
const calculation = tokenBillingService.calculateTokenCost(10000000);
expect(calculation.totalCost).toBe(50000); // R$ 500

// Testar processamento de uso
await tokenBillingService.processTokenUsage('test_customer', 5000000);
```

### Testes de Integração
```javascript
// Testar fluxo completo
const subscription = await createMonthlySubscription();
await processTokenUsage(subscription.customer, 10000000);
const summary = await getBillingSummary(subscription.customer);
```

## Segurança

### Validações
- Verificar se customer existe antes de processar
- Validar quantidade de tokens (não negativa)
- Rate limiting para evitar spam
- Logs de auditoria para todas as operações

### Dados Sensíveis
- Customer IDs são armazenados de forma segura
- Tokens de API nunca expostos no frontend
- Logs não contêm informações sensíveis

## Próximos Passos

### Melhorias Futuras
1. **Dashboard de Analytics**: Visualização de uso e receita
2. **Alertas Proativos**: Notificar antes de exceder limites
3. **Planos Personalizados**: Diferentes limites por cliente
4. **Relatórios Automáticos**: Envio mensal de relatórios
5. **Integração com Webhooks**: Notificações em tempo real

### Otimizações
1. **Cache de Dados**: Reduzir consultas ao Stripe
2. **Processamento Assíncrono**: Queue para processar uso
3. **Batch Processing**: Processar múltiplos clientes
4. **Monitoring**: Alertas para falhas de cobrança
