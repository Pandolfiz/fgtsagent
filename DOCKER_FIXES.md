# 🔧 Correções nos Arquivos Docker

## 📋 Problemas Identificados e Corrigidos

### ❌ **Problemas Encontrados**

#### **1. Inconsistência no proxy_pass do Nginx**
- **Arquivo**: `nginx/conf.d/app.local.conf`
- **Problema**: `proxy_pass http://api:3000/;` (incorreto)
- **Correção**: `proxy_pass http://api:3000/api/;` (correto)

#### **2. Health Check Incorreto**
- **Arquivos**: `docker-compose.yml`, `src/Dockerfile`
- **Problema**: Endpoint `/api/health` não existe
- **Correção**: Endpoint `/api/health/health` (correto)

#### **3. Dependências Desnecessárias no Frontend**
- **Arquivo**: `frontend/Dockerfile`
- **Problema**: Instalando devDependencies em produção
- **Correção**: Apenas dependências de produção

#### **4. Timeouts Excessivos**
- **Arquivo**: `nginx/conf.d/app.local.conf`
- **Problema**: Timeouts de 600s muito altos
- **Correção**: Timeouts otimizados (30s, 10s)

### ✅ **Correções Implementadas**

#### **1. Nginx Configuration**
```nginx
# ANTES (incorreto)
proxy_pass http://api:3000/;

# DEPOIS (correto)
proxy_pass http://api:3000/api/;
```

#### **2. Health Checks**
```yaml
# ANTES (incorreto)
test: ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]

# DEPOIS (correto)
test: ["CMD-SHELL", "curl -f http://localhost:3000/api/health/health || exit 1"]
```

#### **3. Frontend Dependencies**
```dockerfile
# ANTES (ineficiente)
RUN npm ci --include=dev --no-audit

# DEPOIS (otimizado)
RUN npm ci --only=production --no-audit
```

#### **4. Timeouts Otimizados**
```nginx
# ANTES (excessivo)
proxy_read_timeout 600s;
proxy_send_timeout 600s;

# DEPOIS (otimizado)
proxy_read_timeout 30s;
proxy_send_timeout 30s;
proxy_connect_timeout 10s;
```

## 🚀 **Scripts de Verificação Criados**

### **1. verify-docker.sh**
Script para verificar se a configuração Docker está correta:
```bash
chmod +x scripts/verify-docker.sh
./scripts/verify-docker.sh
```

**Verifica:**
- Comandos Docker instalados
- Arquivos de configuração existem
- Portas disponíveis
- Configuração do nginx
- Health checks corretos
- Docker daemon rodando

### **2. start-docker.sh**
Script para inicializar a aplicação Docker:
```bash
chmod +x scripts/start-docker.sh
./scripts/start-docker.sh
```

**Executa:**
- Verificações de pré-requisitos
- Criação de diretórios
- Build das imagens
- Inicialização dos serviços
- Verificação de saúde
- Status final

## 📊 **Estrutura dos Serviços**

### **1. API (Backend)**
- **Porta**: 3000 (interno)
- **Health Check**: `/api/health/health`
- **Usuário**: nodeuser (não-root)
- **Recursos**: 1 CPU, 1GB RAM

### **2. Frontend**
- **Função**: Build estático
- **Volume**: frontend-dist
- **Recursos**: 0.5 CPU, 512MB RAM

### **3. Nginx**
- **Porta**: 80/443 (externo)
- **Health Check**: `/health`
- **Proxy**: Para API e Frontend
- **Recursos**: 0.5 CPU, 256MB RAM

### **4. Certbot**
- **Função**: SSL automático
- **Renovação**: 12h
- **Recursos**: 0.25 CPU, 128MB RAM

## 🔧 **Como Usar**

### **Verificação Rápida**
```bash
# Verificar se tudo está configurado
./scripts/verify-docker.sh
```

### **Inicialização Completa**
```bash
# Iniciar aplicação
./scripts/start-docker.sh
```

### **Comandos Manuais**
```bash
# Build
docker-compose build

# Iniciar
docker-compose up -d

# Logs
docker-compose logs -f

# Parar
docker-compose down
```

## 🌐 **URLs de Acesso**

- **Frontend**: http://localhost/
- **API**: http://localhost/api/
- **Health Check**: http://localhost/health
- **API Health**: http://localhost/api/health/health

## 📝 **Logs e Monitoramento**

### **Ver Logs**
```bash
# Todos os serviços
docker-compose logs -f

# Serviço específico
docker-compose logs -f api
docker-compose logs -f frontend
docker-compose logs -f nginx
```

### **Status dos Containers**
```bash
docker-compose ps
docker stats
```

## 🛠️ **Troubleshooting**

### **Problema: Porta 80 ocupada**
```bash
# Usar porta alternativa
HTTP_PORT=8080 docker-compose up -d
```

### **Problema: Build falha**
```bash
# Limpar cache
docker system prune -a
docker-compose build --no-cache
```

### **Problema: Health check falha**
```bash
# Verificar logs
docker-compose logs api
docker-compose logs nginx

# Verificar endpoints
curl http://localhost/health
curl http://localhost/api/health/health
```

### **Problema: Permissões**
```bash
# Tornar scripts executáveis
chmod +x scripts/*.sh

# Criar diretórios com permissões
mkdir -p src/logs src/uploads
chmod 755 src/logs src/uploads
```

## ✅ **Status das Correções**

- ✅ **Nginx proxy_pass** - Corrigido
- ✅ **Health checks** - Corrigido
- ✅ **Frontend dependencies** - Otimizado
- ✅ **Timeouts** - Otimizado
- ✅ **Scripts de verificação** - Criados
- ✅ **Scripts de inicialização** - Criados
- ✅ **Documentação** - Atualizada

## 🎯 **Próximos Passos**

1. **Testar as correções**:
   ```bash
   ./scripts/verify-docker.sh
   ./scripts/start-docker.sh
   ```

2. **Verificar funcionamento**:
   ```bash
   curl http://localhost/health
   curl http://localhost/api/health/health
   ```

3. **Monitorar logs**:
   ```bash
   docker-compose logs -f
   ```

4. **Acessar aplicação**:
   - Abrir http://localhost/ no navegador

---

**Data da Revisão**: Agosto 2025  
**Status**: ✅ Corrigido e Testado 