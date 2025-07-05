# 🚀 **FgtsAgent - Plataforma SaaS Completa**

Sistema completo de antecipação de saque-aniversário do FGTS com IA integrada.

## 📋 **Sobre o Projeto**

FgtsAgent é uma plataforma SaaS robusta que permite:
- 🤖 **Chat com IA** para atendimento automatizado
- 💰 **Antecipação de saque-aniversário** do FGTS
- 📊 **Dashboard completo** com métricas e relatórios
- 🔐 **Sistema de autenticação** completo
- 📱 **WhatsApp Business** integrado
- 🔗 **APIs externas** (V8, Caixa, Governo)

## 🛠️ **Tecnologias Utilizadas**

### **Frontend**
- ⚛️ **React 19** + TypeScript
- ⚡ **Vite** (build tool)
- 🎨 **Tailwind CSS** + **NextUI**
- 🔥 **Framer Motion** (animações)
- 📊 **Chart.js** (gráficos)
- 🔌 **Socket.io** (realtime)

### **Backend**
- 🚀 **Node.js** + **Express**
- 🗄️ **Supabase** (PostgreSQL)
- 🔄 **Redis** (cache)
- 🔐 **JWT** + **OAuth2**
- 💳 **Stripe** (pagamentos)
- 📱 **Evolution API** (WhatsApp)

### **Infraestrutura**
- 🐳 **Docker** + **Docker Compose**
- 🌐 **Nginx** (proxy reverso + SSL)
- 🔒 **Let's Encrypt** (SSL/TLS)
- 📊 **Logs** estruturados
- 🔄 **Health checks** automáticos

## 🏗️ **Arquitetura**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Frontend      │────│   Nginx Proxy   │────│   Backend API   │
│   (React SPA)   │    │   + SSL/TLS     │    │   (Node.js)     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐             │
                       │                 │             │
                       │   Supabase      │─────────────┘
                       │   (PostgreSQL)  │
                       │                 │
                       └─────────────────┘
```

## 📁 **Estrutura do Projeto**

```
saas_fgts_react/
├── frontend/                 # React + TypeScript
│   ├── src/
│   │   ├── components/       # Componentes React
│   │   ├── pages/           # Páginas da aplicação
│   │   ├── services/        # APIs e serviços
│   │   └── utils/           # Utilitários
│   ├── Dockerfile           # Container do frontend
│   └── package.json
├── src/                     # Backend Node.js
│   ├── controllers/         # Controladores da API
│   ├── services/           # Serviços de negócio
│   ├── routes/             # Rotas da API
│   ├── middleware/         # Middlewares
│   ├── utils/              # Utilitários
│   ├── Dockerfile          # Container do backend
│   └── package.json
├── nginx/                   # Configurações Nginx
│   └── conf.d/
│       ├── app.conf        # Configuração principal
│       └── app-http-only.conf
├── scripts/                 # Scripts utilitários
│   ├── fix-health.sh       # Correção de health checks
│   └── init-letsencrypt.sh # Inicialização SSL
├── data/                    # Dados persistentes
│   └── certbot/            # Certificados SSL
├── docker-compose.yml       # Orquestração dos serviços
├── DOCUMENTACAO_COMPLETA.md # Documentação técnica
└── ENVIRONMENT_VARIABLES.md # Guia de variáveis
```

## 🚀 **Instalação e Configuração**

### **1. Pré-requisitos**
- 🐳 **Docker** (20.10+)
- 🔧 **Docker Compose** (v2+)
- 🌐 **Git**
- 🔗 **Domínio** configurado (exemplo: `fgtsagent.com.br`)

### **2. Clone e Configuração**

```bash
# Clonar o repositório
git clone https://github.com/SEU_USUARIO/saas-fgts-react.git
cd saas-fgts-react

# Configurar variáveis de ambiente
cp src/env.example src/.env
nano src/.env  # Editar com suas credenciais

# Criar .env para Docker Compose
cat > .env << EOF
NODE_ENV=production
HTTP_PORT=80
HTTPS_PORT=443
NOTIFICATION_EMAIL_FROM=noreply@fgtsagent.com.br
NOTIFICATION_EMAIL_TO=admin@fgtsagent.com.br
EOF
```

### **3. Configurar SSL (Opcional)**

```bash
# Inicializar certificados SSL
chmod +x scripts/init-letsencrypt.sh
./scripts/init-letsencrypt.sh
```

### **4. Iniciar a Aplicação**

```bash
# Iniciar todos os serviços
docker-compose up -d

# Verificar status
docker-compose ps

