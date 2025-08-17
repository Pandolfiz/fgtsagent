# 🔧 Correções Implementadas para Requisição de SMS

## 📋 **Visão Geral**

Este documento descreve as correções implementadas para resolver o erro 400 (Bad Request) que estava ocorrendo na requisição de códigos de verificação via SMS.

---

## 🚨 **Problemas Identificados**

### **1. Validação Insuficiente de clientId**
- **Problema**: `req.clientId` podia ser `undefined` sem validação
- **Impacto**: Causava erro 400 e falha na busca de credenciais
- **Localização**: `src/controllers/whatsappCredentialController.js`

### **2. Middleware clientContext Sem Validação Robusta**
- **Problema**: Não validava se `req.user` existia
- **Impacto**: Falha silenciosa na extração de `clientId`
- **Localização**: `src/middleware/clientContext.js`

### **3. Logs Insuficientes para Debug**
- **Problema**: Falta de logs detalhados para identificar problemas
- **Impacto**: Dificuldade para diagnosticar erros
- **Localização**: Múltiplos arquivos

### **4. Falta de Validação de Credenciais**
- **Problema**: Não verificava se credencial existe antes de solicitar SMS
- **Impacto**: Tentativa de solicitar SMS para credenciais inexistentes
- **Localização**: `src/controllers/whatsappCredentialController.js`

---

## ✅ **Correções Implementadas**

### **1. Validação Robusta de clientId**

#### **Arquivo**: `src/controllers/whatsappCredentialController.js`

```javascript
// ✅ ADICIONADO: Validação de clientId
if (!clientId) {
  logger.error(`[REQUEST_VERIFICATION_CODE] clientId não encontrado em req.clientId`);
  return res.status(400).json({
    success: false,
    error: 'clientId é obrigatório',
    code: 'MISSING_CLIENT_ID'
  });
}
```

#### **Benefícios**:
- ✅ Previne erro 400 por `clientId` undefined
- ✅ Mensagem de erro clara e específica
- ✅ Código de erro para identificação

---

### **2. Middleware clientContext Melhorado**

#### **Arquivo**: `src/middleware/clientContext.js`

```javascript
// ✅ ADICIONADO: Validação de req.user
if (!req.user) {
  logger.error('[CLIENT-CONTEXT] req.user não encontrado');
  return res.status(401).json({
    success: false,
    error: 'Usuário não autenticado'
  });
}

// ✅ ADICIONADO: Validação de clientId
if (!clientId) {
  logger.error('[CLIENT-CONTEXT] client_id ausente e fallback falhou');
  return res.status(400).json({
    success: false,
    error: 'client_id não encontrado'
  });
}
```

#### **Benefícios**:
- ✅ Validação em cada etapa do processo
- ✅ Respostas HTTP apropriadas (401, 400)
- ✅ Logs detalhados para debug

---

### **3. Logs Detalhados para Debug**

#### **Backend - Controlador**:
```javascript
logger.info(`[REQUEST_VERIFICATION_CODE] Dados recebidos:`, {
  phoneNumberId,
  accessToken: accessToken ? `${accessToken.substring(0, 10)}...` : 'undefined',
  codeMethod,
  language,
  clientId,
  userAgent: req.headers['user-agent'],
  contentType: req.headers['content-type']
});

logger.info(`[REQUEST_VERIFICATION_CODE] req.user:`, {
  id: req.user?.id,
  email: req.user?.email,
  app_metadata: req.user?.app_metadata
});
```

#### **Backend - Serviço WhatsApp**:
```javascript
logger.error(`[WHATSAPP] Erro completo ao solicitar código:`, {
  message: error.message,
  status: error.response?.status,
  statusText: error.response?.statusText,
  data: error.response?.data,
  headers: error.response?.headers,
  config: {
    url: error.config?.url,
    method: error.config?.method,
    headers: error.config?.headers
  }
});
```

#### **Frontend**:
```typescript
console.log('📱 Dados recebidos:', { 
  phoneNumberId, 
  accessToken: accessToken ? `${accessToken.substring(0, 10)}...` : 'undefined' 
});

console.log('📱 Payload a ser enviado:', {
  phoneNumberId,
  accessToken: `${accessToken.substring(0, 10)}...`,
  codeMethod: 'SMS',
  language: 'pt_BR'
});
```

#### **Benefícios**:
- ✅ Rastreamento completo da requisição
- ✅ Identificação rápida de problemas
- ✅ Debug facilitado em produção

---

### **4. Validação de Credenciais**

#### **Verificação de Existência**:
```javascript
if (credentialError.code === 'PGRST116') {
  return res.status(404).json({
    success: false,
    error: 'Credencial não encontrada para este número de telefone',
    code: 'CREDENTIAL_NOT_FOUND'
  });
}
```

#### **Verificação de Propriedade**:
```javascript
if (credential.client_id !== clientId) {
  return res.status(403).json({
    success: false,
    error: 'Acesso negado a esta credencial',
    code: 'ACCESS_DENIED'
  });
}
```

#### **Verificação de Tipo**:
```javascript
if (credential.connection_type !== 'ads') {
  return res.status(400).json({
    success: false,
    error: 'Esta credencial não suporta solicitação de SMS. Apenas credenciais da Meta API suportam esta funcionalidade.',
    code: 'UNSUPPORTED_CREDENTIAL_TYPE'
  });
}
```

