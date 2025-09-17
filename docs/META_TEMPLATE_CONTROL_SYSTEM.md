# 📱 Sistema de Controle de Templates Meta API

## 🎯 Visão Geral

Este sistema implementa o controle automático de mensagens para instâncias da Meta API oficial do WhatsApp Business, garantindo que mensagens livres não sejam enviadas após 24 horas da última mensagem do usuário, conforme exigido pela política da Meta.

## 🏗️ Arquitetura Implementada

### **1. Backend (Node.js/Express)**

#### **Serviço Principal: `metaTemplateControlService.js`**
- **Função**: Verifica se instância é Meta API e controla envio de mensagens
- **Métodos principais**:
  - `isMetaAPIInstance(instanceId)`: Verifica se instância é da Meta API
  - `getLastUserMessage(conversationId, instanceId)`: Busca última mensagem do usuário
  - `isLastMessageOlderThan24Hours(lastMessage)`: Verifica se tem mais de 24h
  - `checkMessageSendStatus(conversationId, instanceId)`: Status completo de envio
  - `getApprovedTemplates(instanceId)`: Busca templates aprovados

#### **Controlador: `metaTemplateController.js`**
- **Endpoints**:
  - `GET /api/meta-template/check-send-status`: Verifica status de envio
  - `GET /api/meta-template/approved-templates`: Lista templates aprovados
  - `GET /api/meta-template/is-meta-api`: Verifica se é Meta API

#### **Integração no Chat Controller**
- **Bloqueio automático**: Mensagens livres são bloqueadas quando necessário
- **Resposta detalhada**: Retorna informações sobre por que foi bloqueado
- **Logs informativos**: Registra tentativas de envio bloqueadas

### **2. Frontend (React)**

#### **Hook: `useMetaTemplateControl.js`**
- **Função**: Gerencia estado e chamadas da API
- **Métodos**:
  - `checkIsMetaAPI(instanceId)`: Verifica se instância é Meta API
  - `checkSendStatus(conversationId, instanceId)`: Verifica status de envio
  - `getApprovedTemplates(instanceId)`: Busca templates disponíveis

#### **Componente: `MetaTemplateWarning.jsx`**
- **Função**: Interface visual para avisar sobre necessidade de template
- **Recursos**:
  - Aviso visual quando mensagem livre não é permitida
  - Lista de templates aprovados disponíveis
  - Informações sobre última mensagem do usuário
  - Seleção de template para envio

#### **Integração no Chat**
- **Posicionamento**: Aparece acima do input de mensagem
- **Condicional**: Só aparece quando necessário
- **Responsivo**: Adapta-se a diferentes tamanhos de tela

## 🔧 Como Funciona

### **1. Verificação Automática**
```javascript
// Quando usuário tenta enviar mensagem
const sendStatus = await metaTemplateControlService.checkMessageSendStatus(conversationId, instanceId);

if (sendStatus.requiresTemplate) {
  // Bloqueia envio e mostra aviso
  return res.status(400).json({
    success: false,
    error: 'Mensagem livre não permitida',
    details: { /* informações detalhadas */ }
  });
}
```

### **2. Identificação de Instância Meta API**
```javascript
// Verifica se instância é da Meta API
const isMetaAPI = creds.connection_type === 'ads' || 
                 (creds.wpp_access_token && creds.wpp_number_id && creds.wpp_business_account_id);
```

### **3. Cálculo de Tempo**
```javascript
// Verifica se última mensagem tem mais de 24h
const lastMessageTime = new Date(lastMessage.timestamp);
const now = new Date();
const diffInHours = (now - lastMessageTime) / (1000 * 60 * 60);
const isOlderThan24h = diffInHours > 24;
```

## 📊 Estados do Sistema

### **1. Mensagem Livre Permitida**
- ✅ Última mensagem do usuário < 24h
- ✅ Instância não é Meta API
- ✅ Nenhuma mensagem do usuário encontrada

### **2. Template Necessário**
- ❌ Última mensagem do usuário > 24h
- ❌ Instância é Meta API oficial
- ⚠️ Mostra aviso visual com templates disponíveis

### **3. Erro de Verificação**
- ❌ Erro ao verificar instância
- ❌ Erro ao buscar mensagens
- ⚠️ Assume que precisa de template por segurança

## 🎨 Interface do Usuário

### **Aviso Visual**
```
⚠️ Mensagem Livre Não Permitida
A última mensagem do usuário foi há 2 dias. Para instâncias da Meta API, 
você deve usar um template aprovado.

📅 Última mensagem do usuário: 15/09/2024 14:30
"Olá, como posso ajudar?"

[Ver Templates Disponíveis (3)]
```

### **Lista de Templates**
```
Templates Aprovados:
✅ confirmação_pedido (pt_BR • UTILITY)
✅ lembrete_consulta (pt_BR • UTILITY)  
✅ promoção_nova (pt_BR • MARKETING)
```

## 🔄 Fluxo de Uso

### **1. Usuário Digita Mensagem**
1. Sistema verifica se instância é Meta API
2. Busca última mensagem do usuário
3. Calcula tempo decorrido

### **2. Decisão de Envio**
- **< 24h**: Permite envio livre
- **> 24h**: Bloqueia e mostra aviso

### **3. Seleção de Template**
1. Usuário clica em "Ver Templates"
2. Lista templates aprovados
3. Seleciona template desejado
4. Sistema envia template (implementação futura)

## 🛠️ Configuração Necessária

### **1. Banco de Dados**
- Tabela `whatsapp_credentials` com campos Meta API
- Tabela `whatsapp_message_templates` com templates aprovados
- Tabela `messages` com timestamps corretos

### **2. Variáveis de Ambiente**
```env
WHATSAPP_ACCESS_TOKEN=seu_token_meta
WHATSAPP_API_VERSION=v18.0
WHATSAPP_API_BASE_URL=https://graph.facebook.com
```

### **3. Permissões Meta API**
- `whatsapp_business_management`
- `whatsapp_business_messaging`

## 📈 Benefícios

### **1. Conformidade com Meta API**
- ✅ Respeita política de 24 horas
- ✅ Evita bloqueios de conta
- ✅ Mantém boa reputação

### **2. Experiência do Usuário**
- ✅ Avisos claros e informativos
- ✅ Templates facilmente acessíveis
- ✅ Interface intuitiva

### **3. Desenvolvimento**
- ✅ Código modular e reutilizável
- ✅ Logs detalhados para debug
- ✅ Fácil manutenção

## 🚀 Próximos Passos

### **1. Envio de Templates**
- Implementar envio de templates selecionados
- Integrar com API da Meta para envio
- Validação de parâmetros de template

### **2. Melhorias de UX**
- Preview de templates
- Histórico de templates usados
- Favoritos de templates

### **3. Analytics**
- Métricas de uso de templates
- Relatórios de conformidade
- Alertas de proximidade de 24h

## 🔍 Monitoramento

### **Logs Importantes**
```
[META_TEMPLATE] Instância 123 é Meta API: true
[META_TEMPLATE] Diferença de tempo: 25.5 horas. Precisa de template: true
[META_TEMPLATE] Tentativa de envio de mensagem livre bloqueada - precisa de template
```

### **Métricas a Acompanhar**
- Número de mensagens bloqueadas
- Tempo médio entre mensagens
- Uso de templates por instância
- Erros de verificação

## 📞 Suporte

Para dúvidas ou problemas:
- Consulte os logs do sistema
- Verifique configuração da Meta API
- Confirme templates aprovados
- Valide timestamps das mensagens
