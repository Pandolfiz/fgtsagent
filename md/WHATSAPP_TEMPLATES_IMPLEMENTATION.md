# 📱 Implementação de Templates de Mensagens do WhatsApp Business

## 🎯 **Visão Geral**

Esta implementação permite exibir e gerenciar templates de mensagens da API oficial da Meta para contas WhatsApp Business. Os templates são sincronizados automaticamente da API da Meta e armazenados localmente no Supabase para melhor performance.

---

## 🏗️ **Arquitetura Implementada**

### **1. Banco de Dados (Supabase)**
- **Tabela**: `whatsapp_message_templates`
- **Campos principais**:
  - `wpp_business_account_id`: ID da conta de negócios
  - `template_id`: ID único do template na Meta
  - `template_name`: Nome do template
  - `template_status`: Status (APPROVED, PENDING, REJECTED, etc.)
  - `template_category`: Categoria (MARKETING, UTILITY, AUTHENTICATION)
  - `template_language`: Idioma (pt_BR, en_US, etc.)
  - `template_components`: Componentes em JSON
  - `template_quality_rating`: Classificação de qualidade

### **2. Backend (Node.js/Express)**
- **Serviço**: `WhatsappTemplateService`
- **Controlador**: `WhatsappTemplateController`
- **Rotas**: `/api/whatsapp-templates/*`
- **Funcionalidades**:
  - Listar templates com filtros
  - Sincronizar com API da Meta
  - Buscar estatísticas
  - Buscar template específico

### **3. Frontend (React)**
- **Componente**: `WhatsappTemplatesSection`
- **Integração**: Página de credenciais WhatsApp
- **Funcionalidades**:
  - Exibição de templates com filtros
  - Sincronização em tempo real
  - Estatísticas visuais
  - Interface responsiva

---

## 🔧 **Configuração Necessária**

### **1. Variáveis de Ambiente**
```env
# Backend (.env em src/)
WHATSAPP_ACCESS_TOKEN=seu_token_da_meta
WHATSAPP_API_VERSION=v23.0
WHATSAPP_API_BASE_URL=https://graph.facebook.com

# Frontend (.env em frontend/)
VITE_APP_META_APP_ID=seu_app_id
VITE_APP_META_CONFIG_ID=seu_config_id
```

### **2. Permissões da Meta**
- `whatsapp_business_management`
- `whatsapp_business_messaging`
- `business_management`

---

## 🚀 **Como Funciona**

### **1. Fluxo de Sincronização**
1. **Usuário clica em "Sincronizar"**
2. **Backend busca templates da API da Meta**
3. **Templates são salvos/atualizados no Supabase**
4. **Frontend recarrega lista atualizada**

### **2. Filtros Disponíveis**
- **Status**: APPROVED, PENDING, REJECTED, DISABLED, IN_APPEAL
- **Categoria**: MARKETING, UTILITY, AUTHENTICATION
- **Idioma**: pt_BR, en_US, es_ES, etc.

### **3. Estatísticas Automáticas**
- Total de templates
- Contagem por status
- Contagem por categoria
- Contagem por idioma

---

## 📋 **Endpoints da API**

### **GET /api/whatsapp-templates**
Lista todos os templates com filtros opcionais.

**Query Parameters**:
- `businessAccountId` (opcional): ID da conta de negócios
- `status` (opcional): Filtrar por status
- `language` (opcional): Filtrar por idioma
- `category` (opcional): Filtrar por categoria

**Resposta**:
```json
{
  "success": true,
  "data": [...],
  "total": 15,
  "filters": {...}
}
```

### **POST /api/whatsapp-templates/sync**
Sincroniza templates da API da Meta.

**Body**:
```json
{
  "businessAccountId": "123456789",
  "accessToken": "EAABwzLixnjYBO..."
}
```

**Resposta**:
```json
{
  "success": true,
  "message": "Sincronização concluída",
  "data": {
    "apiTemplates": 15,
    "savedTemplates": 15
  }
}
```

### **GET /api/whatsapp-templates/stats**
Busca estatísticas dos templates.

**Query Parameters**:
- `businessAccountId` (opcional): ID da conta de negócios

**Resposta**:
```json
{
  "success": true,
  "data": {
    "total": 15,
    "byStatus": {
      "APPROVED": 10,
      "PENDING": 3,
      "REJECTED": 2
    },
    "byCategory": {
      "MARKETING": 8,
      "UTILITY": 5,
      "AUTHENTICATION": 2
    },
    "byLanguage": {
      "pt_BR": 12,
      "en_US": 3
    }
  }
}
```

---

## 🎨 **Interface do Usuário**

### **1. Seção de Templates**
- **Header**: Título e botões de ação
- **Filtros**: Status, categoria e idioma
- **Estatísticas**: Cards visuais com contadores
- **Lista**: Templates com informações detalhadas

