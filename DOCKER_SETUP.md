# 🐳 Configuração Docker - Estrutura Unificada

## 📋 Nova Estrutura dos Arquivos

| Arquivo | Propósito | Como Usar |
|---------|-----------|-----------|
| **docker-compose.yml** | **Configuração principal** | Base para qualquer ambiente |
| **docker-compose.override.yml** | **Desenvolvimento** | Carregado automaticamente em dev |
| **docker-compose.production.yml** | **Produção avançada** | Serviços extras (backup, logs) |

## 🚀 Como Usar

### 🔧 **Desenvolvimento** (automático)
```bash
# Carrega automaticamente: docker-compose.yml + docker-compose.override.yml
docker compose up -d

# Com serviços de debug (Redis)
docker compose --profile debug up -d

# Portas em desenvolvimento:
# - Frontend: http://localhost:5173
# - API: http://localhost:3000  
# - Nginx: http://localhost:8080
# - Redis Commander: http://localhost:8081
```

### 🏭 **Produção Simples**
```bash
# Apenas serviços essenciais
docker compose -f docker-compose.yml up -d
```

### 🏭 **Produção Completa** (com backup, logs, monitoring)
```bash
# Serviços essenciais + extras
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d

# Com monitoring
docker compose -f docker-compose.yml -f docker-compose.production.yml --profile monitoring up -d
```

## ⚙️ **Variáveis de Ambiente**

Crie um arquivo `.env.compose` na raiz:
```bash
# Ambiente
NODE_ENV=production

# Portas (ajuste conforme necessário)
HTTP_PORT=80
HTTPS_PORT=443

# Para desenvolvimento:
# HTTP_PORT=8080  
# HTTPS_PORT=8443

# Backup
BACKUP_RETENTION_DAYS=30

# Notificações (opcional)
NOTIFICATION_EMAIL_FROM=admin@fgtsagent.com.br
NOTIFICATION_EMAIL_TO=seu-email@gmail.com
```

## 🔄 **Migração da Configuração Atual**

### ✅ **O que foi melhorado:**
- **Healthchecks** em todos os serviços
- **Logging estruturado** com rotação
- **Resource limits** otimizados
- **Volumes com permissões** corretas
- **Rede isolada** com subnet específica
- **SSL condicional** (funciona com ou sem certificados)

### 📦 **Serviços Principais** (sempre ativos)
- `api` - Backend Node.js
- `frontend` - React build
- `nginx` - Proxy reverso + SSL
- `certbot` - Renovação automática SSL

### 📦 **Serviços Extras** (opcional em produção)
- `logrotate` - Rotação de logs
- `backup` - Backup automático
- `watchtower` - Auto-update containers

### 🛠️ **Serviços de Debug** (apenas desenvolvimento)
- `redis` - Cache/sessões
- `redis-commander` - Interface Redis

## 🗑️ **Arquivos Antigos**

Você pode **remover** com segurança:
- ~~`docker-compose.prod.yml`~~ (substituído)

O novo sistema é mais simples e organizado!

## 📝 **Comandos Úteis**

```bash
# Ver logs em tempo real
docker compose logs -f

# Rebuild completo
docker compose down && docker compose build --no-cache && docker compose up -d

# Ver status dos serviços
docker compose ps

# Parar serviços específicos
docker compose stop api frontend

# Atualizar apenas um serviço
docker compose up -d --force-recreate api
``` 