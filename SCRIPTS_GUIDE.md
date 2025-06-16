# 📜 Guia de Scripts - FgtsAgent

## 📋 **Nova Estrutura Organizada**

### ✅ **Scripts Ativos** (use estes)

| Script | Localização | Propósito | Como Usar |
|--------|-------------|-----------|-----------|
| **`scripts/deploy.sh`** | scripts/ | **Deploy unificado** | `./scripts/deploy.sh [env] [opções]` |
| **`scripts/utils.sh`** | scripts/ | **Utilities e manutenção** | `./scripts/utils.sh [comando]` |
| **`scripts/backup.sh`** | scripts/ | **Backup automatizado** | Executado automaticamente ou manual |
| **`scripts/init-letsencrypt.sh`** | scripts/ | **Configuração SSL inicial** | Execute apenas uma vez |

### ⚠️ **Scripts Antigos** (podem ser removidos)

| Script | Status | Motivo |
|--------|--------|--------|
| `atualizar.sh` | 🗑️ Redundante | Substituído por `scripts/deploy.sh` |
| `update-production.sh` | 🗑️ Redundante | Substituído por `scripts/deploy.sh` |
| `scripts/docker-deploy.sh` | 🗑️ Redundante | Substituído por `scripts/deploy.sh` |

---

## 🚀 **Como Usar os Novos Scripts**

### 1. **Deploy Unificado** (`scripts/deploy.sh`)

```bash
# Desenvolvimento (hot-reload)
./scripts/deploy.sh dev

# Produção simples 
./scripts/deploy.sh prod

# Produção completa (com backup, logs)
./scripts/deploy.sh full

# Opções avançadas
./scripts/deploy.sh prod --pull --no-cache --logs
```

**Ambientes disponíveis:**
- `dev` - Desenvolvimento com hot-reload
- `prod` - Produção somente essenciais
- `full` - Produção com backup, logs, monitoring

### 2. **Utilities** (`scripts/utils.sh`)

```bash
# Ver logs
./scripts/utils.sh logs api          # Logs da API
./scripts/utils.sh logs all          # Todos os logs

# Status e monitoramento
./scripts/utils.sh status            # Status dos containers
./scripts/utils.sh health            # Verificar saúde

# Manutenção
./scripts/utils.sh restart nginx     # Reiniciar serviço
./scripts/utils.sh clean            # Limpeza geral
./scripts/utils.sh backup           # Backup manual

# Debug
./scripts/utils.sh shell api        # Shell no container
./scripts/utils.sh db               # Operações do banco

# SSL
./scripts/utils.sh ssl              # Verificar certificados
```

### 3. **Backup** (`scripts/backup.sh`)

```bash
# Executar backup manual
./scripts/backup.sh

# Ou via utilities
./scripts/utils.sh backup
```

### 4. **SSL Inicial** (`scripts/init-letsencrypt.sh`)

```bash
# Configuração inicial SSL (execute apenas uma vez)
./scripts/init-letsencrypt.sh
```

---

## 🔧 **Melhorias Implementadas**

### ✅ **Deploy Unificado:**
- **3 ambientes** em um script só
- **Git pull** automático opcional
- **Cache control** para builds
- **Logs estruturados** com cores
- **URLs de acesso** por ambiente

### ✅ **Utilities Completo:**
- **9 comandos** essenciais
- **Debug integrado** (shell, logs, status)
- **Manutenção** (clean, restart, backup)
- **Monitoramento** (health, ssl)
- **Operações BD** (Supabase)

### ✅ **Backup Robusto:**
- **Verificação de espaço** em disco
- **Checksum SHA256** para integridade
- **Limpeza automática** de backups antigos
- **Logging estruturado**
- **Webhooks** para notificações

### ✅ **Padronização:**
- **Cores consistentes** em todos os scripts
- **Error handling** robusto (`set -euo pipefail`)
- **Logging unificado** com timestamps
- **Help integrado** em todos os scripts

---

## 📝 **Migração dos Scripts Antigos**

### **Equivalências:**

| Script Antigo | Novo Comando |
|---------------|--------------|
| `./atualizar.sh` | `./scripts/deploy.sh prod --pull` |
| `./update-production.sh` | `./scripts/deploy.sh prod` |
| `./scripts/docker-deploy.sh` | `./scripts/deploy.sh dev` |

### **Comandos de Limpeza:**

```bash
# Remover scripts antigos (após testar novos)
rm atualizar.sh
rm update-production.sh  
rm scripts/docker-deploy.sh

# Tornar scripts executáveis
chmod +x scripts/deploy.sh
chmod +x scripts/utils.sh
chmod +x scripts/backup.sh
chmod +x scripts/init-letsencrypt.sh
```

---

## 🎯 **Comandos Mais Usados**

```bash
# Deploy desenvolvimento
./scripts/deploy.sh dev

# Deploy produção com pull
./scripts/deploy.sh prod --pull

# Ver logs da API
./scripts/utils.sh logs api

# Status geral
./scripts/utils.sh status

# Saúde dos serviços
./scripts/utils.sh health

# Reiniciar serviço
./scripts/utils.sh restart api

# Limpeza geral
./scripts/utils.sh clean

# Shell no container
./scripts/utils.sh shell api
```

---

## 🆘 **Solução de Problemas**

### **Script não executa:**
```bash
chmod +x scripts/deploy.sh scripts/utils.sh
```

### **Erro de Docker:**
```bash
./scripts/utils.sh health
./scripts/utils.sh status
```

### **Logs com erro:**
```bash
./scripts/utils.sh logs api
./scripts/utils.sh logs all
```

### **SSL não funciona:**
```bash
./scripts/utils.sh ssl
```

---

## 📚 **Exemplos Práticos**

### **Deploy completo em produção:**
```bash
# Parar, atualizar código, rebuild e iniciar
./scripts/deploy.sh prod --pull --no-cache --logs
```

### **Debug de problema:**
```bash
# 1. Ver status
./scripts/utils.sh status

# 2. Ver logs
./scripts/utils.sh logs api

# 3. Abrir shell se necessário
./scripts/utils.sh shell api

# 4. Reiniciar se necessário
./scripts/utils.sh restart api
```

### **Manutenção preventiva:**
```bash
# 1. Backup
./scripts/utils.sh backup

# 2. Verificar saúde
./scripts/utils.sh health

# 3. Limpeza
./scripts/utils.sh clean
```

A nova estrutura é **mais simples, robusta e organizada**! 🎉 