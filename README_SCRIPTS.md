# 🚀 **Scripts de Produção - FgtsAgent**

## 📋 **Scripts Essenciais (8 scripts)**

### **🎯 Deploy Principal**
```bash
./scripts/deploy-docker.sh     # Deploy completo com diagnóstico
./scripts/prod-deploy.sh       # Deploy simplificado para produção
```

### **🔧 Setup Inicial**
```bash
./scripts/install-docker-compose.sh  # Instalar Docker Compose
./scripts/setup-env.sh               # Configurar variáveis de ambiente
```

### **🔐 Configuração SSL**
```bash
./scripts/init-letsencrypt.sh   # Configurar certificados SSL
```

### **🛠️ Troubleshooting**
```bash
./scripts/fix-ssl-issues.sh     # Corrigir problemas SSL
./scripts/fix-health.sh         # Corrigir health checks
```

### **📊 Configuração Sistema**
```bash
./scripts/logrotate.conf        # Rotação de logs
```

---

## 🎯 **Comandos de Produção**

### **Deploy Rápido:**
```bash
# Produção simplificada
./scripts/prod-deploy.sh

# Produção com diagnóstico completo
./scripts/deploy-docker.sh
```

### **Setup Novo Servidor:**
```bash
# 1. Instalar Docker Compose
sudo ./scripts/install-docker-compose.sh

# 2. Configurar ambiente
./scripts/setup-env.sh

# 3. Deploy inicial
./scripts/prod-deploy.sh

# 4. Configurar SSL (se necessário)
./scripts/init-letsencrypt.sh
```

### **Troubleshooting:**
```bash
# Problemas SSL
./scripts/fix-ssl-issues.sh

# Problemas health checks
./scripts/fix-health.sh
```

---

## 📊 **Estrutura Final**

```
scripts/
├── deploy-docker.sh        # ✅ Deploy principal
├── prod-deploy.sh          # ✅ Deploy simplificado
├── init-letsencrypt.sh     # ✅ Configuração SSL
├── logrotate.conf          # ✅ Rotação de logs
├── install-docker-compose.sh  # ⚠️ Setup inicial
├── setup-env.sh            # ⚠️ Configuração inicial
├── fix-ssl-issues.sh       # 🔧 Troubleshooting SSL
└── fix-health.sh           # 🔧 Troubleshooting health
```

---

## 🗑️ **Scripts Removidos**

Os seguintes scripts foram removidos por redundância:

- ❌ `deploy.sh` - Deploy antigo complexo
- ❌ `quick-deploy.sh` - Funcionalidade duplicada
- ❌ `test-frontend-build.sh` - Integrado no deploy principal

---

## 🎯 **Recomendações de Uso**

### **🟢 Produção Diária:**
```bash
./scripts/prod-deploy.sh    # Deploy rápido
```

### **🔧 Produção com Diagnóstico:**
```bash
./scripts/deploy-docker.sh  # Deploy completo
```

### **🚀 Primeiro Deploy:**
```bash
# Setup completo
sudo ./scripts/install-docker-compose.sh
./scripts/setup-env.sh
./scripts/prod-deploy.sh
./scripts/init-letsencrypt.sh
```

### **🛠️ Problemas:**
```bash
# Problemas SSL
./scripts/fix-ssl-issues.sh

# Problemas gerais
./scripts/fix-health.sh
```

---

## 🏆 **Resultado Final**

✅ **Redução de 10 → 8 scripts**  
✅ **Eliminação de redundâncias**  
✅ **Scripts otimizados para produção**  
✅ **Documentação clara de uso**  
✅ **Deploy simplificado criado** 