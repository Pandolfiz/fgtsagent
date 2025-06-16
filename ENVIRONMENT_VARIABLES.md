# 🔐 **Guia de Variáveis de Ambiente**

Este guia lista **TODAS** as variáveis de ambiente necessárias para o funcionamento completo da aplicação FgtsAgent.

## 📋 **Variáveis Obrigatórias**

### **🏗️ Para Docker Compose**
```bash
# Arquivo: .env (na raiz do projeto)
NODE_ENV=production
HTTP_PORT=80
HTTPS_PORT=443
NOTIFICATION_EMAIL_FROM=noreply@fgtsagent.com.br
NOTIFICATION_EMAIL_TO=admin@fgtsagent.com.br
```

### **🔒 Para a API (src/.env)**
```bash
# BÁSICAS DA APLICAÇÃO
NODE_ENV=production
PORT=3000
APP_NAME="FgtsAgent"
APP_VERSION="1.0.0"
APP_URL=https://fgtsagent.com.br

# SEGURANÇA
SESSION_SECRET=sua-chave-secreta-super-forte-de-pelo-menos-32-caracteres
JWT_SECRET=sua-jwt-secret-key-muito-segura-aqui

# SUPABASE (OBRIGATÓRIO)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima-do-supabase
SUPABASE_SERVICE_KEY=sua-chave-de-servico-do-supabase
SUPABASE_JWT_SECRET=sua-jwt-secret-do-supabase

# STRIPE (OBRIGATÓRIO)
STRIPE_SECRET_KEY=sk_live_sua_chave_secreta_de_producao_aqui
STRIPE_PUBLISHABLE_KEY=pk_live_sua_chave_publica_de_producao_aqui
STRIPE_WEBHOOK_SECRET=whsec_sua_chave_de_webhook_aqui
```

---

## 📋 **Variáveis Opcionais**

### **📧 OAuth e Social Login**
```bash
OAUTH_SUPABASE_REDIRECT_URL=https://fgtsagent.com.br/auth/google/callback
USE_SUPABASE_AUTH=true
```

### **📱 WhatsApp/Evolution API**
```bash
WHATSAPP_ACCESS_TOKEN=seu-token-do-whatsapp
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-chave-da-evolution-api
WHATSAPP_API_VERSION=v16.0
WHATSAPP_API_BASE_URL=https://graph.facebook.com
WHATSAPP_WEBHOOK_VERIFY_TOKEN=seu_token_de_verificacao
```

### **🔗 N8N Integration**
```bash
N8N_API_URL=http://localhost:5678
```

### **🗄️ Banco Local (PostgreSQL)**
```bash
POSTGRES_DB=saas_fgts
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/saas_fgts
```

### **🌐 Frontend**
```bash
FRONTEND_URL=https://fgtsagent.com.br
REACT_ROUTER_TYPE=browser
```

### **📊 Logs e Monitoramento**
```bash
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
```

### **📧 SMTP Personalizado**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
```

### **💾 Backup**
```bash
BACKUP_RETENTION_DAYS=30
```

### **🔄 Redis Cache**
```bash
REDIS_URL=redis://localhost:6379
```

### **🔑 Outras**
```bash
SERVICE_ROLE_KEY=sua-service-role-key-se-necessaria
```

---

## 🚨 **Problemas Mais Comuns**

### **1. Erro: "NOTIFICATION_EMAIL_FROM" variable is not set**
```bash
# Solução: Adicione no arquivo .env (raiz do projeto)
NOTIFICATION_EMAIL_FROM=noreply@fgtsagent.com.br
NOTIFICATION_EMAIL_TO=admin@fgtsagent.com.br
```

### **2. Erro: "Cannot find module 'stripe'"**
```bash
# Solução: Configurar Stripe no src/.env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### **3. Erro: "SUPABASE_PROJECT_ID não definida"**
```bash
# Solução: Configure SUPABASE_URL no src/.env
SUPABASE_URL=https://seu-projeto.supabase.co
```

---

## 📁 **Onde Criar os Arquivos**

### **Arquivo 1: `.env` (Raiz do projeto)**
```
/saas_fgts_react/.env
```
Variáveis para Docker Compose:
- NODE_ENV
- HTTP_PORT, HTTPS_PORT  
- NOTIFICATION_EMAIL_FROM, NOTIFICATION_EMAIL_TO

### **Arquivo 2: `src/.env` (Pasta src/)**
```
/saas_fgts_react/src/.env
```
Variáveis para a aplicação:
- APP_*, SESSION_SECRET, JWT_SECRET
- SUPABASE_*, STRIPE_*
- Todas as outras configurações

---

## 🛠️ **Como Configurar**

### **1. Criar arquivo na raiz**
```bash
# Na raiz do projeto
touch .env

# Adicionar as variáveis do Docker
echo "NODE_ENV=production" >> .env
echo "HTTP_PORT=80" >> .env
echo "HTTPS_PORT=443" >> .env
echo "NOTIFICATION_EMAIL_FROM=noreply@fgtsagent.com.br" >> .env
echo "NOTIFICATION_EMAIL_TO=admin@fgtsagent.com.br" >> .env
```

### **2. Criar arquivo na pasta src**
```bash
# Na pasta src/
cd src
cp env.example .env

# Editar com suas credenciais reais
nano .env
```

### **3. Deploy**
```bash
# Deploy com configurações corretas
./scripts/deploy.sh prod --pull
```

---

## ✅ **Checklist Final**

- [ ] **.env** criado na **raiz** com variáveis do Docker
- [ ] **src/.env** criado com todas as credenciais da aplicação  
- [ ] **Supabase** configurado corretamente
- [ ] **Stripe** com chaves de produção
- [ ] **Emails** de notificação configurados
- [ ] **APP_URL** apontando para domínio de produção
- [ ] **SESSION_SECRET** e **JWT_SECRET** seguros (32+ caracteres)

💡 **Dica:** Use `./scripts/utils.sh health` para verificar se todas as configurações estão corretas! 