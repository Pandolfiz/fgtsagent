# 🚀 Guia de Integração Stripe - SaaS Platform

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura da Integração](#arquitetura-da-integração)
3. [Fluxo de Pagamento](#fluxo-de-pagamento)
4. [Configurações](#configurações)
5. [Componentes Frontend](#componentes-frontend)
6. [Serviços Backend](#serviços-backend)
7. [Webhooks e Eventos](#webhooks-e-eventos)
8. [Tratamento de Erros](#tratamento-de-erros)
9. [Troubleshooting](#troubleshooting)
10. [Cartões de Teste](#cartões-de-teste)
11. [Logs e Debug](#logs-e-debug)

---

## 🎯 Visão Geral

Nossa integração Stripe implementa um sistema de **SetupIntents** para assinaturas com **período de teste gratuito** e **cobrança automática**. O sistema é projetado para:

- ✅ **Criar SetupIntents** no backend
- ✅ **Confirmar SetupIntents** no frontend
- ✅ **Gerenciar autenticação 3DS** automaticamente
- ✅ **Criar assinaturas** após SetupIntent bem-sucedido
- ✅ **Suportar múltiplos planos** (Basic, Pro, Enterprise)

---

## 🏗️ Arquitetura da Integração

### **Estrutura de Arquivos:**

```
├── frontend/src/components/
│   └── SubscriptionCheckout.jsx          # Componente principal de checkout
├── src/services/
│   └── stripeService.js                  # Serviço backend Stripe
├── src/routes/
│   └── stripeRoutes.js                   # Rotas da API Stripe
└── .env                                  # Configurações Stripe
```

### **Fluxo de Dados:**

```
Frontend → Backend → Stripe API → Banco Emissor → 3DS → Stripe → Frontend
```

---

## 🔄 Fluxo de Pagamento

### **1. Criação do SetupIntent (Backend)**

```javascript
// src/services/stripeService.js
async createSetupIntent(customerId, planType, interval) {
  const setupIntent = await stripe.setupIntents.create({
    payment_method_types: ['card'],
    customer: customerId,
    usage: 'off_session',
    payment_method_options: {
      card: {
        request_three_d_secure: 'automatic' // 3DS automático
      }
    },
    metadata: {
      planType,
      interval,
      source: 'subscription_setup_with_trial',
      requires_3ds: 'true',
      trial_enabled: 'true'
    }
  });
  
  return setupIntent;
}
```

### **2. Confirmação do SetupIntent (Frontend)**

```javascript
// frontend/src/components/SubscriptionCheckout.jsx
const result = await stripe.confirmSetup({
  elements,
  confirmParams: {
    return_url: `${window.location.origin}/payment-success?setup_intent={CHECKOUT_SESSION_ID}`,
    payment_method_data: {
      billing_details: {
        name: `${userData.first_name} ${userData.last_name}`,
        email: userData.email
      }
    }
  },
  redirect: 'if_required'
});
```

### **3. Tratamento de Status**

```javascript
if (confirmedIntent.status === 'requires_action') {
  // Stripe gerencia automaticamente ações 3DS
  console.log('SetupIntent requer ação 3DS');
} else if (confirmedIntent.status === 'succeeded') {
  // SetupIntent confirmado com sucesso
  console.log('SetupIntent confirmado!');
}
```

---

## ⚙️ Configurações

### **Variáveis de Ambiente (.env):**

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend (.env)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### **Configurações 3DS:**

```javascript
payment_method_options: {
  card: {
    request_three_d_secure: 'automatic' // 'automatic', 'any', 'challenge'
  }
}
```

**Opções disponíveis:**
- `'automatic'` - Stripe decide quando aplicar 3DS (recomendado)
- `'any'` - Sempre tenta aplicar 3DS
- `'challenge'` - Força desafio 3DS

---

## 🎨 Componentes Frontend

### **SubscriptionCheckout.jsx**

Componente principal que gerencia todo o fluxo de pagamento:

```javascript
const SubscriptionCheckout = ({ selectedPlan, selectedInterval, userData, onSuccess, onError }) => {
  const [clientSecret, setClientSecret] = useState(null);
  const [elementsKey, setElementsKey] = useState(0);
  
  // Lógica de inicialização e confirmação
};
```

**Funcionalidades:**
- ✅ **Inicialização** do pagamento
- ✅ **Criação** de customer e SetupIntent
- ✅ **Confirmação** do SetupIntent
- ✅ **Tratamento** de ações 3DS
- ✅ **Gerenciamento** de erros

### **SubscriptionCheckoutInner.jsx**

Componente interno que renderiza o formulário de pagamento:

```javascript
const SubscriptionCheckoutInner = ({ clientSecret, onClientSecretReady, ... }) => {
  // Renderização do PaymentElement e lógica de confirmação
};
```

---

## 🔧 Serviços Backend

### **StripeService.js**

Classe principal que encapsula todas as operações Stripe:

```javascript
class StripeService {
  // ✅ Customer Management
  async getOrCreateCustomer({ email, name, phone, planType }) { ... }
  
  // ✅ SetupIntent Management
  async createSetupIntent(customerId, planType, interval) { ... }
  async confirmSetupIntent(clientSecret, paymentMethodId) { ... }
  
  // ✅ Subscription Management
  async createSubscriptionWithTrial(customerId, planType, interval, paymentMethodId) { ... }
  
  // ✅ Plan & Pricing Management
  async getPlans() { ... }
  async getPlanPrice(planType, interval) { ... }
  
  // ✅ Webhook Processing
  async processWebhook(event) { ... }
  
  // ✅ Event Handlers
  async handleSubscriptionCreated(subscription) { ... }
  async handleTrialWillEnd(subscription) { ... }
  async handleSubscriptionUpdated(subscription) { ... }
  async handlePaymentSucceeded(invoice) { ... }
  async handlePaymentFailed(invoice) { ... }
  async handleSubscriptionDeleted(subscription) { ... }
}
```

**Métodos principais por categoria:**

#### **🔄 Customer & SetupIntent:**
- ✅ **`getOrCreateCustomer`** - Gerencia customers Stripe
- ✅ **`createSetupIntent`** - Cria SetupIntents para assinaturas
- ✅ **`confirmSetupIntent`** - Confirma SetupIntents

#### **💳 Subscription & Billing:**
- ✅ **`createSubscriptionWithTrial`** - Cria assinaturas com período de teste
- ✅ **`getPlans`** - Obtém todos os planos disponíveis
- ✅ **`getPlanPrice`** - Obtém preço específico de um plano

#### **🔔 Webhook & Event Handling:**
- ✅ **`processWebhook`** - Processa webhooks do Stripe
- ✅ **`handleSubscriptionCreated`** - Gerencia criação de assinatura
- ✅ **`handleTrialWillEnd`** - Gerencia fim do período de teste
- ✅ **`handleSubscriptionUpdated`** - Gerencia atualizações de assinatura
- ✅ **`handlePaymentSucceeded`** - Gerencia pagamentos bem-sucedidos
- ✅ **`handlePaymentFailed`** - Gerencia falhas de pagamento
- ✅ **`handleSubscriptionDeleted`** - Gerencia cancelamento de assinatura

### **StripeRoutes.js**

Rotas da API para operações Stripe:

```javascript
router.post('/create-customer', createCustomer);
router.post('/create-setup-intent', createSetupIntent);
router.post('/create-subscription', createSubscription);
```

### **Webhook & Event Handling:**

```javascript
// Processamento de webhooks do Stripe
router.post('/webhook', express.raw({ type: 'application/json' }), processWebhook);

// Event handlers para diferentes tipos de eventos
async processWebhook(event) {
  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;
    case 'customer.subscription.trial_will_end':
      await handleTrialWillEnd(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
  }
}
```

---

## 🔔 Webhooks e Eventos

### **Visão Geral:**

Nossa integração processa **webhooks do Stripe** para manter sincronização em tempo real com eventos de assinatura, pagamento e customer.

### **Eventos Suportados:**

```javascript
// ✅ Eventos de Assinatura
'customer.subscription.created'      // Nova assinatura criada
'customer.subscription.trial_will_end' // Período de teste terminando
'customer.subscription.updated'      // Assinatura atualizada
'customer.subscription.deleted'      // Assinatura cancelada

// ✅ Eventos de Pagamento
'invoice.payment_succeeded'          // Pagamento realizado com sucesso
'invoice.payment_failed'             // Falha no pagamento
```

### **Implementação dos Handlers:**

```javascript
// ✅ Handler para criação de assinatura
async handleSubscriptionCreated(subscription) {
  // Lógica para nova assinatura
  // Atualizar banco de dados
  // Enviar email de boas-vindas
}

// ✅ Handler para fim do período de teste
async handleTrialWillEnd(subscription) {
  // Notificar usuário sobre fim do teste
  // Preparar primeira cobrança
}

// ✅ Handler para pagamentos bem-sucedidos
async handlePaymentSucceeded(invoice) {
  // Atualizar status de pagamento
  // Renovar acesso ao serviço
}

// ✅ Handler para falhas de pagamento
async handlePaymentFailed(invoice) {
  // Notificar usuário sobre falha
  // Implementar retry logic
}
```

### **Configuração de Webhook:**

```bash
# URL do webhook
https://seu-dominio.com/api/stripe/webhook

# Eventos a serem enviados
customer.subscription.created
customer.subscription.trial_will_end
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
```

---

## 🚨 Tratamento de Erros

### **Tipos de Erro Comuns:**

```javascript
if (confirmError.type === 'card_error') {
  // Erros de cartão
  switch (confirmError.decline_code) {
    case 'authentication_required':
      throw new Error('Cartão requer autenticação 3DS');
    case 'card_declined':
      throw new Error('Cartão recusado pelo banco');
    case 'expired_card':
      throw new Error('Cartão expirado');
  }
} else if (confirmError.type === 'invalid_request_error') {
  if (confirmError.code === 'setup_intent_authentication_failure') {
    throw new Error('Falha na autenticação 3DS');
  }
}
```

### **Códigos de Erro Stripe:**

- **`setup_intent_authentication_failure`** - Falha na autenticação 3DS
- **`card_declined`** - Cartão recusado
- **`authentication_required`** - Autenticação 3DS necessária
- **`expired_card`** - Cartão expirado

---

## 🔍 Troubleshooting

### **Problema: SetupIntent Duplicado**

**Sintomas:**
- Múltiplos SetupIntents criados
- Payment Method não anexado ao customer

**Solução:**
- Verificar código duplicado no `stripeService.js`
- Remover configurações inválidas como `mandate_data`

### **Problema: Erro 3DS**

**Sintomas:**
- `setup_intent_authentication_failure`
- Falha na comunicação com banco emissor

**Soluções:**
- Usar `request_three_d_secure: 'automatic'`
- Verificar cartão de teste compatível com 3DS
- Implementar logs detalhados para debug

### **Problema: Elements Context**

**Sintomas:**
- "Could not find Elements context"
- Tela preta no checkout

**Solução:**
- Usar `key` dinâmico no `Elements` provider
- Garantir que `clientSecret` seja passado corretamente

---

## 💳 Cartões de Teste

### **Cartões Recomendados para 3DS:**

```bash
# Mastercard com 3DS (recomendado)
4000 0025 0000 3155

# Visa com 3DS
4000 0000 0000 3220

# Visa que sempre falha 3DS (para teste de erro)
4000 0000 0000 9995
```

### **Dados de Teste:**

```bash
# CVC: Qualquer 3 dígitos
# Data: Qualquer data futura
# CEP: Qualquer CEP válido
```

---

## 📊 Logs e Debug

### **Logs Importantes:**

```javascript
// Backend
console.log('🔧 StripeService: Iniciando createSetupIntent', { customerId, planType, interval });
console.log('✅ SetupIntent criado com sucesso:', setupIntent.id);

// Frontend
console.log('🔍 SetupIntent requer ação 3DS:', confirmedIntent.next_action);
console.log('✅ stripe.confirmSetup executado com sucesso');
```

### **Debug de 3DS:**

```javascript
console.log('🔍 ERRO DETALHADO:', {
  type: confirmError.type,
  code: confirmError.code,
  message: confirmError.message,
  decline_code: confirmError.decline_code
});
```

---

## 🚀 Próximos Passos

### **Melhorias Planejadas:**

1. **Webhooks Stripe** - Para sincronização em tempo real
2. **Retry Logic** - Para falhas temporárias de 3DS
3. **Analytics** - Para monitoramento de conversão
4. **A/B Testing** - Para otimização de checkout

### **Monitoramento:**

- ✅ **Logs detalhados** para todas as operações
- ✅ **Métricas de sucesso** e falha
- ✅ **Alertas** para erros críticos
- ✅ **Dashboard** de performance

---

## 📚 Recursos Adicionais

### **Documentação Stripe:**
- [SetupIntents](https://stripe.com/docs/payments/setup-intents)
- [3D Secure](https://stripe.com/docs/payments/3d-secure)
- [Error Handling](https://stripe.com/docs/error-handling)

### **Exemplos de Código:**
- [React Integration](https://stripe.com/docs/stripe-js/react)
- [Node.js Backend](https://stripe.com/docs/api/node)

---

## 🤝 Suporte

Para dúvidas ou problemas com a integração Stripe:

1. **Verificar logs** do frontend e backend
2. **Consultar** este documento
3. **Testar** com cartões de teste
4. **Contatar** equipe de desenvolvimento

---

**Última atualização:** Agosto 2025  
**Versão:** 1.0.0  
**Status:** Produção
