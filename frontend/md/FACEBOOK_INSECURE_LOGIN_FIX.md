# 🚨 Solução para "Login não seguro bloqueado" - Facebook SDK

## 🚨 **Problema Identificado**

O erro **"Login não seguro bloqueado"** está ocorrendo porque o Facebook está detectando que a **origem da requisição** (onde o app está rodando) não está segura, mesmo que a URL do Facebook seja HTTPS.

### **Causa Raiz:**
O Facebook SDK **requer HTTPS** para funcionar corretamente, mas o servidor de desenvolvimento está rodando em HTTP.

---

## ✅ **Soluções Implementadas**

### **1. Forçar HTTPS no Vite**

**Configuração atualizada em `vite.config.js`:**
```javascript
server: {
  host: 'localhost',
  port: 5173,
  https: {
    // Certificados auto-assinados para desenvolvimento
    key: undefined, // Vite vai gerar automaticamente
    cert: undefined, // Vite vai gerar automaticamente
  },
  // ... outras configurações
}
```

### **2. Scripts HTTPS Adicionados**

**Novos scripts no `package.json`:**
```json
{
  "scripts": {
    "dev": "vite",
    "dev:https": "vite --https",
    "preview": "vite preview",
    "preview:https": "vite preview --https"
  }
}
```

### **3. Verificações de Segurança Melhoradas**

**Configuração atualizada em `src/config/facebook.ts`:**
```typescript
export const isFacebookConfigured = () => {
  const hasValidConfig = FACEBOOK_CONFIG.APP_ID !== 'your_META_APP_ID_here' && 
                        FACEBOOK_CONFIG.CONFIG_ID !== 'your_META_APP_CONFIG_ID_here';
  
  const isSecureConnection = window.location.protocol === 'https:' || 
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1';
  
  const isDomainAllowed = FACEBOOK_CONFIG.SECURITY_CONFIG.isDomainAllowed();
  
  return hasValidConfig && isSecureConnection && isDomainAllowed;
};
```

---

## 🚀 **Como Resolver AGORA**

### **1. Parar o servidor atual (se estiver rodando)**

```bash
# Pressione Ctrl+C no terminal onde o servidor está rodando
```

### **2. Iniciar com HTTPS**

```bash
# Terminal 1 - Backend
cd src
npm run dev

# Terminal 2 - Frontend (HTTPS)
cd frontend
npm run dev:https
```

### **3. Acessar via HTTPS**

**IMPORTANTE:** Acesse via `https://localhost:5173` (não `http://`)

```
✅ CORRETO: https://localhost:5173
❌ ERRADO:  http://localhost:5173
```

### **4. Aceitar o certificado auto-assinado**

Quando acessar `https://localhost:5173`, o navegador vai mostrar um aviso de segurança:

1. **Clique em "Avançado"**
2. **Clique em "Prosseguir para localhost (não seguro)"**
3. **O site vai carregar normalmente**

---

## 🔧 **Configurações do Facebook App**

### **1. Verificar Domínios Autorizados**

No Facebook Developers → Seu App → **Configurações > Avançado**:

**Domínios de aplicativo válidos:**
```
localhost
127.0.0.1
fgtsagent.com.br
www.fgtsagent.com.br
```

**URIs de redirecionamento OAuth válidos:**
```
https://localhost:5173/
https://127.0.0.1:5173/
https://fgtsagent.com.br/
https://www.fgtsagent.com.br/
```

### **2. Verificar Configurações Básicas**

**Configurações > Básico:**
- ✅ **App ID** configurado
- ✅ **Domínio do app** configurado
- ✅ **URL do site** configurada

### **3. Verificar WhatsApp Business API**

**Produtos > WhatsApp Business API:**
- ✅ **Configurações > Cadastro incorporado**
- ✅ **Config ID** criado e configurado

---

## 🛠️ **Troubleshooting**

### **Problema: Certificado não confiável**

**Solução:**
1. Clique em "Avançado" no aviso de segurança
2. Clique em "Prosseguir para localhost"
3. O certificado auto-assinado é normal em desenvolvimento

### **Problema: Ainda aparece "login não seguro"**

**Verificar:**
1. ✅ **URL começa com `https://`**
2. ✅ **Domínio está autorizado** no Facebook App
3. ✅ **App ID e Config ID** configurados corretamente
4. ✅ **Variáveis de ambiente** definidas

### **Problema: Facebook SDK não carrega**

**Verificar console do navegador (F12):**
```javascript
// Deve mostrar:
🔍 Iniciando carregamento do Facebook SDK...
📍 URL atual: https://localhost:5173/...
🔒 Protocolo: https:
🌐 Hostname: localhost
✅ Facebook SDK carregado com sucesso
```

---

## 📋 **Checklist de Verificação**

### **✅ Configurações Locais:**
- [ ] Servidor rodando com `npm run dev:https`
- [ ] Acessando via `https://localhost:5173`
- [ ] Certificado auto-assinado aceito
- [ ] Console não mostra erros de HTTPS

### **✅ Configurações do Facebook:**
- [ ] App ID configurado no `.env`
- [ ] Config ID configurado no `.env`
- [ ] Domínio `localhost` autorizado
- [ ] WhatsApp Business API configurado

### **✅ Teste da Integração:**
- [ ] Página carrega sem erros
- [ ] Botão "Conectar Meta" funciona
- [ ] Modal abre corretamente
- [ ] Facebook SDK carrega sem erros

---

## 🚨 **Se o Problema Persistir**

### **1. Verificar Logs Detalhados**

Abra o console do navegador (F12) e verifique:

```javascript
// Deve aparecer:
🔍 Verificação de configuração Facebook: {
  hasValidConfig: true,
  isSecureConnection: true,
  isDomainAllowed: true,
  protocol: "https:",
  hostname: "localhost",
  appId: "seu_app_id_real",
  configId: "seu_config_id_real"
}
```

### **2. Verificar Network Tab**

No console do navegador → **Network**:
- ✅ **facebook.com** carregando via HTTPS
- ✅ **connect.facebook.net** carregando via HTTPS
- ❌ **Nenhum erro 404 ou 403**

### **3. Testar em Produção**

Se funcionar em localhost mas não em produção:
- ✅ **Certificado SSL válido** instalado
- ✅ **Domínio de produção** autorizado no Facebook
- ✅ **Redirecionamento HTTP → HTTPS** configurado

---

## 📞 **Suporte**

### **Logs para Debug**

Se o problema persistir, colete:

1. **Console do navegador** (F12 → Console)
2. **Network tab** (F12 → Network)
3. **URL completa** onde o erro ocorre
4. **Configurações** do Facebook App

### **Contato**

- **Email**: suporte@fgtsagent.com
- **WhatsApp**: (27) 99611-5348

---

**Última atualização**: 01/08/2025  
**Versão**: 1.0  
**Status**: Implementado ✅ 