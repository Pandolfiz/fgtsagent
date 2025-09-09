# 🔐 Documentação Técnica - Sistema de Autenticação

## 📋 Visão Geral

Este documento descreve a arquitetura e implementação do sistema de autenticação unificado do projeto SaaS. O sistema foi refatorado para eliminar inconsistências e melhorar a segurança, utilizando cookies httpOnly e middleware unificado.

## 🏗️ Arquitetura

### Componentes Principais

1. **Backend (Node.js/Express)**
   - `unifiedAuthMiddleware.js` - Middleware unificado de autenticação
   - `migrationHelper.js` - Helper para migração gradual
   - `unifiedLogout.js` - Utilitário de logout unificado

2. **Frontend (React)**
   - `AuthContext.jsx` - Context de autenticação unificado
   - `unifiedCookieManager.js` - Gerenciador de cookies padronizado
   - `unifiedLogout.js` - Utilitário de logout unificado

3. **Configurações**
   - CORS otimizado para produção
   - Rate limiting baseado em ambiente
   - Headers de segurança

## 🔧 Implementação

### 1. Middleware Unificado de Autenticação

**Arquivo:** `src/middleware/unifiedAuthMiddleware.js`

```javascript
// Funcionalidades principais
- Suporte a JWT tokens (Supabase)
- Suporte a API Keys
- Refresh automático de tokens
- Múltiplas fontes de token (header, cookie, query)
- Rate limiting integrado
- Logs centralizados
- Tratamento de erros unificado
```

**Configurações:**
- **Fontes de token:** header, cookie, query, body
- **Cookies padronizados:** `authToken`, `refreshToken`
- **Rate limiting:** 1000 req/15min (produção), 5000 req/15min (desenvolvimento)
- **Timeout de validação:** 5 segundos

### 2. Gerenciador de Cookies Unificado

**Arquivo:** `frontend/src/utils/unifiedCookieManager.js`

```javascript
// Funcionalidades principais
- Padronização de nomes de cookies
- Configurações de segurança consistentes
- Cookies httpOnly para segurança
- Limpeza automática de cookies antigos
- Suporte a diferentes ambientes
```

**Configurações:**
- **authToken:** 24 horas, httpOnly
- **refreshToken:** 30 dias, httpOnly
- **Domínio:** `.fgtsagent.com.br` (produção), `localhost` (desenvolvimento)
- **SameSite:** `lax`
- **Secure:** `true` em produção

### 3. Context de Autenticação Unificado

**Arquivo:** `frontend/src/contexts/AuthContext.jsx`

```javascript
// Funcionalidades principais
- Estado centralizado de autenticação
- Sincronização automática com Supabase
- Refresh automático de tokens
- Logout consistente
- Hooks customizados para componentes
```

**Hooks disponíveis:**
- `useAuth()` - Hook principal de autenticação
- `useRequireAuth()` - Hook para verificar autenticação
- `useUser()` - Hook para obter dados do usuário

### 4. Utilitário de Logout Unificado

**Arquivo:** `frontend/src/utils/unifiedLogout.js`

```javascript
// Funcionalidades principais
- Logout via Supabase
- Limpeza de localStorage/sessionStorage
- Logout via API do backend
- Limpeza de cookies (via backend)
- Redirecionamento consistente
- Tratamento de erros unificado
```

## 🔒 Segurança

### 1. Cookies HttpOnly

- **Vantagem:** Tokens não são acessíveis via JavaScript
- **Proteção:** Contra ataques XSS
- **Implementação:** Configuração `httpOnly: true`

### 2. Rate Limiting

**Configurações por ambiente:**

| Ambiente | Rate Limit | Speed Limit | Delay |
|----------|------------|-------------|-------|
| Produção | 1000 req/15min | 50 req → 500ms | 10s max |
| Desenvolvimento | 5000 req/15min | 200 req → 100ms | 3s max |

**Rotas específicas:**
- **Autenticação:** 20 req/15min (produção), 100 req/15min (desenvolvimento)
- **APIs:** 500 req/15min (produção), 3000 req/15min (desenvolvimento)

### 3. CORS Otimizado

**Produção:**
- Apenas domínios HTTPS permitidos
- `fgtsagent.com.br`, `www.fgtsagent.com.br`
- Domínios do Stripe para pagamentos

**Desenvolvimento:**
- Domínios locais permitidos
- Padrões de rede local
- Suporte a ngrok