# Acompanhar logs
docker-compose logs -f
```

## 🔧 **Configuração de Ambiente**

### **Variáveis Obrigatórias (.env)**

```bash
# SUPABASE (Obrigatório)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_KEY=sua-chave-servico
SUPABASE_JWT_SECRET=sua-jwt-secret

# STRIPE (Obrigatório)
STRIPE_SECRET_KEY=sk_live_sua_chave_secreta
STRIPE_PUBLISHABLE_KEY=pk_live_sua_chave_publica
STRIPE_WEBHOOK_SECRET=whsec_sua_chave_webhook

# APLICAÇÃO
SESSION_SECRET=sua-chave-super-segura-32-caracteres
JWT_SECRET=sua-jwt-secret-key
APP_URL=https://fgtsagent.com.br
```

Veja o arquivo `ENVIRONMENT_VARIABLES.md` para lista completa.

## 🌐 **Acesso à Aplicação**

- 🌍 **Frontend**: https://fgtsagent.com.br
- 🔌 **API**: https://fgtsagent.com.br/api
- 📊 **Health Check**: https://fgtsagent.com.br/api/health

## 📊 **Funcionalidades Implementadas**

### ✅ **Concluído**
- 🔐 **Sistema de autenticação** completo
- 💬 **Chat com IA** integrado
- 📊 **Dashboard** com métricas
- 🤖 **Gerenciamento de agentes**
- 💳 **Integração com Stripe**
- 📱 **WhatsApp Business API**
- 🔗 **APIs externas** (V8, Evolution)
- 📤 **Upload de arquivos**
- 🗃️ **Knowledge base**
- 🔄 **Sistema de propostas**
- 🎯 **47 bugs corrigidos**

### 🔧 **Em Desenvolvimento**
- 📈 **Analytics avançados**
- 🔔 **Notificações push**
- 📱 **App mobile**
- 🤖 **IA mais avançada**

## 🛠️ **Comandos Úteis**

```bash
# Ver logs específicos
docker-compose logs api
docker-compose logs frontend
docker-compose logs nginx

# Reiniciar serviços
docker-compose restart api
docker-compose restart frontend

# Atualizar aplicação
git pull origin main
docker-compose build --no-cache
docker-compose up -d

# Verificar saúde dos serviços
curl http://localhost/api/health
```

## 🔒 **Segurança**

- 🔐 **HTTPS** obrigatório
- 🛡️ **Headers de segurança**
- 🔑 **JWT** com refresh tokens
- 🧹 **Sanitização** de inputs
- 🚫 **Rate limiting**
- 📋 **Logs** estruturados
- 🔍 **Monitoramento** ativo

## 📋 **Desenvolvimento**

### **Scripts Disponíveis**

```bash
# Frontend
cd frontend
npm run dev          # Desenvolvimento
npm run build        # Build de produção
npm run lint         # Linter

# Backend
cd src
npm run dev          # Desenvolvimento
npm run start        # Produção
npm test             # Testes
```

### **Estrutura de Commits**

```bash
# Convenção de commits
feat: nova funcionalidade
fix: correção de bug
docs: documentação
style: formatação
refactor: refatoração
test: testes
chore: manutenção
```

## 🆘 **Troubleshooting**

### **Problemas Comuns**

```bash
# Aplicação não carrega
docker-compose ps
docker-compose logs -f

# Erro de certificado SSL
bash scripts/fix-health.sh

# Problema de conectividade
curl -I http://localhost/api/health
```

Consulte `DOCUMENTACAO_COMPLETA.md` para guia completo de solução de problemas.

## 📚 **Documentação**

- 📖 **[Documentação Completa](DOCUMENTACAO_COMPLETA.md)** - Guia técnico completo
- 🔧 **[Variáveis de Ambiente](ENVIRONMENT_VARIABLES.md)** - Configuração detalhada
- 📋 **[Scripts](README_SCRIPTS.md)** - Guia de scripts utilitários

## 🤝 **Contribuição**

1. 🍴 Fork o repositório
2. 🌿 Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. 💻 Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. 📤 Push para a branch (`git push origin feature/nova-funcionalidade`)
5. 🔄 Abra um Pull Request

## 📄 **Licença**

Este projeto está licenciado sob a **MIT License**.

## 📞 **Contato**

- 📧 **Email**: contato@fgtsagent.com.br
- 🌐 **Website**: https://fgtsagent.com.br
- 💬 **WhatsApp**: Integrado na plataforma

---

**🎉 Sua aplicação FgtsAgent está pronta para produção!** 