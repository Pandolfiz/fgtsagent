# 📱 Comandos cURL para Solicitar SMS de Verificação

## 🔧 Solicitar Código de Verificação via SMS

### **1. Via Meta API Direta:**

```bash
curl -X POST \
  "https://graph.facebook.com/v23.0/{PHONE_NUMBER_ID}/request_code" \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "code_method": "SMS",
    "language": "pt_BR"
  }'
```

**Exemplo:**
```bash
curl -X POST \
  "https://graph.facebook.com/v23.0/123456789/request_code" \
  -H "Authorization: Bearer EAABwzLixnjYBO..." \
  -H "Content-Type: application/json" \
  -d '{
    "code_method": "SMS",
    "language": "pt_BR"
  }'
```

**Resposta esperada (sucesso):**
```json
{
  "success": true
}
```

**Resposta esperada (erro - código já solicitado):**
```json
{
  "error": {
    "message": "Não foi possível enviar o código",
    "type": "OAuthException",
    "code": 100,
    "error_subcode": 2388004
  },
  "error_user_title": "Não foi possível enviar o código",
  "error_user_msg": "Tente novamente depois de um tempo."
}
```

---

### **2. Via Nossa API (Com Tratamento de Erro Melhorado):**

```bash
curl -X POST \
  "http://localhost:3000/api/whatsapp-credentials/request-verification-code" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {SEU_JWT_TOKEN}" \
  -d '{
    "phoneNumberId": "123456789",
    "accessToken": "EAABwzLixnjYBO...",
    "codeMethod": "SMS",
    "language": "pt_BR"
  }'
```

**Exemplo:**
```bash
curl -X POST \
  "http://localhost:3000/api/whatsapp-credentials/request-verification-code" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "phoneNumberId": "123456789",
    "accessToken": "EAABwzLixnjYBO...",
    "codeMethod": "SMS",
    "language": "pt_BR"
  }'
```

**Resposta esperada (sucesso):**
```json
{
  "success": true,
  "data": {
    "phoneNumberId": "123456789",
    "message": "Código de verificação enviado com sucesso via SMS",
    "code_method": "SMS",
    "language": "pt_BR"
  }
}
```

**Resposta esperada (erro - com campos da Meta API):**
```json
{
  "success": false,
  "error": "Tente novamente depois de um tempo.",
  "userTitle": "Não foi possível enviar o código",
  "code": "META_API_ERROR",
  "metaCode": 100,
  "metaSubcode": 2388004,
  "details": {
    "message": "Não foi possível enviar o código",
    "type": "OAuthException",
    "code": 100,
    "error_subcode": 2388004
  }
}
```

---

## 📋 Parâmetros Disponíveis

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `phoneNumberId` | string | ✅ | ID do número de telefone na Meta |
| `accessToken` | string | ✅ | Token de acesso da Meta |
| `codeMethod` | string | ❌ | Método de código: "SMS" ou "VOICE" (padrão: "SMS") |
| `language` | string | ❌ | Idioma do código (padrão: "pt_BR") |

---

## 🚨 Códigos de Erro da Meta API

### **Códigos Específicos:**

| Código | Subcódigo | Descrição | Tratamento |
|--------|-----------|-----------|------------|
| 100 | 2388004 | Código já solicitado | Aguardar alguns minutos |
| 100 | 2388005 | Número não pendente de verificação | Verificar status do número |
| 100 | 2388006 | Código de verificação inválido | Verificar código digitado |

### **Campos de Erro Capturados:**

- `error_user_title`: Título do erro para o usuário
- `error_user_msg`: Mensagem de erro para o usuário
- `metaCode`: Código de erro da Meta
- `metaSubcode`: Subcódigo de erro da Meta
- `details`: Detalhes completos do erro

---

## 🧪 Testando Tratamento de Erros

### **1. Testar com Script Local:**
```bash
cd src
node scripts/test_sms_error_handling.js
```

### **2. Testar com cURL (Simulando Erro):**
```bash
# Testar erro de código já solicitado
curl -X POST \
  "http://localhost:3000/api/whatsapp-credentials/request-verification-code" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {SEU_JWT_TOKEN}" \
  -d '{
    "phoneNumberId": "INVALID_ID",
    "accessToken": "INVALID_TOKEN",
    "codeMethod": "SMS",
    "language": "pt_BR"
  }'
```

### **3. Verificar Logs do Servidor:**
```bash
# Verificar logs detalhados
tail -f logs/combined.log | grep "WHATSAPP"
```

---

## 🔍 Debugging de Erros

### **1. Verificar Resposta Completa:**
```bash
curl -v -X POST \
  "http://localhost:3000/api/whatsapp-credentials/request-verification-code" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {SEU_JWT_TOKEN}" \
  -d '{
    "phoneNumberId": "123456789",
    "accessToken": "EAABwzLixnjYBO...",
    "codeMethod": "SMS",
    "language": "pt_BR"
  }'
```

### **2. Verificar Status da Credencial:**
```bash
curl -X GET \
  "http://localhost:3000/api/whatsapp-credentials/{CREDENTIAL_ID}" \
  -H "Authorization: Bearer {SEU_JWT_TOKEN}"
```

### **3. Verificar Logs de Erro:**
```bash
# Logs específicos de erro de SMS
grep "SMS_REQUEST_ERROR" logs/combined.log

# Logs de erro da Meta API
grep "META_API_ERROR" logs/combined.log
```

---

## 📊 Monitoramento de Erros

### **1. Verificar Erros no Banco:**
```sql
-- Verificar credenciais com erro de SMS
SELECT 
  id,
  wpp_number_id,
  status,
  status_description,
  metadata->>'sms_request_error' as error_message,
  metadata->>'sms_request_error_title' as error_title,
  metadata->>'sms_request_meta_code' as meta_code,
  metadata->>'sms_request_meta_subcode' as meta_subcode,
  updated_at
FROM whatsapp_credentials 
WHERE status = 'meta_api_error'
ORDER BY updated_at DESC;
```

### **2. Estatísticas de Erro:**
```sql
-- Contar erros por tipo
SELECT 
  metadata->>'sms_request_error_code' as error_code,
  COUNT(*) as count
FROM whatsapp_credentials 
WHERE status = 'meta_api_error'
GROUP BY metadata->>'sms_request_error_code';
```

---

## ✅ Melhorias Implementadas

1. **✅ Captura de campos específicos da Meta API**
2. **✅ Tratamento detalhado de erros**
3. **✅ Logs melhorados para debugging**
4. **✅ Resposta estruturada com códigos de erro**
5. **✅ Interface de usuário com mensagens claras**
6. **✅ Armazenamento de detalhes de erro no banco**

---

**⚠️ Importante**: Agora o sistema captura e exibe corretamente os campos `error_user_title` e `error_user_msg` da Meta API, fornecendo mensagens de erro mais claras e úteis para o usuário! 