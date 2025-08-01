# 🔒 Sistema de Rate Limiting para SMS

## 📋 Visão Geral

O sistema de rate limiting para SMS foi implementado para prevenir múltiplas requisições simultâneas e evitar bloqueios da API da Meta. Ele garante que apenas **1 requisição por vez** seja feita para cada número de telefone.

## ⚙️ Configurações

### Limites Configurados
- **Intervalo mínimo entre requisições**: 5 minutos
- **Máximo de tentativas por hora**: 3 tentativas
- **Tempo de bloqueio**: 30 minutos após exceder limite
- **Janela de contagem**: 1 hora

### Comportamento
1. **Primeira requisição**: Permitida
2. **Requisições subsequentes**: Bloqueadas por 5 minutos
3. **Após 3 tentativas em 1 hora**: Bloqueio por 30 minutos
4. **Requisição bem-sucedida**: Remove bloqueio existente

## 🏗️ Arquitetura

### Backend
- **Serviço**: `src/services/smsRateLimitService.js`
- **Controller**: Integrado em `src/controllers/whatsappCredentialController.js`
- **Rota**: `GET /api/whatsapp-credentials/sms-rate-limit/:phoneNumberId`

### Frontend
- **Verificação prévia**: Antes de solicitar SMS
- **Tratamento de erros**: Mensagens específicas para rate limiting
- **API**: `api.evolution.getSmsRateLimitStatus()`

## 🔧 Implementação

### 1. Serviço de Rate Limiting

```javascript
// src/services/smsRateLimitService.js
const smsRateLimitService = new SmsRateLimitService();

// Verificar se pode solicitar SMS
const check = smsRateLimitService.canRequestSms(phoneNumberId, clientId);

// Registrar tentativa
smsRateLimitService.recordSmsRequest(phoneNumberId, clientId, success);
```

### 2. Integração no Controller

```javascript
// src/controllers/whatsappCredentialController.js
async requestVerificationCode(req, res) {
  // Verificar rate limiting antes da requisição
  const rateLimitCheck = smsRateLimitService.canRequestSms(phoneNumberId, clientId);
  if (!rateLimitCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: rateLimitCheck.message,
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
  
  // Fazer requisição para Meta API...
  
  // Registrar tentativa (sucesso ou falha)
  smsRateLimitService.recordSmsRequest(phoneNumberId, clientId, success);
}
```

### 3. Frontend

```typescript
// Verificação prévia
const canRequest = await checkSmsRateLimit(phoneNumberId);
if (!canRequest) {
  return false;
}

// Tratamento de erro de rate limiting
if (result.code === 'RATE_LIMIT_EXCEEDED') {
  showError(result.error, 'Limite de Tentativas Excedido');
  return false;
}
```

## 📊 Endpoints

### 1. Solicitar SMS
```http
POST /api/whatsapp-credentials/request-verification-code
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "phoneNumberId": "123456789",
    "message": "Código de verificação enviado com sucesso via SMS"
  }
}
```

**Resposta de Rate Limiting:**
```json
{
  "success": false,
  "error": "Aguarde 3 minutos antes de solicitar um novo SMS.",
  "code": "RATE_LIMIT_EXCEEDED",
  "reason": "TOO_SOON",
  "retryAfter": "2025-08-01T00:10:00.000Z"
}
```

### 2. Verificar Status do Rate Limiting
```http
GET /api/whatsapp-credentials/sms-rate-limit/:phoneNumberId
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "attempts": 2,
    "lastRequest": "2025-08-01T00:05:00.000Z",
    "isBlocked": false,
    "blockedUntil": null,
    "maxAttempts": 3,
    "windowMinutes": 60
  }
}
```

## 🧪 Testes

### Script de Teste
```bash
cd src
node scripts/test_sms_rate_limiting.js
```

### Testes Manuais
1. **Primeira requisição**: Deve funcionar
2. **Segunda requisição (imediatamente)**: Deve ser bloqueada
3. **Após 5 minutos**: Deve funcionar novamente
4. **3 tentativas em 1 hora**: Deve bloquear por 30 minutos

## 🔍 Monitoramento

### Logs
- Todas as tentativas são logadas
- Bloqueios são registrados com detalhes
- Cleanup automático a cada 10 minutos

### Métricas
- Número de tentativas por número
- Tempo desde última tentativa
- Status de bloqueio
- Limpeza de cache

## 🛠️ Manutenção

### Reset de Rate Limiting
```javascript
// Para casos especiais (admin)
smsRateLimitService.resetForNumber(phoneNumberId, clientId);
```

### Cleanup Automático
- Remove dados antigos automaticamente
- Executa a cada 10 minutos
- Mantém cache limpo

## 🚨 Cenários de Uso

### 1. Usuário Tenta SMS Múltiplas Vezes
```
Usuário clica "Solicitar SMS" → Primeira requisição (sucesso)
Usuário clica novamente → Bloqueado por 5 minutos
Usuário vê mensagem: "Aguarde 5 minutos antes de solicitar um novo SMS"
```

### 2. Múltiplas Tentativas em 1 Hora
```
Tentativa 1: Sucesso
Tentativa 2: Sucesso  
Tentativa 3: Sucesso
Tentativa 4: Bloqueado por 30 minutos
Usuário vê: "Limite de tentativas excedido. Número bloqueado por 30 minutos"
```

### 3. Requisição Bem-Sucedida Remove Bloqueio
```
Número bloqueado → Usuário faz requisição bem-sucedida → Bloqueio removido
```

## 📈 Benefícios

1. **Previne bloqueios da Meta API**
2. **Melhora experiência do usuário**
3. **Reduz custos de SMS**
4. **Mantém sistema estável**
5. **Facilita debugging**

## 🔧 Configuração Avançada

### Alterar Limites
```javascript
// src/services/smsRateLimitService.js
this.config = {
  minIntervalMs: 5 * 60 * 1000,        // 5 minutos
  maxAttemptsPerHour: 3,               // 3 tentativas
  windowMs: 60 * 60 * 1000,           // 1 hora
  blockDurationMs: 30 * 60 * 1000     // 30 minutos
};
```

### Cache Persistente
Para produção, considere usar Redis em vez de cache em memória:
```javascript
// Implementação futura
const redis = require('redis');
const client = redis.createClient();
```

## ✅ Checklist de Implementação

- [x] Serviço de rate limiting criado
- [x] Integração no controller
- [x] Endpoint de status
- [x] Frontend com verificação prévia
- [x] Tratamento de erros específicos
- [x] Script de teste
- [x] Documentação completa
- [x] Logs e monitoramento
- [x] Cleanup automático

---

**Status**: ✅ **IMPLEMENTADO E FUNCIONANDO**
**Última atualização**: Agosto 2025
**Versão**: 1.0.0 