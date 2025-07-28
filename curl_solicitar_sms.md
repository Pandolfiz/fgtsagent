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
    "message": "Code already requested recently",
    "type": "OAuthException",
    "code": 100,
    "error_subcode": 2388004
  }
}
```

---

### **2. Via Nossa API:**

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

---

## 📋 Parâmetros Disponíveis

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `phoneNumberId` | string | ✅ | ID do número de telefone |
| `accessToken` | string | ✅ | Token de acesso da Meta API |
| `codeMethod` | string | ❌ | Método de envio: `SMS` ou `VOICE` (padrão: `SMS`) |
| `language` | string | ❌ | Idioma do código: `pt_BR`, `en_US`, etc. (padrão: `pt_BR`) |

---

## 🔍 Códigos de Erro Comuns

| Código | Subcódigo | Descrição |
|--------|-----------|-----------|
| 100 | 2388004 | Código já foi solicitado recentemente |
| 100 | 2388005 | Número não está em estado de verificação pendente |
| 190 | - | Token de acesso inválido |
| 200 | - | Permissões insuficientes |

---

## 📝 Como Usar

1. **Substitua os valores:**
   - `{PHONE_NUMBER_ID}` → ID do número (ex: 123456789)
   - `{ACCESS_TOKEN}` → Token da Meta API (ex: EAABwzLixnjYBO...)
   - `{SEU_JWT_TOKEN}` → Token JWT do seu sistema

2. **Execute no terminal:**
   ```bash
   # Copie e cole o comando desejado
   # Substitua os valores entre {}
   ```

3. **Verifique a resposta:**
   - Status 200 = SMS enviado com sucesso
   - Status 400 = Erro de validação ou código já solicitado
   - Status 401 = Token inválido

---

## ⚠️ Limitações

- **Rate Limiting**: Não é possível solicitar código mais de uma vez em um curto período
- **Tempo de Expiração**: O código SMS expira após alguns minutos
- **Tentativas**: Número limitado de tentativas por número

---

## 🔄 Fluxo Completo

1. **Solicitar SMS** → `POST /request_code`
2. **Receber código** → Via SMS no telefone
3. **Verificar código** → `POST /verify_code`
4. **Verificar status** → `GET /{phoneNumberId}`

---

## 🧪 Teste Completo

```bash
# 1. Solicitar SMS
curl -X POST \
  "http://localhost:3000/api/whatsapp-credentials/request-verification-code" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {SEU_JWT_TOKEN}" \
  -d '{
    "phoneNumberId": "123456789",
    "accessToken": "EAABwzLixnjYBO..."
  }'

# 2. Verificar código (após receber SMS)
curl -X POST \
  "http://localhost:3000/api/whatsapp-credentials/verify-whatsapp-code" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {SEU_JWT_TOKEN}" \
  -d '{
    "phoneNumberId": "123456789",
    "verificationCode": "123456",
    "accessToken": "EAABwzLixnjYBO..."
  }'

# 3. Verificar status final
curl -X POST \
  "http://localhost:3000/api/whatsapp-credentials/check-verification-status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {SEU_JWT_TOKEN}" \
  -d '{
    "phoneNumberId": "123456789",
    "accessToken": "EAABwzLixnjYBO..."
  }'
``` 