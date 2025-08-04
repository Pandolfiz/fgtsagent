# 🔗 Configuração do Facebook SDK para WhatsApp Business

## 📋 **Visão Geral**

Este documento explica como configurar o Facebook SDK para permitir que usuários conectem suas contas do WhatsApp Business através do **Embedded Signup** oficial da Meta.

---

## 🎯 **O que foi implementado**

### **1. Facebook SDK Integration**
- ✅ Carregamento automático do Facebook SDK
- ✅ Configuração centralizada com App ID e Config ID
- ✅ Embedded Signup para WhatsApp Business
- ✅ Tratamento de erros e validações

### **2. Modal de Conexão**
- ✅ Interface amigável para conectar contas
- ✅ Estados de loading, sucesso e erro
- ✅ Botão alternativo para Meta Business Suite

### **3. Processo de Autorização**
- ✅ Login com Facebook Business
- ✅ Código de autorização
- ⏳ Integração com backend (TODO)

---

## 🔧 **Configuração Necessária**

### **1. Criar App no Facebook Developers**

1. Acesse [Facebook Developers](https://developers.facebook.com/)
2. Clique em "Criar App"
3. Selecione "Business" como tipo
4. Preencha as informações do app

### **2. Configurar WhatsApp Business API**

1. No seu app, vá para "Produtos"
2. Adicione "WhatsApp Business API"
3. Configure as permissões necessárias:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
   - `business_management`

### **3. Obter App ID e Config ID**

```bash
# App ID: encontrado na página principal do app
VITE_APP_META_APP_ID=123456789012345

# Config ID: encontrado em WhatsApp > Getting Started
VITE_APP_META_CONFIG_ID=abcdef123456
```

### **4. Configurar Variáveis de Ambiente**

Crie um arquivo `.env` no diretório `frontend/`:

```env
# Facebook SDK Configuration
VITE_APP_META_APP_ID=your_META_APP_ID_here
VITE_APP_META_CONFIG_ID=your_META_APP_CONFIG_ID_here

# API Configuration
VITE_API_URL=http://localhost:3000
```

---

## 🚀 **Como Funciona**

### **1. Para o Usuário Final**

1. **Acesse** a página de credenciais WhatsApp
2. **Clique** no botão "Conectar Meta" (ícone do Facebook)
3. **Clique** em "Conectar com Facebook"
4. **Faça login** na sua conta do Facebook Business
5. **Siga** o processo de configuração do WhatsApp Business
6. **Volte** ao app e clique em "Verificar Conexões"

### **2. Fluxo Técnico**

1. **Carregamento do SDK**: Facebook SDK é carregado automaticamente
2. **Validação**: Verifica se APP_ID e CONFIG_ID estão configurados
3. **Login**: Inicia processo de login com Facebook
4. **Autorização**: Usuário autoriza o app no Facebook
5. **Callback**: Recebe código de autorização
6. **Backend**: Envia código para backend processar (TODO)

### **3. Estados da Interface**

- **`idle`**: Estado inicial
- **`connecting`**: Conectando com loading
- **`connected`**: Conexão bem-sucedida
- **`error`**: Erro na conexão

---

## 🔒 **Segurança e Permissões**

### **Permissões do Facebook App**
- `whatsapp_business_management`
- `whatsapp_business_messaging`
- `business_management`

### **Configurações de Segurança**
- Domínios autorizados
- URLs de redirecionamento
- Configurações de privacidade

---

## 🛠️ **Implementação Técnica**

### **Arquivos Principais**

1. **`src/config/facebook.ts`** - Configuração centralizada
2. **`src/components/whatsapp-credentials/WhatsappCredentialsPage.tsx`** - Componente principal
3. **`src/types/facebook.d.ts`** - Tipos TypeScript

### **Configuração Centralizada**

```typescript
// src/config/facebook.ts
export const FACEBOOK_CONFIG = {
  APP_ID: import.meta.env.VITE_APP_META_APP_ID || 'your_META_APP_ID_here',
  CONFIG_ID: import.meta.env.VITE_APP_META_CONFIG_ID || 'your_META_APP_CONFIG_ID_here',
  API_VERSION: 'v23.0',
  // ... outras configurações
};
```

### **Carregamento do SDK**

```typescript
const loadFacebookSDK = () => {
  if (!isFacebookConfigured()) {
    console.warn('⚠️ Facebook SDK não configurado');
    return;
  }

  window.fbAsyncInit = function() {
    window.FB.init({
      appId: FACEBOOK_CONFIG.APP_ID,
      ...FACEBOOK_CONFIG.SDK_CONFIG,
      version: FACEBOOK_CONFIG.API_VERSION
    });
    setFbSDKLoaded(true);
  };
};
```

### **Processo de Login**

```typescript
const launchWhatsAppSignup = () => {
  if (!isFacebookConfigured()) {
    showError(FACEBOOK_ERRORS.NOT_CONFIGURED);
    return;
  }

  const fbLoginCallback = (response: any) => {
    if (response.authResponse) {
      const code = response.authResponse.code;
      handleFacebookAuthCode(code);
    } else {
      showError(FACEBOOK_ERRORS.LOGIN_CANCELLED);
    }
  };

  window.FB.login(fbLoginCallback, {
    config_id: FACEBOOK_CONFIG.CONFIG_ID,
    ...FACEBOOK_CONFIG.SIGNUP_CONFIG,
    extras: {
      ...FACEBOOK_CONFIG.SIGNUP_CONFIG.extras,
      setup: {
        business_name: currentUser?.full_name || 'Minha Empresa',
        email: currentUser?.email || '',
      },
    }
  });
};
```

---

## 🔄 **Integração com Backend (TODO)**

### **Endpoint Necessário**

```typescript
// Endpoint para processar código de autorização
const handleFacebookAuthCode = async (code: string) => {
  const response = await api.evolution.processFacebookAuthCode({ code });
  // Processar resposta e atualizar credenciais
};
```

### **Fluxo de Dados**

1. Usuário autoriza no Facebook
2. Código de autorização é enviado para backend
3. Backend troca código por access token
4. Backend cria credencial no sistema
5. Frontend atualiza lista de credenciais

---

## 🚨 **Limitações e Considerações**

### **Limitações do Facebook SDK**
- Requer configuração no Facebook Developers
- Apenas funciona em domínios autorizados
- Usuário precisa ter conta Facebook Business

### **Soluções Alternativas**
- Botão para abrir Meta Business Suite
- Processo manual de configuração
- Suporte técnico para configuração

### **Monitoramento**
- Logs de tentativas de conexão
- Erros de autorização
- Taxa de sucesso de conexão

---

## 📈 **Métricas e Analytics**

### **Eventos a Monitorar**
- Clicks no botão "Conectar Meta"
- Tentativas de login com Facebook
- Sucessos/falhas de autorização
- Uso do botão alternativo

### **Dados a Coletar**
- Tempo de processo de conexão
- Taxa de sucesso de autorização
- Erros mais comuns
- Preferência por método de conexão

---

## 🛠️ **Manutenção e Atualizações**

### **Atualizações do SDK**
- Monitorar mudanças na API do Facebook
- Atualizar versão do SDK quando necessário
- Testar funcionalidade regularmente

### **Configurações do App**
- Revisar permissões periodicamente
- Atualizar domínios autorizados
- Monitorar uso da API

---

## 📞 **Suporte e Troubleshooting**

### **Problemas Comuns**

1. **"Facebook SDK não configurado"**
   - Verificar se APP_ID e CONFIG_ID estão definidos
   - Verificar arquivo .env
   - Reiniciar servidor de desenvolvimento

2. **"Facebook SDK não carregado"**
   - Verificar se domínio está autorizado no Facebook
   - Verificar se App ID está correto
   - Recarregar página

3. **"Login cancelado"**
   - Usuário não completou autorização
   - Usar botão "Abrir Meta Business Suite"

4. **"Erro de configuração"**
   - Verificar Config ID
   - Verificar permissões do app
   - Contatar suporte

### **Contato**
- **Email**: suporte@fgtsagent.com
- **WhatsApp**: (27) 99611-5348
- **Documentação**: Este arquivo

---

## 🎯 **Próximos Passos**

### **Implementações Futuras**
1. **Backend Integration**: Criar endpoint para processar código
2. **Webhook Support**: Receber notificações da Meta
3. **Auto-refresh**: Atualizar credenciais automaticamente
4. **Analytics**: Implementar tracking detalhado

### **Melhorias de UX**
1. **Tutorial Interativo**: Guia passo a passo
2. **Status em Tempo Real**: Atualizações automáticas
3. **Notificações**: Alertas de mudanças de status

---

**Última atualização**: 01/08/2025  
**Versão**: 2.0  
**Status**: Implementado (Frontend) / Pendente (Backend) 