### 4. Headers de Segurança

```javascript
// Headers implementados
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000
- Content-Security-Policy: Configurado com nonces
```

## 🧪 Testes

### Testes de Integração

**Arquivo:** `src/tests/authIntegration.test.js`

**Cobertura:**
- ✅ Login com credenciais válidas
- ✅ Login com credenciais inválidas
- ✅ Refresh de tokens
- ✅ Logout
- ✅ Middleware de autenticação
- ✅ Rate limiting
- ✅ CORS
- ✅ Headers de segurança
- ✅ Sanitização de entrada

**Execução:**
```bash
# Executar todos os testes
npm run test:integration

# Executar apenas testes de autenticação
npm run test:auth

# Executar com cobertura
npm run test:coverage
```

## 📊 Monitoramento

### Logs Estruturados

```javascript
// Exemplo de log de autenticação
{
  "timestamp": "2024-01-XX",
  "level": "info",
  "message": "Autenticação bem-sucedida",
  "userId": "uuid",
  "source": "unifiedAuthMiddleware",
  "duration": 150
}
```

### Headers de Debug

- `X-Auth-Middleware`: Indica qual middleware foi usado
- `X-Rate-Limit-Remaining`: Requisições restantes
- `X-Rate-Limit-Limit`: Limite total de requisições

## 🚀 Migração

### MigrationHelper

**Arquivo:** `src/middleware/migrationHelper.js`

**Funcionalidades:**
- Migração gradual entre middlewares
- Feature flags para controle
- Fallback automático
- Estatísticas de migração

**Configuração:**
```javascript
// Variáveis de ambiente
USE_UNIFIED_AUTH=true
USE_LEGACY_AUTH=false
FALLBACK_TO_LEGACY=true
```

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# Autenticação
USE_SUPABASE_AUTH=true
USE_UNIFIED_AUTH=true
USE_LEGACY_AUTH=false

# CORS
FRONTEND_URL=https://fgtsagent.com.br
APP_URL=https://fgtsagent.com.br

# Rate Limiting
NODE_ENV=production

# Cookies
COOKIE_DOMAIN=.fgtsagent.com.br
COOKIE_SECURE=true
```

### Configuração do Supabase

```javascript
// Configurações de cookies
cookieOptions: {
  name: 'authToken',
  lifetime: 60 * 60 * 24, // 24 horas
  domain: process.env.NODE_ENV === 'production' ? '.fgtsagent.com.br' : 'localhost',
  path: '/',
  sameSite: 'lax'
}
```

## 📈 Performance

### Otimizações Implementadas

1. **Cache de validação de tokens**
2. **Rate limiting inteligente**
3. **Speed limiting gradual**
4. **Logs estruturados**
5. **Headers de cache**

### Métricas de Performance

- **Tempo de validação:** < 100ms
- **Tempo de refresh:** < 200ms
- **Tempo de logout:** < 300ms
- **Throughput:** 1000 req/min (produção)

## 🐛 Troubleshooting

### Problemas Comuns

1. **Token não encontrado**
   - Verificar se cookies estão sendo enviados
   - Verificar configuração de CORS
   - Verificar se middleware está aplicado

2. **Rate limiting excessivo**
   - Verificar configurações por ambiente
   - Verificar se não há loops de requisições
   - Verificar logs de rate limiting

3. **CORS errors**
   - Verificar lista de origens permitidas
   - Verificar configuração de ambiente
   - Verificar headers de requisição

### Debug

```javascript
// Habilitar logs de debug
window.debugCookies() // Frontend
window.unifiedLogout.getDebugInfo() // Logout
```

## 📚 Referências

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Express Rate Limiting](https://express-rate-limit.mintlify.app/)
- [CORS Configuration](https://expressjs.com/en/resources/middleware/cors.html)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

## 🔄 Changelog

### v1.0.0 (2024-01-XX)
- ✅ Middleware unificado de autenticação
- ✅ Gerenciador de cookies padronizado
- ✅ Context de autenticação unificado
- ✅ Utilitário de logout unificado
- ✅ CORS otimizado para produção
- ✅ Rate limiting baseado em ambiente
- ✅ Testes de integração
- ✅ Documentação técnica

---

**Última atualização:** 2024-01-XX  
**Versão:** 1.0.0  
**Autor:** Equipe de Desenvolvimento