### **2. Estados Visuais**
- **Loading**: Spinner durante carregamento
- **Error**: Mensagem de erro com botão de retry
- **Empty**: Estado vazio com botão de sincronização
- **Success**: Lista de templates com filtros aplicados

### **3. Responsividade**
- **Mobile**: Layout em coluna única
- **Tablet**: Grid 2x2 para estatísticas
- **Desktop**: Layout completo com sidebar de filtros

---

## 🔒 **Segurança e Validação**

### **1. Autenticação**
- Todas as rotas requerem autenticação JWT
- Usuário só acessa templates de suas próprias contas

### **2. Validação de Entrada**
- Sanitização de parâmetros de query
- Validação de businessAccountId
- Rate limiting para sincronização

### **3. RLS (Row Level Security)**
- Política: usuários só veem templates de suas contas
- Isolamento por `wpp_business_account_id`

---

## 📊 **Monitoramento e Logs**

### **1. Logs Estruturados**
```javascript
logger.info(`[TEMPLATES] Buscando templates para conta: ${businessAccountId}`);
logger.error(`[TEMPLATES] ❌ Erro ao buscar templates: ${error.message}`);
```

### **2. Métricas Disponíveis**
- Tempo de resposta da API da Meta
- Taxa de sucesso de sincronização
- Contagem de templates por status
- Erros de autenticação e permissões

---

## 🚨 **Tratamento de Erros**

### **1. Erros da API da Meta**
- **400**: Parâmetros inválidos
- **401**: Token expirado/inválido
- **403**: Sem permissões
- **404**: Conta não encontrada
- **429**: Rate limit excedido

### **2. Erros de Banco de Dados**
- Falha na conexão Supabase
- Erro de permissões RLS
- Timeout de consulta

### **3. Erros de Frontend**
- Falha na requisição HTTP
- Erro de parsing JSON
- Timeout de sincronização

---

## 🔄 **Sincronização Automática**

### **1. Quando Sincronizar**
- Usuário clica em "Sincronizar"
- Após criação de nova credencial
- Verificação de status de credencial

### **2. Estratégia de Cache**
- Templates são salvos localmente
- Sincronização sob demanda
- Atualização incremental (upsert)

---

## 📱 **Integração com WhatsApp**

### **1. Uso de Templates**
- Templates aprovados podem ser usados para envio
- Validação de status antes do uso
- Suporte a variáveis dinâmicas

### **2. Limitações**
- Apenas templates aprovados podem ser enviados
- Rate limiting da Meta API
- Validação de formato de mensagem

---

## 🧪 **Testes**

### **1. Testes Unitários**
- Serviço de templates
- Controlador de templates
- Validação de dados

### **2. Testes de Integração**
- API endpoints
- Integração com Supabase
- Sincronização com Meta API

### **3. Testes E2E**
- Fluxo completo de sincronização
- Filtros e busca
- Interface responsiva

---

## 🚀 **Próximos Passos**

### **1. Funcionalidades Futuras**
- Criação de templates personalizados
- Editor visual de templates
- Histórico de uso de templates
- Relatórios de performance

### **2. Melhorias Técnicas**
- Cache Redis para templates
- Sincronização em background
- Webhooks para atualizações
- API GraphQL para consultas complexas

---

## 📚 **Recursos Adicionais**

### **1. Documentação da Meta**
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Business Management API](https://developers.facebook.com/docs/business-management-api)

### **2. Ferramentas de Desenvolvimento**
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [WhatsApp Business Manager](https://business.facebook.com/wa/manage/accounts)
- [Meta for Developers](https://developers.facebook.com/)

---

## ✅ **Checklist de Implementação**

- [x] Tabela no Supabase criada
- [x] Serviço backend implementado
- [x] Controlador backend implementado
- [x] Rotas da API configuradas
- [x] Componente React criado
- [x] Integração na página de credenciais
- [x] Filtros e estatísticas implementados
- [x] Tratamento de erros configurado
- [x] Logs e monitoramento ativos
- [x] Documentação criada

---

## 🆘 **Suporte e Troubleshooting**

### **Problemas Comuns**

1. **Templates não aparecem**
   - Verificar se credencial é do tipo 'ads'
   - Confirmar se wpp_business_account_id está configurado
   - Verificar permissões da Meta API

2. **Erro de sincronização**
   - Verificar validade do access token
   - Confirmar permissões da conta Meta
   - Verificar rate limits da API

3. **Filtros não funcionam**
   - Verificar parâmetros de query
   - Confirmar valores válidos para filtros
   - Verificar logs do backend

### **Contatos de Suporte**
- **Backend**: Verificar logs em `src/logs/`
- **Frontend**: Console do navegador
- **Banco**: Supabase dashboard
- **Meta**: Facebook Developer Console

