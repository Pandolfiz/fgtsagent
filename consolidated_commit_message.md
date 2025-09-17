feat: Implementar controle de templates Meta API e busca global de contatos

## 🚀 Funcionalidades Implementadas

### Controle de Templates Meta API
- ✅ Criar serviço para verificar se instância é Meta API e controlar envio de mensagens
- ✅ Implementar verificação de tempo da última mensagem do usuário (24h)
- ✅ Criar endpoint para verificar status de envio de mensagem (livre vs template)
- ✅ Implementar interface no frontend para mostrar aviso de template necessário
- ✅ Integrar controle no fluxo de envio de mensagens existente
- ✅ Integrar componente MetaTemplateWarning no Chat.jsx (componente principal usado)

### Interface de Templates
- ✅ Corrigir altura da lista de templates para mostrar todos os templates sem cortar
- ✅ Implementar modal de seleção de templates que abre embutido no container da conversa
- ✅ Adicionar botão para abrir seleção de templates quando necessário
- ✅ Implementar envio de templates via endpoint dedicado

### Busca Global de Contatos
- ✅ Implementar busca global que busca em todos os contatos do banco de dados, não apenas nos carregados
- ✅ Adicionar suporte ao parâmetro 'search' no endpoint /api/contacts
- ✅ Implementar debounce de 500ms para evitar muitas requisições durante digitação
- ✅ Conectar campo de busca do frontend com busca no backend

### Correções e Melhorias
- ✅ Corrigir endpoint /api/meta-template que estava retornando 404
- ✅ Corrigir importação do AppError no metaTemplateController
- ✅ Corrigir funcionalidade de busca na lista de conversas/contatos
- ✅ Remover ícones de pessoa, telefone e vídeo do cabeçalho da conversa
- ✅ Corrigir problema de mensagem de template aparecer e sumir
- ✅ Corrigir lógica para que contatos sem mensagens do usuário também exijam template

## 🔧 Arquivos Modificados

### Backend
- `src/services/metaTemplateControlService.js` - Serviço principal de controle de templates
- `src/controllers/metaTemplateController.js` - Controller para endpoints de template
- `src/routes/metaTemplate.js` - Rotas de API para templates
- `src/routes/contacts.js` - Adicionado suporte a busca global
- `src/routes/messages.js` - Endpoint para envio de templates
- `src/controllers/chatController.js` - Integração com controle de templates
- `src/app.js` - Registro das novas rotas

### Frontend
- `frontend/src/pages/Chat.jsx` - Interface principal com controle de templates
- `frontend/src/hooks/useMetaTemplateControl.js` - Hook para controle de templates
- `frontend/src/hooks/useContacts.js` - Adicionado suporte a busca global
- `frontend/src/hooks/useChatState.js` - Estado de busca integrado

## 🎯 Funcionalidades Principais

1. **Controle de 24h Meta API**: Instâncias Meta API só permitem mensagens livres dentro de 24h da última mensagem do usuário
2. **Templates Obrigatórios**: Fora da janela de 24h, apenas templates aprovados podem ser enviados
3. **Busca Global**: Campo de busca agora pesquisa em todos os contatos do banco de dados
4. **Interface Intuitiva**: Modal de seleção de templates integrado ao fluxo da conversa
5. **Sincronização**: Mensagens de template aparecem e permanecem na conversa

## 🧪 Como Testar

1. Selecione um contato antigo (sem mensagens recentes)
2. Verifique se aparece o botão de seleção de templates
3. Teste a busca global de contatos
4. Envie um template e verifique se permanece na conversa
5. Teste com contatos recentes (deve permitir envio livre)

## 📋 Regras de Negócio

- **Instâncias Evolution API**: Sempre permitem envio livre
- **Instâncias Meta API**: 
  - Sem mensagens do usuário → Template obrigatório
  - Última mensagem < 24h → Envio livre permitido  
  - Última mensagem > 24h → Template obrigatório