# Integração Stripe - FGTS Agent

## Resumo da Implementação

Esta integração completa adiciona funcionalidades de pagamento e assinatura ao sistema FGTS Agent usando Stripe. O sistema permite que usuários se cadastrem, escolham um plano e processem pagamentos de forma segura.

## Estrutura da Integração

### Backend (Node.js + Express)

#### 1. Dependências Adicionadas
```bash
npm install stripe
```

#### 2. Arquivos Criados/Modificados

**`services/stripeService.js`**
- Configuração dos planos disponíveis
- Funções para criar clientes, sessões de checkout e gerenciar assinaturas
- Tratamento de webhooks do Stripe

**`routes/stripeRoutes.js`**
- Rotas para listagem de planos
- Criação de sessões de checkout
- Verificação de pagamentos
- Gerenciamento de assinaturas

**`controllers/subscriptionController.js`**
- Lógica de negócio para assinaturas
- Sincronização com banco de dados

#### 3. Variáveis de Ambiente (src/env.example)
```env
STRIPE_SECRET_KEY=sk_test_sua_chave_secreta_aqui
STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_publica_aqui
STRIPE_WEBHOOK_SECRET=whsec_sua_chave_de_webhook_aqui
```

### Frontend (React + Vite)

#### 1. Dependências Adicionadas
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

#### 2. Componentes Criados

**`components/PricingPlans.jsx`**
- Exibe os planos disponíveis de forma visual
- Permite seleção de plano
- Carrega dados dos planos via API

**`components/StripeCheckout.jsx`**
- Formulário de checkout integrado com Stripe
- Processamento seguro de pagamentos
- Redirecionamento para Stripe Checkout

**`pages/SignUpWithPlans.jsx`**
- Fluxo completo de cadastro em 3 etapas
- Integração de dados pessoais + seleção de plano + pagamento

**`pages/CheckoutSuccess.jsx`**
- Página de confirmação pós-pagamento
- Verificação do status do pagamento
- Próximos passos para o usuário

### Banco de Dados (Supabase)

#### 1. Tabelas Criadas

**`subscriptions`**
```sql
CREATE TABLE public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('basic', 'pro', 'premium')),
    status TEXT NOT NULL DEFAULT 'pending',
    stripe_customer_id TEXT,
    stripe_session_id TEXT,
    stripe_subscription_id TEXT,
    price_id TEXT,
    amount INTEGER,
    currency TEXT DEFAULT 'brl',
    metadata JSONB DEFAULT '{}'::jsonb,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. Campos Adicionados em `user_profiles`
- `stripe_customer_id`: ID do cliente no Stripe
- `current_plan`: Plano atual do usuário
- `subscription_status`: Status da assinatura
- `subscription_expires_at`: Data de expiração

#### 3. Funções Auxiliares
- `sync_subscription_to_profile()`: Sincroniza dados entre tabelas
- `get_user_active_subscription()`: Retorna assinatura ativa
- `user_has_feature_access()`: Verifica acesso a funcionalidades

## Configuração dos Produtos no Stripe

### Produtos Criados
1. **FGTS Agent - Plano Básico**: R$ 29,90/mês
2. **FGTS Agent - Plano Pro**: R$ 49,90/mês  
3. **FGTS Agent - Plano Premium**: R$ 99,90/mês

### IDs dos Produtos (Teste)
- Básico: `prod_STalRE6RzVNTUu` / `price_1RYdaBRrfRhcM17zE4rOKO9U`
- Pro: `prod_STalhjSBTyHza7` / `price_1RYdaFRrfRhcM17zecmj0hhT`
- Premium: `prod_STalNWvSe9GqRs` / `price_1RYdaJRrfRhcM17z7VR0ZvlR`

## Fluxo de Funcionamento

### 1. Cadastro do Usuário
1. Usuário preenche dados pessoais
2. Seleciona plano desejado
3. É redirecionado para checkout Stripe
4. Após pagamento, conta é criada automaticamente

### 2. Processamento do Pagamento
1. Stripe processa o pagamento
2. Webhook notifica o backend
3. Assinatura é criada no banco de dados
4. Perfil do usuário é atualizado
5. Email de confirmação é enviado

### 3. Gerenciamento Contínuo
1. Cobranças recorrentes automáticas
2. Sincronização de status via webhooks
3. Controle de acesso baseado no plano
4. Interface para alteração/cancelamento

## Funcionalidades Implementadas

### ✅ Concluído
- [x] Configuração dos produtos no Stripe
- [x] Estrutura do banco de dados
- [x] APIs do backend para Stripe
- [x] Componentes React para checkout
- [x] Fluxo de cadastro integrado
- [x] Página de confirmação
- [x] Sincronização automática de dados

### 🔄 Em Desenvolvimento
- [ ] Webhooks para eventos do Stripe
- [ ] Interface de gerenciamento de assinatura
- [ ] Funcionalidades baseadas em planos
- [ ] Relatórios de pagamento

### 📋 Próximos Passos
- [ ] Implementar webhooks completos
- [ ] Adicionar página de gerenciamento de cobrança
- [ ] Implementar upgrade/downgrade de planos
- [ ] Adicionar métricas e analytics
- [ ] Testes automatizados

## Instruções de Configuração

### 1. Configurar Stripe
1. Criar conta no Stripe
2. Obter chaves API (test/live)
3. Configurar webhook endpoint
4. Adicionar produtos e preços

### 2. Configurar Backend
1. Adicionar variáveis de ambiente
2. Instalar dependência `stripe`
3. Registrar rotas no `index.js`
4. Configurar middleware de validação

### 3. Configurar Frontend
1. Instalar dependências Stripe
2. Adicionar chave pública ao `.env`
3. Implementar componentes de checkout
4. Configurar rotas de sucesso/erro

### 4. Configurar Banco
1. Executar migrações do Supabase
2. Configurar políticas RLS
3. Testar funções auxiliares

## URLs Importantes

### Desenvolvimento
- **API Base**: `http://localhost:3000/api/stripe`
- **Success URL**: `http://localhost:5173/signup/success`
- **Cancel URL**: `http://localhost:5173/pricing`

### Produção (Configurar)
- **API Base**: `https://seudominio.com/api/stripe`
- **Success URL**: `https://seudominio.com/signup/success`
- **Cancel URL**: `https://seudominio.com/pricing`

## Segurança

### Implementado
- Validação de dados no backend
- Verificação de assinatura de webhooks
- Criptografia de dados sensíveis
- RLS (Row Level Security) no Supabase

### Recomendações
- Usar HTTPS em produção
- Implementar rate limiting
- Monitorar tentativas de fraude
- Backup regular dos dados

## Suporte e Manutenção

### Monitoramento
- Logs de transações
- Alertas de falha de pagamento
- Métricas de conversão
- Status de saúde da API

### Backup
- Backup diário do banco de dados
- Versionamento de código
- Documentação atualizada
- Plano de recuperação de desastres

## Contato Técnico

Para dúvidas sobre a implementação:
- **Desenvolvedor**: Assistant AI
- **Data**: 2025-06-11
- **Versão**: 1.0.0 