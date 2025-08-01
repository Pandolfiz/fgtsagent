# 📱 Documentação: Registro de Números na API Oficial da Meta WhatsApp

## 🎯 **Visão Geral**

Este documento explica como registrar novos números de telefone na API oficial da Meta WhatsApp Business Platform, além de apenas verificar status.

## 📋 **Pré-requisitos**

### **1. Conta de Desenvolvedor Meta**
- ✅ Conta Meta for Developers ativa
- ✅ App de negócios criado
- ✅ Produto WhatsApp adicionado ao app

### **2. Permissões Necessárias**
- ✅ `whatsapp_business_messaging`
- ✅ `whatsapp_business_management`
- ✅ `business_management`

### **3. Tokens e IDs**
- ✅ **Access Token**: Token de acesso com permissões adequadas
- ✅ **Business Account ID**: ID da conta de negócios
- ✅ **App ID**: ID do aplicativo

## 🔧 **Funcionalidades Implementadas**

### **1. Verificar Disponibilidade de Número**
```javascript
// Verifica se um número está disponível para registro
const result = await WhatsappService.checkPhoneNumberAvailability(
  phoneNumber,    // "5511999999999"
  accessToken     // Token da Meta
);
```

**Resposta:**
```json
{
  "success": true,
  "available": true,
  "data": {
    "phone_number": "5511999999999",
    "available": true,
    "country_code": "BR"
  }
}
```

### **2. Adicionar Novo Número**
```javascript
// Adiciona um número à conta WhatsApp Business
const result = await WhatsappService.addPhoneNumber(
  phoneNumber,        // "5511999999999"
  accessToken,        // Token da Meta
  businessAccountId   // ID da conta de negócios
);
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "123456789012345",
    "phone_number": "5511999999999",
    "verified_name": "Business Name",
    "code_verification_status": "NOT_VERIFIED",
    "quality_rating": "UNKNOWN"
  },
  "phone_number_id": "123456789012345"
}
```

### **3. Listar Números da Conta**
```javascript
// Lista todos os números da conta
const result = await WhatsappService.listPhoneNumbers(
  accessToken,        // Token da Meta
  businessAccountId   // ID da conta de negócios
);
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123456789012345",
      "phone_number": "5511999999999",
      "verified_name": "Business Name",
      "code_verification_status": "VERIFIED",
      "quality_rating": "GREEN"
    }
  ],
  "total": 1
}
```

### **4. Remover Número**
```javascript
// Remove um número da conta
const result = await WhatsappService.removePhoneNumber(
  phoneNumberId,  // ID do número
  accessToken     // Token da Meta
);
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

## 🌐 **Endpoints da API**

### **Backend (Node.js)**
```javascript
// Rotas disponíveis
POST /api/whatsapp-credentials/add-phone-number
POST /api/whatsapp-credentials/check-phone-availability
POST /api/whatsapp-credentials/list-phone-numbers
POST /api/whatsapp-credentials/remove-phone-number
```

### **Frontend (React)**
```typescript
// Métodos disponíveis
api.evolution.addPhoneNumber(data)
api.evolution.checkPhoneAvailability(data)
api.evolution.listPhoneNumbers(data)
api.evolution.removePhoneNumber(data)
```

## 📝 **Processo Completo de Registro**

### **Step 1: Verificar Disponibilidade**
```javascript
const availability = await api.evolution.checkPhoneAvailability({
  phoneNumber: "5511999999999",
  accessToken: "YOUR_ACCESS_TOKEN"
});

if (availability.available) {
  // Número disponível para registro
}
```

### **Step 2: Adicionar Número**
```javascript
const result = await api.evolution.addPhoneNumber({
  phoneNumber: "5511999999999",
  businessAccountId: "YOUR_BUSINESS_ACCOUNT_ID",
  accessToken: "YOUR_ACCESS_TOKEN"
});

if (result.success) {
  const phoneNumberId = result.data.id;
  // Salvar phoneNumberId no banco de dados
}
```

### **Step 3: Verificar Status**
```javascript
const status = await api.evolution.checkStatus(credentialId);
// Status: CONNECTED, PENDING, REJECTED, etc.
```

## 🔄 **Fluxo de Integração**

### **1. Interface do Usuário**
- ✅ **Modal de Adição**: Formulário para adicionar novos números
- ✅ **Lista de Números**: Exibe todos os números da conta
- ✅ **Verificação de Disponibilidade**: Antes de adicionar
- ✅ **Gerenciamento**: Adicionar/remover números

### **2. Backend**
- ✅ **Validação**: Verifica dados obrigatórios
- ✅ **Integração Meta API**: Chama endpoints da Meta
- ✅ **Tratamento de Erros**: Logs detalhados
- ✅ **Respostas Padronizadas**: Formato consistente

### **3. Banco de Dados**
- ✅ **Armazenamento**: Salva phoneNumberId e dados
- ✅ **Atualização**: Status em tempo real
- ✅ **Relacionamento**: Vincula com credenciais do usuário

## ⚠️ **Limitações e Considerações**

### **1. Limitações da Meta**
- 📱 **Números por Conta**: Máximo de números por conta de negócios
- 🔒 **Verificação**: Números precisam ser verificados
- ⏱️ **Rate Limits**: Limites de requisições por minuto
- 🌍 **Regiões**: Algumas regiões podem ter restrições

### **2. Status de Verificação**
- ✅ **VERIFIED**: Número verificado e pronto para uso
- ⏳ **PENDING**: Aguardando verificação
- ❌ **REJECTED**: Verificação rejeitada
- 🔄 **NOT_VERIFIED**: Ainda não verificado

### **3. Qualidade do Número**
- 🟢 **GREEN**: Alta qualidade
- 🟡 **YELLOW**: Qualidade média
- 🔴 **RED**: Baixa qualidade
- ❓ **UNKNOWN**: Qualidade desconhecida

## 🚀 **Próximos Passos**

### **1. Implementações Futuras**
- 🔐 **Verificação Automática**: Processo automático de verificação
- 📊 **Dashboard**: Métricas de qualidade dos números
- 🔄 **Sincronização**: Sincronização automática com Meta
- 📱 **Bulk Operations**: Operações em lote

### **2. Melhorias**
- 🎯 **Validação Avançada**: Validação de formato de número
- 📈 **Analytics**: Relatórios de uso
- 🔔 **Notificações**: Alertas de mudança de status
- 🔗 **Webhooks**: Integração com webhooks da Meta

## 📚 **Referências**

- [Meta WhatsApp Business API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Phone Numbers API](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/phone-numbers)
- [Business Management API](https://developers.facebook.com/docs/business-management-api)

---

**Última atualização**: 26/07/2025  
**Versão**: 1.0.0  
**Autor**: Sistema de Credenciais WhatsApp 