#### **Benefícios**:
- ✅ Previne tentativas em credenciais inexistentes
- ✅ Segurança melhorada (acesso apenas às próprias credenciais)
- ✅ Validação de tipo de conexão

---

### **5. Validação Frontend**

#### **Validação de Dados**:
```typescript
// ✅ ADICIONADO: Validação dos dados antes de enviar
if (!phoneNumberId || !phoneNumberId.trim()) {
  console.error('❌ phoneNumberId é obrigatório');
  showError('ID do número de telefone é obrigatório', 'Dados Inválidos');
  return false;
}

if (!accessToken || !accessToken.trim()) {
  console.error('❌ accessToken é obrigatório');
  showError('Token de acesso é obrigatório', 'Dados Inválidos');
  return false;
}
```

#### **Tratamento de Resposta**:
```typescript
if (!response.ok) {
  console.error('❌ Erro na resposta da API:', response.status, response.statusText);
  const errorText = await response.text();
  console.error('❌ Conteúdo do erro:', errorText);
  
  try {
    const errorData = JSON.parse(errorText);
    showError(
      errorData.error || `Erro ${response.status}: ${response.statusText}`,
      'Erro na API'
    );
  } catch (parseError) {
    showError(
      `Erro ${response.status}: ${response.statusText}`,
      'Erro na API'
    );
  }
  return false;
}
```

#### **Benefícios**:
- ✅ Validação local antes de enviar para API
- ✅ Tratamento robusto de erros HTTP
- ✅ Mensagens de erro claras para o usuário

---

## 🧪 **Script de Teste**

### **Arquivo**: `src/scripts/test_sms_request.js`

#### **Funcionalidades**:
- ✅ Testa requisições sem autenticação (deve retornar 401)
- ✅ Testa requisições com dados inválidos (deve retornar 400)
- ✅ Testa validação de campos obrigatórios
- ✅ Verifica mensagens de erro apropriadas

#### **Como Executar**:
```bash
cd src/scripts
node test_sms_request.js
```

---

## 📊 **Códigos de Erro Implementados**

| **Código** | **Descrição** | **HTTP Status** |
|------------|---------------|-----------------|
| `MISSING_CLIENT_ID` | clientId não encontrado | 400 |
| `CREDENTIAL_NOT_FOUND` | Credencial não encontrada | 404 |
| `ACCESS_DENIED` | Acesso negado à credencial | 403 |
| `UNSUPPORTED_CREDENTIAL_TYPE` | Tipo de credencial não suporta SMS | 400 |
| `RATE_LIMIT_EXCEEDED` | Limite de tentativas excedido | 429 |

---

## 🔍 **Como Debuggar Problemas**

### **1. Verificar Logs do Backend**:
```bash
# Procurar por logs com prefixo [REQUEST_VERIFICATION_CODE]
grep "\[REQUEST_VERIFICATION_CODE\]" logs/app.log

# Procurar por logs com prefixo [CLIENT-CONTEXT]
grep "\[CLIENT-CONTEXT\]" logs/app.log

# Procurar por logs com prefixo [WHATSAPP]
grep "\[WHATSAPP\]" logs/app.log
```

### **2. Verificar Console do Frontend**:
```javascript
// Procurar por logs com prefixo 📱
// Verificar se os dados estão sendo enviados corretamente
```

### **3. Testar Endpoint Diretamente**:
```bash
# Usar o script de teste
node src/scripts/test_sms_request.js

# Ou usar curl/Postman para testar manualmente
```

---

## 🎯 **Resultados Esperados**

### **Antes das Correções**:
- ❌ Erro 400 sem mensagem clara
- ❌ Dificuldade para identificar problema
- ❌ Falha silenciosa do middleware
- ❌ Tentativas em credenciais inválidas

### **Após as Correções**:
- ✅ Validação robusta em todas as etapas
- ✅ Mensagens de erro claras e específicas
- ✅ Logs detalhados para debug
- ✅ Códigos de erro padronizados
- ✅ Segurança melhorada

---

## 🚀 **Próximos Passos**

### **1. Testar em Desenvolvimento**:
- ✅ Executar script de teste
- ✅ Verificar logs do backend
- ✅ Testar interface do usuário

### **2. Testar em Produção**:
- ✅ Verificar se logs estão funcionando
- ✅ Monitorar erros 400/401/403/404
- ✅ Validar mensagens de erro

### **3. Monitoramento Contínuo**:
- ✅ Configurar alertas para erros frequentes
- ✅ Revisar logs periodicamente
- ✅ Ajustar validações conforme necessário

---

## 📞 **Suporte**

Se ainda houver problemas após as correções:

1. **Verificar logs** do backend e frontend
2. **Executar script de teste** para validar
3. **Verificar configurações** de ambiente
4. **Contatar equipe técnica** com logs detalhados

---

## 📝 **Changelog**

- **2025-01-XX**: Implementação das correções de validação
- **2025-01-XX**: Adição de logs detalhados para debug
- **2025-01-XX**: Criação de script de teste
- **2025-01-XX**: Documentação das correções
