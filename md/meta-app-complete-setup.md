# 🔧 Configuração Completa do App da Meta - PASSO A PASSO

## 🚨 PROBLEMAS IDENTIFICADOS:
1. ❌ **Produto WhatsApp NÃO está adicionado ao app**
2. ❌ **Erro 191**: localhost não está nos domínios permitidos
3. ❌ **Permissões WhatsApp Business não acessíveis**

## 📋 PASSO A PASSO COMPLETO:

### **PASSO 1: Acessar o App da Meta**
- Vá para [developers.facebook.com](https://developers.facebook.com)
- Faça login com sua conta
- Clique em "Meus Apps" > "FgtsAgent"

### **PASSO 2: Adicionar Produto WhatsApp (CRÍTICO)**
- **Aba**: "Produtos" (no menu lateral esquerdo)
- **Ação**: Clique em "Adicionar Produto"
- **Buscar**: Digite "WhatsApp" na barra de pesquisa
- **Adicionar**: Clique em "Configurar" no produto WhatsApp
- **Confirmar**: Aceite os termos e condições

### **PASSO 3: Configurar Domínios do App**
- **Aba**: "Configurações" > "Básico"
- **Seção**: "Domínios do App"
- **Ação**: Clique em "Adicionar Domínio"
- **Valor**: Digite `localhost`
- **Salvar**: Clique em "Salvar Alterações"

### **PASSO 4: Configurar OAuth**
- **Aba**: "Configurações" > "Básico"
- **Seção**: "OAuth"
- **Campo**: "URI de redirecionamento OAuth válido"
- **Valor**: `http://localhost:3000/api/whatsapp-credentials/facebook/auth`
- **Salvar**: Clique em "Salvar Alterações"

### **PASSO 5: Verificar Status do Produto WhatsApp**
- **Aba**: "Produtos" > "WhatsApp"
- **Status**: Deve mostrar "Ativo" ou "Configurado"
- **Se não estiver ativo**: Clique em "Configurar" e siga os passos

### **PASSO 6: Solicitar Permissões (se necessário)**
- **Aba**: "Permissões e Recursos"
- **Buscar**: "whatsapp_business_management"
- **Ação**: Clique em "Solicitar"
- **Repetir**: Para "whatsapp_business_messaging" e "business_management"

## 🧪 TESTE APÓS CONFIGURAÇÃO:

### **1. Reiniciar o Servidor:**
```bash
npm run dev:all
```

### **2. Testar Configuração:**
```bash
node scripts/test-whatsapp-permissions.js
```

### **3. Verificar se os problemas foram resolvidos:**
- ✅ Produto WhatsApp deve aparecer como "encontrado"
- ✅ Permissões devem retornar status (granted, pending, etc.)
- ✅ Erro 191 deve desaparecer

## 🚀 SOLUÇÕES ALTERNATIVAS:

### **Opção 1: Usar ngrok (Desenvolvimento)**
```bash
# Instalar ngrok
npm install -g ngrok

# Criar túnel para porta 3000
ngrok http 3000

# Usar a URL HTTPS do ngrok como redirect URI
# Exemplo: https://abc123.ngrok.io/api/whatsapp-credentials/facebook/auth
```

### **Opção 2: Configurar Domínio Real**
- Configure `fgtsagent.com.br` nos domínios do app
- Use HTTPS: `https://fgtsagent.com.br/api/whatsapp-credentials/facebook/auth`

## 🔍 VERIFICAÇÕES IMPORTANTES:

### **✅ Checklist de Configuração:**
- [ ] Produto WhatsApp adicionado ao app
- [ ] localhost configurado nos domínios do app
- [ ] Redirect URI OAuth configurado corretamente
- [ ] App em modo correto (desenvolvimento/produção)
- [ ] Status do produto WhatsApp como "Ativo"

### **❌ Problemas Comuns:**
- **Produto não adicionado**: Mais comum do que parece!
- **Domínios não configurados**: localhost deve estar na lista
- **Redirect URI incorreto**: Deve ser exatamente igual ao configurado
- **App em modo de desenvolvimento**: Pode ter restrições adicionais

## 💡 DICAS IMPORTANTES:

1. **Ordem dos passos é CRÍTICA**: Primeiro adicione o produto, depois configure domínios
2. **Salve cada alteração**: Não esqueça de clicar em "Salvar Alterações"
3. **Aguarde propagação**: Mudanças podem levar alguns minutos para propagar
4. **Teste incrementalmente**: Execute o script de teste após cada passo
5. **Verifique logs**: Se algo der errado, verifique os logs do servidor

## 🆘 SE O PROBLEMA PERSISTIR:

1. **Execute o diagnóstico**: `node scripts/test-whatsapp-permissions.js`
2. **Verifique cada passo**: Confirme que todos os passos foram executados
3. **Use ngrok**: Para desenvolvimento, ngrok pode resolver problemas de domínio
4. **Contate suporte**: Use o suporte da Meta para desenvolvedores
5. **Crie novo app**: Considere criar um app novo para testes

## 🎯 RESULTADO ESPERADO:

Após seguir todos os passos, o script de teste deve mostrar:
- ✅ Produto WhatsApp encontrado
- ✅ Permissões com status (granted, pending, etc.)
- ✅ Configurações OAuth funcionando
- ✅ Erro 191 resolvido

## 🚨 ATENÇÃO:

**O problema principal é que o produto WhatsApp não está adicionado ao app!** 
Este é o primeiro passo que deve ser resolvido antes de qualquer outra configuração.
