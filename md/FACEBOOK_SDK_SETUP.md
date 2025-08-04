# 🔗 Configuração do Facebook SDK para WhatsApp Business

## 📋 **Visão Geral**

Este documento explica como configurar o Facebook SDK para permitir que usuários conectem suas contas do WhatsApp Business através do **Embedded Signup** oficial da Meta.

---

## 🎯 **Funcionalidades Implementadas**

### **1. Facebook SDK Integration**
- Carregamento automático do Facebook SDK
- Configuração com App ID e Config ID
- Embedded Signup para WhatsApp Business

### **2. Modal de Conexão**
- Interface amigável para conectar contas
- Estados de loading, sucesso e erro
- Botão alternativo para Meta Business Suite

### **3. Processo de Autorização**
- Login com Facebook Business
- Código de autorização
- Integração com backend (TODO)

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
3. Configure as permissões necessárias

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
VITE_APP_META_APP_ID=your_facebook_app_id_here
VITE_APP_META_CONFIG_ID=your_facebook_config_id_here

# API Configuration
VITE_API_URL=http://localhost:3000
```

---

## 🚀 **Como Usar**

### **1. Para o Usuário Final**

1. **Acesse** a página de credenciais WhatsApp
2. **Clique** no botão "Conectar Meta" (ícone do Facebook)
3. **Clique** em "Conectar com Facebook"
4. **Faça login** na sua conta do Facebook Business
5. **Siga** o processo de configuração do WhatsApp Business
6. **Volte** ao app e clique em "Verificar Conexões"

### **2. Alternativa (Nova Aba)**

Se o Facebook SDK não funcionar:
1. Clique em "Abrir Meta Business Suite"
2. Complete o processo na nova aba
3. Volte ao app e verifique conexões

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

### **Carregamento do SDK**
```typescript
const loadFacebookSDK = () => {
  if (window.FB) {
    setFbSDKLoaded(true);
    return;
  }

  window.fbAsyncInit = function() {
    window.FB.init({
      appId: import.meta.env.VITE_APP_META_APP_ID,
      autoLogAppEvents: true,
      xfbml: true,
      version: 'v23.0'
    });
    setFbSDKLoaded(true);
  };

  // Carregar SDK assincronamente
  (function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    if (fjs.parentNode) {
      fjs.parentNode.insertBefore(js, fjs);
    }
  }(document, 'script', 'facebook-jssdk'));
};
```

### **Processo de Login**
```typescript
const launchWhatsAppSignup = () => {
  if (!window.FB) {
    showError('Facebook SDK não carregado');
    return;
  }

  const fbLoginCallback = (response: any) => {
    if (response.authResponse) {
      const code = response.authResponse.code;
      handleFacebookAuthCode(code);
    } else {
      showError('Login cancelado ou não autorizado');
    }
  };

  window.FB.login(fbLoginCallback, {
    config_id: import.meta.env.VITE_APP_META_CONFIG_ID,
    response_type: 'code',
    override_default_response_type: true,
    extras: {
      setup: {
        business_name: currentUser?.full_name || 'Minha Empresa',
        email: currentUser?.email || '',
      },
      featureType: 'whatsapp_business',
      sessionInfoVersion: '3',
    }
  });
};
```

---

## 📱 **Estados da Interface**

### **Estados de Conexão**
- **`idle`**: Estado inicial
- **`connecting`**: Conectando com loading
- **`connected`**: Conexão bem-sucedida
- **`error`**: Erro na conexão

### **Indicadores Visuais**
- **Loading**: Spinner animado
- **Sucesso**: Ícone de check verde
- **Erro**: Ícone de exclamação vermelho

---

## 🔄 **Integração com Backend**

### **Endpoint Necessário (TODO)**
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

1. **"Facebook SDK não carregado"**
   - Verificar se App ID está configurado
   - Verificar se domínio está autorizado
   - Recarregar página

2. **"Login cancelado"**
   - Usuário não completou autorização
   - Usar botão "Abrir Meta Business Suite"

3. **"Erro de configuração"**
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
**Versão**: 1.0  
**Status**: Implementado (Frontend) / Pendente (Backend) 