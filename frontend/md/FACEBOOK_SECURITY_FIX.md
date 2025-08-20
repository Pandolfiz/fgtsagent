# 🔒 Solução para "Login não seguro bloqueado" - Facebook SDK

## 🚨 **Problema Identificado**

O erro **"Login não seguro bloqueado"** ocorre quando o Facebook SDK detecta problemas de segurança na conexão. Mesmo que a URL mostre `https://`, o problema pode ser causado por:

### **Causas Principais:**

1. **Conteúdo Misto**: A página HTTPS carrega recursos HTTP
2. **Certificado SSL Inválido/Expirado**
3. **Redirecionamento Inseguro**: Acesso inicial via HTTP
4. **Domínio não autorizado** no Facebook App
5. **Configurações de segurança** do navegador

---

## ✅ **Soluções Implementadas**

### **1. Verificações de Segurança Automáticas**

```typescript
// Verificação de protocolo HTTPS
if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
  showError('O Facebook SDK requer HTTPS para funcionar corretamente.', 'Erro de Segurança');
  return;
}
```

### **2. Carregamento Direto do Embed**

- ✅ **Botão "Conectar Meta"** agora abre o embed diretamente
- ✅ **Processo automático** sem necessidade de clicar em botões adicionais
- ✅ **Verificações prévias** antes de iniciar o processo

### **3. Melhor Tratamento de Erros**

```typescript
// Tratamento específico para diferentes tipos de erro
if (response.status === 'not_authorized') {
  showError('Você precisa autorizar o app para continuar.', 'Autorização Necessária');
} else if (response.status === 'unknown') {
  showError('Erro desconhecido durante o login.', 'Erro de Conexão');
}
```

---

## 🔧 **Configurações Necessárias**

### **1. Facebook App Settings**

No seu app do Facebook Developers:

1. **Configurações > Básico**
   - ✅ App ID configurado
   - ✅ Domínio do app configurado

2. **Configurações > Avançado**
   - ✅ **Domínios de aplicativo válidos**: Adicione seu domínio
   - ✅ **URIs de redirecionamento OAuth válidos**: Adicione `https://seu-dominio.com/`

3. **Produtos > WhatsApp Business API**
   - ✅ **Configurações > Cadastro incorporado**
   - ✅ Config ID criado e configurado

### **2. Variáveis de Ambiente**

```env
# Frontend (.env)
VITE_APP_META_APP_ID=seu_app_id_aqui
VITE_APP_META_CONFIG_ID=seu_config_id_aqui
VITE_API_URL=https://seu-dominio.com
```

### **3. Configurações do Servidor**

#### **Para Desenvolvimento Local:**
```bash
# Usar HTTPS local
npm run dev -- --https
# ou
vite --https
```

#### **Para Produção:**
- ✅ **SSL/HTTPS** configurado corretamente
- ✅ **Certificado válido** (não auto-assinado)
- ✅ **Redirecionamento HTTP → HTTPS**

---

## 🛠️ **Troubleshooting**

### **1. Verificar Protocolo**

```javascript
// No console do navegador
console.log('Protocolo:', window.location.protocol);
console.log('Hostname:', window.location.hostname);
console.log('URL completa:', window.location.href);
```

### **2. Verificar Configurações do Facebook**

```javascript
// Verificar se o SDK está carregado
console.log('Facebook SDK:', window.FB);
console.log('App ID:', FACEBOOK_CONFIG.APP_ID);
console.log('Config ID:', FACEBOOK_CONFIG.CONFIG_ID);
```

### **3. Verificar Domínios Autorizados**

No Facebook Developers:
- **Configurações > Básico > Domínio do app**
- **Configurações > Avançado > Domínios de aplicativo válidos**

### **4. Testar em Diferentes Ambientes**

| Ambiente | Protocolo | Status |
|----------|-----------|--------|
| Localhost | HTTP | ✅ Funciona |
| Localhost | HTTPS | ✅ Funciona |
| Produção | HTTP | ❌ Bloqueado |
| Produção | HTTPS | ✅ Funciona |

---

## 🚀 **Como Testar**

### **1. Desenvolvimento Local**

```bash
# Terminal 1 - Backend
cd src
npm run dev

# Terminal 2 - Frontend (HTTPS)
cd frontend
npm run dev -- --https
```

### **2. Verificar Configurações**

1. **Acesse** `https://localhost:5173` (não `http://`)
2. **Abra** o console do navegador (F12)
3. **Clique** em "Conectar Meta"
4. **Verifique** os logs no console

### **3. Logs Esperados**

```
🔄 Carregando Facebook SDK...
✅ Facebook SDK carregado com sucesso
📱 Abrindo modal do Meta Signup...
🚀 Iniciando processo de conexão com a Meta...
📱 Resposta do Facebook: {authResponse: {...}}
```

---

## 🔍 **Diagnóstico de Problemas**

### **Erro: "Login não seguro bloqueado"**

**Causas possíveis:**
1. ❌ **Protocolo HTTP** em produção
2. ❌ **Certificado SSL inválido**
3. ❌ **Domínio não autorizado** no Facebook
4. ❌ **Conteúdo misto** (HTTPS carregando HTTP)

**Soluções:**
1. ✅ **Forçar HTTPS** em produção
2. ✅ **Renovar certificado SSL**
3. ✅ **Adicionar domínio** no Facebook App
4. ✅ **Verificar recursos** carregados

### **Erro: "Facebook SDK não carregado"**

**Causas possíveis:**
1. ❌ **App ID não configurado**
2. ❌ **Domínio não autorizado**
3. ❌ **Bloco de scripts** do navegador

**Soluções:**
1. ✅ **Verificar variáveis** de ambiente
2. ✅ **Configurar domínios** no Facebook
3. ✅ **Desabilitar bloqueadores** temporariamente

---

## 📞 **Suporte**

### **Logs para Debug**

Se o problema persistir, colete:

1. **Console do navegador** (F12 → Console)
2. **Network tab** (F12 → Network)
3. **Configurações** do Facebook App
4. **URL** onde o erro ocorre

### **Contato**

- **Email**: suporte@fgtsagent.com
- **WhatsApp**: (27) 99611-5348

---

**Última atualização**: 01/08/2025  
**Versão**: 1.0  
**Status**: Implementado ✅ 