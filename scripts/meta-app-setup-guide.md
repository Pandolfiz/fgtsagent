# 🔧 Guia de Configuração do App da Meta

## 🚨 Problema Identificado
**Erro 191**: "Não é possível carregar a URL: O domínio dessa URL não está incluído nos domínios do app."

## 🔍 Causa Raiz
O app da Meta não tem `localhost` configurado nos domínios permitidos.

## 📋 Passos para Resolver

### 1. Acessar o App da Meta
- Vá para [developers.facebook.com](https://developers.facebook.com)
- Faça login com sua conta
- Clique em "Meus Apps" > "FgtsAgent"

### 2. Configurar Domínios do App
- **Aba**: Configurações > Básico
- **Seção**: Domínios do App
- **Ação**: Adicionar `localhost` na lista de domínios

### 3. Configurar OAuth
- **Aba**: Configurações > Básico
- **Seção**: OAuth
- **Campo**: URI de redirecionamento OAuth válido
- **Valor**: `http://localhost:3000/api/whatsapp-credentials/facebook/auth`

### 4. Verificar Produtos
- **Aba**: Produtos
- **Ação**: Adicionar "WhatsApp" se não estiver presente
- **Status**: Confirmar que está ativo

### 5. Verificar Permissões
- **Aba**: Permissões e Recursos
- **Permissões necessárias**:
  - `whatsapp_business_management`
  - `whatsapp_business_messaging`
  - `business_management`
  - `pages_manage_metadata`
  - `pages_read_engagement`

### 6. Verificar Status do App
- **Modo**: Desenvolvimento ou Produção
- **Status de Revisão**: Aprovado ou Pendente

## 🧪 Teste Após Configuração

### 1. Reiniciar o Servidor
```bash
npm run dev:all
```

### 2. Testar Configuração
```bash
node scripts/deep-meta-investigation.js
```

### 3. Testar Autenticação
- Acesse a rota de autenticação da Meta
- Verifique se o erro 191 foi resolvido

## 🚀 Soluções Alternativas

### Opção 1: Usar ngrok (Desenvolvimento)
```bash
# Instalar ngrok
npm install -g ngrok

# Criar túnel para porta 3000
ngrok http 3000

# Usar a URL HTTPS do ngrok como redirect URI
```

### Opção 2: Configurar Domínio Real (Produção)
- Configure `fgtsagent.com.br` nos domínios do app
- Use HTTPS: `https://fgtsagent.com.br/api/whatsapp-credentials/facebook/auth`
- Configure SSL no servidor

### Opção 3: Criar Novo App (Se necessário)
- Crie um novo app da Meta
- Configure desde o início com as permissões corretas
- Use para testes e desenvolvimento

## 🔍 Verificações Importantes

### ✅ Checklist de Configuração
- [ ] App ID configurado no .env
- [ ] App Secret configurado no .env
- [ ] Redirect URI configurado no .env
- [ ] localhost adicionado aos domínios do app
- [ ] Redirect URI configurado no app da Meta
- [ ] Produto WhatsApp adicionado
- [ ] Permissões necessárias concedidas
- [ ] App em modo correto (desenvolvimento/produção)

### ❌ Problemas Comuns
- App em modo de desenvolvimento sem usuários de teste
- Permissões não concedidas ou pendentes
- Domínios não configurados corretamente
- Redirect URI incorreto
- App bloqueado ou em revisão

## 💡 Dicas Importantes

1. **Desenvolvimento**: Use `localhost` nos domínios do app
2. **Produção**: Use domínio real com HTTPS
3. **Permissões**: Solicite apenas as permissões necessárias
4. **Revisão**: Apps em produção precisam passar por revisão da Meta
5. **Testes**: Sempre teste com usuários de teste em modo de desenvolvimento

## 🆘 Se o Problema Persistir

1. **Verificar logs**: Execute `node scripts/deep-meta-investigation.js`
2. **Revisar configuração**: Confirme todos os passos acima
3. **Contatar suporte**: Use o suporte da Meta para desenvolvedores
4. **Criar novo app**: Considere criar um app novo para testes
5. **Usar ngrok**: Para desenvolvimento, ngrok pode resolver problemas de domínio
