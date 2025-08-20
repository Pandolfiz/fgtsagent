# Integração Meta - Temporariamente Desabilitada

## 📋 Status Atual

A integração com a Meta (Facebook/WhatsApp Business API) está **temporariamente desabilitada** no frontend enquanto não temos as permissões necessárias aprovadas.

## 🔒 O que foi alterado

- ✅ **Botão "Conectar Meta"** - Visível mas desabilitado com aviso
- ✅ **Opção "API Oficial para Anúncios"** - Visível mas desabilitada com aviso
- ✅ **Toda funcionalidade preservada** - Código intacto
- ✅ **UI transparente** - Usuários veem o que está sendo desenvolvido

## 🎯 Por que foi desabilitada

1. **App em modo desenvolvimento** - Limitações da Meta
2. **Permissões não aprovadas** - WhatsApp Business requer revisão
3. **Produto não configurado** - WhatsApp não aparece na lista de produtos
4. **Transparência com usuários** - Mostrar funcionalidades em desenvolvimento

## 🚀 Como reativar

### 1. Configurar Meta App (Produção)
- Acessar: https://developers.facebook.com/apps/980766987152980/
- Submeter app para revisão da Meta
- Aguardar aprovação (pode levar dias/semanas)

### 2. Configurar Produto WhatsApp
- **"Produtos"** → **"WhatsApp"** → **"Configurar"**
- Completar TODAS as etapas de configuração
- NÃO apenas "Adicionar", mas "Configurar" completamente

### 3. Solicitar Permissões
- **"Permissões e Recursos"**
- Solicitar:
  - `whatsapp_business_management`
  - `whatsapp_business_messaging`
  - `business_management`

### 4. Configurar Domínios
- **"Configurações"** → **"Básico"**
- **"App Domains"**:
  - `localhost`
  - `fgtsagent.com.br`
  - `www.fgtsagent.com.br`

### 5. Configurar OAuth
- **"Produtos"** → **"Facebook Login"** → **"Configurações"**
- **"Valid OAuth Redirect URIs"**:
  - `http://localhost:3000/api/whatsapp-credentials/facebook/auth`

### 6. Reativar no Frontend
```typescript
// Em: frontend/src/components/whatsapp-credentials/WhatsappCredentialsPage.tsx
const META_INTEGRATION_ENABLED = true; // Alterar para true
```

## 🧪 Teste após reativação

```bash
# Testar se a Meta está funcionando
node scripts/test-whatsapp-product-status.js

# Testar se o frontend está funcional
npm run dev
```

## 📁 Arquivos afetados

- `frontend/src/components/whatsapp-credentials/WhatsappCredentialsPage.tsx`
  - Linha ~1676: Botão "Conectar Meta" (desabilitado com aviso)
  - Linha ~1995: Opção "API Oficial para Anúncios" (desabilitada com aviso)

## ⚠️ Importante

- **Toda funcionalidade está preservada**
- **Código não foi removido, apenas desabilitado temporariamente**
- **Backend continua funcionando normalmente**
- **UI permanece visível com avisos sobre desenvolvimento**
- **Transparência com usuários sobre funcionalidades futuras**

## 🔄 Reversão rápida

Para reativar rapidamente (apenas para testes):

```typescript
const META_INTEGRATION_ENABLED = true; // true = ativo
```

## 💡 Vantagens da Nova Estratégia

1. **Transparência** - Usuários veem o que está sendo desenvolvido
2. **Expectativa** - Cria expectativa sobre funcionalidades futuras
3. **Profissionalismo** - Mostra que a empresa está ativamente desenvolvendo
4. **Feedback** - Usuários podem comentar sobre funcionalidades desejadas
5. **Marketing** - Demonstra roadmap de desenvolvimento

## 📞 Suporte

Se precisar de ajuda para configurar a Meta:
1. Verificar documentação: `scripts/meta-app-full-config-guide.md`
2. Executar diagnósticos: `scripts/check-meta-app-status.js`
3. Verificar logs do servidor para erros específicos
