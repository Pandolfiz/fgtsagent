# 🚀 Guia de Configuração do Stripe

## **Problema Identificado:**
O campo do cartão na terceira etapa de cadastro não está funcionando devido a problemas de configuração do Stripe.

## **Causas do Problema:**

### **1. Chaves do Stripe não configuradas:**
- ❌ `VITE_STRIPE_PUBLISHABLE_KEY` não configurada no frontend
- ❌ `STRIPE_SECRET_KEY` inválida no backend
- ❌ Arquivos `.env` não existem

### **2. Servidores não rodando:**
- ❌ Frontend (Vite) não está ativo
- ❌ Backend (Node.js) não está ativo

## **✅ Soluções:**

### **Passo 1: Configurar Chaves do Stripe**

#### **1.1 Obter chaves do Stripe:**
1. Acesse [dashboard.stripe.com](https://dashboard.stripe.com)
2. Vá em **Developers > API keys**
3. Copie as chaves:
   - **Publishable key** (começa com `pk_test_`)
   - **Secret key** (começa com `sk_test_`)

#### **1.2 Configurar Frontend:**
Crie o arquivo `frontend/.env`:
```env
# Configurações do Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_aqui

# Configurações da API
VITE_API_URL=http://localhost:3000
```

#### **1.3 Configurar Backend:**
Crie o arquivo `.env` na raiz:
```env
# Configurações do Stripe
STRIPE_SECRET_KEY=sk_test_sua_chave_aqui
STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_aqui
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret

# Configurações da aplicação
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:5173

# Configurações do Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

### **Passo 2: Iniciar Servidores**

#### **2.1 Iniciar Backend:**
```bash
cd src
npm start
```

#### **2.2 Iniciar Frontend:**
```bash
cd frontend
npm run dev
```

### **Passo 3: Verificar Funcionamento**

#### **3.1 Testar Endpoint:**
```bash
curl -X POST http://localhost:3000/api/stripe/create-signup-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "planType": "pro",
    "userEmail": "test@example.com",
    "userName": "Test User",
    "successUrl": "http://localhost:5173/signup-success",
    "cancelUrl": "http://localhost:5173/signup"
  }'
```

#### **3.2 Testar Frontend:**
1. Acesse `http://localhost:5173/signup`
2. Preencha os dados pessoais
3. Selecione um plano
4. Verifique se o campo do cartão aparece

## **🔧 Correções Implementadas:**

### **1. Componente StripeCheckout:**
- ✅ Adicionado tratamento de erro para chave não configurada
- ✅ Adicionado loading state para CardElement
- ✅ Melhorada a validação do Stripe

### **2. Configuração da API:**
- ✅ Corrigida a URL duplicada (`/api/api/stripe/plans`)
- ✅ Ajustada a ordem das rotas no backend

## **📋 Checklist de Verificação:**

- [ ] Chaves do Stripe configuradas
- [ ] Arquivos `.env` criados
- [ ] Backend rodando na porta 3000
- [ ] Frontend rodando na porta 5173
- [ ] Endpoint `/api/stripe/plans` funcionando
- [ ] Campo do cartão aparecendo na terceira etapa
- [ ] Formulário de pagamento carregando

## **🚨 Problemas Comuns:**

### **1. "Chave do Stripe não configurada":**
- **Solução**: Configure `VITE_STRIPE_PUBLISHABLE_KEY` no `frontend/.env`

### **2. "Invalid API Key provided":**
- **Solução**: Configure `STRIPE_SECRET_KEY` válida no `.env` da raiz

### **3. "Campo do cartão não aparece":**
- **Solução**: Verifique se o Stripe está carregando corretamente

### **4. "Erro 401 na API":**
- **Solução**: Verifique se o backend está rodando e as rotas estão configuradas

## **📞 Suporte:**

Se os problemas persistirem:
1. Verifique os logs do console do navegador
2. Verifique os logs do backend
3. Confirme se as chaves do Stripe são válidas
4. Teste com as chaves de teste do Stripe 