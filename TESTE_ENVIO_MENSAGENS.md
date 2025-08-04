# 🧪 **Teste de Implementação - Envio de Mensagens**

## ✅ **Implementações Realizadas**

### **1. Modificações no `credentialsService.js`**
- ✅ Adicionado suporte para `instanceId` opcional
- ✅ Lógica para retornar credenciais baseado no `connection_type`
- ✅ Para `whatsapp_business`: Retorna credenciais Evolution API
- ✅ Para `ads`: Retorna credenciais Meta API

### **2. Modificações no `evolutionService.js`**
- ✅ Adicionada função `sendMessageViaWebhook()` 
- ✅ Usa webhook: `https://n8n-n8n.8cgx4t.easypanel.host/webhook/sendMessageEvolution`
- ✅ Payload conforme solicitado: `{ to, message, instanceId, instanceName }`

### **3. Modificações no `whatsappService.js`**
- ✅ Adicionado suporte para `instanceId` opcional
- ✅ Lógica para decidir qual API usar baseado no `connection_type`
- ✅ Método `_sendViaEvolutionAPI()`: Usa Evolution API
- ✅ Método `_sendViaMetaAPI()`: Usa API oficial da Meta
- ✅ Fallback: Se webhook falhar, tenta REST API

### **4. Modificações na rota `messages.js`**
- ✅ Obtém `instanceId` do contato
- ✅ Passa `instanceId` para `whatsappService.sendTextMessage()`

## 🔄 **Fluxo de Envio Atualizado**

```
Frontend (Chat.jsx) 
  ↓ POST /api/messages
Backend (messages.js)
  ↓ Obter instanceId do contato
  ↓ whatsappService.sendTextMessage(phone, content, userId, instanceId)
  ↓ credentialsService.getWhatsappCredentials(userId, instanceId)
  ↓ Retorna credenciais baseado no connection_type
  ↓ Se connection_type === 'whatsapp_business'
    ↓ _sendViaEvolutionAPI()
    ↓ evolutionService.sendMessageViaWebhook()
    ↓ Webhook n8n: https://n8n-n8n.8cgx4t.easypanel.host/webhook/sendMessageEvolution
  ↓ Se connection_type === 'ads'
    ↓ _sendViaMetaAPI()
    ↓ API oficial da Meta
```

## 🧪 **Testes Necessários**

### **Teste 1: Credencial ADS (API Oficial da Meta)**
```bash
# Enviar mensagem para contato com connection_type = 'ads'
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "conversationId": "5527997186150@s.whatsapp.net",
    "content": "Teste via API oficial da Meta",
    "recipientId": "5527997186150",
    "role": "ME"
  }'
```

### **Teste 2: Credencial WhatsApp Business (Evolution API)**
```bash
# Enviar mensagem para contato com connection_type = 'whatsapp_business'
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "conversationId": "5527996115344@s.whatsapp.net",
    "content": "Teste via Evolution API",
    "recipientId": "5527996115344",
    "role": "ME"
  }'
```

## 📊 **Dados de Teste no Supabase**

### **Credenciais ADS (API Oficial)**
- **ID**: `47edb3f4-caaf-49a6-9a16-0fbe8ca256c9`
- **Connection Type**: `ads`
- **Phone**: `5527997186150`
- **Status**: `connected`

### **Credenciais WhatsApp Business (Evolution)**
- **ID**: `70f2e786-eba2-48a2-9439-b22214808d5e`
- **Connection Type**: `whatsapp_business`
- **Phone**: `5527996115348`
- **Status**: `pending`

## 🔍 **Logs Esperados**

### **Para Evolution API:**
```
[INFO] Iniciando envio de mensagem para 5527996115344 pelo usuário <userId>, instância: <instanceId>
[INFO] Credenciais obtidas com sucesso
[INFO] Tipo de conexão: whatsapp_business
[INFO] Usando Evolution API para envio de mensagem
[INFO] Iniciando envio via Evolution API
[INFO] Enviando via Evolution API para: 5527996115344@c.us
[INFO] Enviando mensagem via webhook para 5527996115344@c.us
[INFO] Payload para webhook: {"to":"5527996115344@c.us","message":"Teste via Evolution API","instanceId":"<instanceId>","instanceName":"<instanceName>"}
[INFO] Mensagem enviada com sucesso via webhook Evolution
```

### **Para Meta API:**
```
[INFO] Iniciando envio de mensagem para 5527997186150 pelo usuário <userId>
[INFO] Credenciais obtidas com sucesso
[INFO] Tipo de conexão: ads
[INFO] Usando API oficial da Meta para envio de mensagem
[INFO] Iniciando envio via Meta API
[INFO] Usando phoneNumberId: 469870066212895
[INFO] Número de telefone formatado: +5527997186150
[INFO] Mensagem enviada com sucesso: {...}
```

## ⚠️ **Pontos de Atenção**

1. **Webhook n8n**: Deve estar configurado e funcionando
2. **Evolution API**: Deve estar acessível e configurada
3. **Meta API**: Token de acesso deve ser válido
4. **InstanceId**: Deve estar correto na tabela `contacts`

## 🚀 **Próximos Passos**

1. **Testar com credenciais reais**
2. **Verificar logs de erro**
3. **Ajustar configurações se necessário**
4. **Monitorar performance**

## 🚨 **Problema CSRF Resolvido**

### **Problema Identificado:**
- Erro 403 CSRF ao tentar enviar mensagens
- Middleware `validateCSRF` estava ativo mas sem sistema de tokens
- Frontend tentava obter token de meta tag inexistente

### **Soluções Implementadas:**
1. ✅ **Proteção CSRF Simplificada**: Baseada em Origin/Referer
2. ✅ **Domínios Permitidos**: localhost e fgtsagent.com.br
3. ✅ **Fallback Token**: Sistema de tokens para requisições externas
4. ✅ **Validação Reabilitada**: Middleware CSRF funcionando corretamente
5. ✅ **Logs Detalhados**: Debug completo do sistema CSRF

### **Fluxo CSRF Atualizado:**
```
Frontend (localhost:5173) → Requisição com Origin/Referer → Middleware verifica domínio → Permite requisição
Frontend (externo) → Requisição sem Origin/Referer → Middleware verifica token CSRF → Bloqueia se inválido
```

### **Teste CSRF Realizado:**
- ✅ **Origin/Referer Validation**: Requisições com Origin/Referer localhost passam
- ✅ **Middleware Validation**: Validação CSRF funcionando corretamente
- ✅ **Error Handling**: Erro 401 esperado para requisições não autenticadas
- ✅ **Security Headers**: Headers de segurança configurados corretamente
- ✅ **Domain Protection**: Proteção contra requisições de domínios não autorizados
- ✅ **Message Validation**: Validação de mensagens funcionando corretamente

## 📝 **Status**

- ✅ **Build**: Funcionando
- ✅ **Servidor**: Funcionando
- ✅ **CSRF**: Resolvido
- ✅ **Validação**: Funcionando
- ✅ **Autenticação**: Funcionando
- ⏳ **Testes com usuário autenticado**: Próximo passo 