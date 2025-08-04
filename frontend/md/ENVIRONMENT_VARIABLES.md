# Variáveis de Ambiente do Frontend

## Configuração

Crie um arquivo `.env` na raiz do diretório `frontend/` com as seguintes variáveis:

```env
# ==============================================
# CONFIGURAÇÕES DO FRONTEND
# ==============================================

# URL da API do Backend
VITE_API_URL=http://localhost:3000

# ==============================================
# CONFIGURAÇÕES DO FACEBOOK SDK
# ==============================================
# App ID do Facebook (obtido no Facebook Developers)
VITE_APP_META_APP_ID=seu_META_APP_ID_aqui

# Config ID para WhatsApp Business API (obtido no Facebook Developers)
VITE_APP_META_CONFIG_ID=seu_META_APP_CONFIG_ID_aqui

# ==============================================
# CONFIGURAÇÕES DO SUPABASE (se necessário)
# ==============================================
# VITE_SUPABASE_URL=https://seu-projeto.supabase.co
# VITE_SUPABASE_ANON_KEY=sua-chave-anonima-do-supabase

# ==============================================
# CONFIGURAÇÕES DO STRIPE (se necessário)
# ==============================================
# VITE_STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_publica_aqui

# ==============================================
# CONFIGURAÇÕES DE DESENVOLVIMENTO
# ==============================================
# VITE_DEBUG_MODE=true
# VITE_LOG_LEVEL=debug
```

## Como Obter as Configurações do Facebook

### 1. App ID
1. Acesse [Facebook Developers](https://developers.facebook.com/)
2. Crie um novo app ou selecione um existente
3. Vá para **Configurações > Básico**
4. Copie o **App ID**

### 2. Config ID
1. No seu app do Facebook, vá para **Produtos > WhatsApp Business API**
2. Clique em **Configurar**
3. Vá para **Configurações > Cadastro incorporado**
4. Clique em **Criar configuração**
5. Digite o nome: **"WhatsApp Business Embedded Signup"**
6. Clique em **Criar**
7. Copie o **Config ID** gerado

## Importante

- Todas as variáveis do frontend devem começar com `VITE_`
- O arquivo `.env` não deve ser commitado no Git
- Reinicie o servidor de desenvolvimento após alterar as variáveis 