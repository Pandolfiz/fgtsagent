# 📱 API de Templates do WhatsApp Business

## Visão Geral

Esta API permite criar, gerenciar e sincronizar templates de mensagens para contas WhatsApp Business através da API oficial da Meta.

## 🔑 Autenticação

Todas as rotas requerem autenticação via JWT do Supabase:

```http
Authorization: Bearer <supabase_jwt_token>
```

## 📋 Endpoints

### 1. Listar Templates

**GET** `/api/whatsapp-templates`

Lista todos os templates de uma conta WhatsApp Business.

**Query Parameters:**
- `businessAccountId` (opcional): ID da conta WhatsApp Business
- `status` (opcional): Filtrar por status (APPROVED, PENDING, REJECTED)
- `language` (opcional): Filtrar por idioma (pt_BR, en_US, es_ES)
- `category` (opcional): Filtrar por categoria (UTILITY, MARKETING, AUTHENTICATION)

**Exemplo de Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "template_id": "572279198452421",
      "template_name": "confirmação_pedido",
      "template_language": "pt_BR",
      "template_category": "UTILITY",
      "template_status": "APPROVED",
      "template_components": [...],
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

### 2. Criar Template

**POST** `/api/whatsapp-templates/create`

Cria um novo template de mensagem na Meta API.

**Body:**
```json
{
  "businessAccountId": "102290129340398",
  "templateData": {
    "name": "confirmação_pedido",
    "category": "UTILITY",
    "language": "pt_BR",
    "parameter_format": "POSITIONAL",
    "components": [
      {
        "type": "HEADER",
        "format": "TEXT",
        "text": "Pedido Confirmado!",
        "example": {
          "header_text": ["Pedido Confirmado!"]
        }
      },
      {
        "type": "BODY",
        "text": "Olá {{1}}, seu pedido #{{2}} foi confirmado e será enviado para {{3}}.",
        "example": {
          "body_text": [
            ["João Silva", "12345", "Rua das Flores, 123"]
          ]
        }
      },
      {
        "type": "FOOTER",
        "text": "Obrigado por escolher nossa loja!"
      },
      {
        "type": "BUTTONS",
        "buttons": [
          {
            "type": "QUICK_REPLY",
            "text": "Ver Pedido"
          },
          {
            "type": "QUICK_REPLY",
            "text": "Falar com Suporte"
          }
        ]
      }
    ]
  }
}
```

**Exemplo de Resposta:**
```json
{
  "success": true,
  "message": "Template criado com sucesso",
  "data": {
    "metaResponse": {
      "id": "572279198452421",
      "status": "PENDING",
      "category": "UTILITY"
    },
    "savedToDatabase": true,
    "templateId": "572279198452421",
    "status": "PENDING",
    "category": "UTILITY"
  }
}
```

### 3. Sincronizar Templates

**POST** `/api/whatsapp-templates/sync`

Sincroniza templates da API da Meta com o banco de dados.

**Body:**
```json
{
  "businessAccountId": "102290129340398"
}
```

### 4. Buscar Estatísticas

**GET** `/api/whatsapp-templates/stats?businessAccountId=102290129340398`

Retorna estatísticas dos templates de uma conta.

**Exemplo de Resposta:**
```json
{
  "success": true,
  "data": {
    "total": 4,
    "byStatus": {
      "APPROVED": 3,
      "PENDING": 1,
      "REJECTED": 0
    },
    "byCategory": {
      "UTILITY": 2,
      "MARKETING": 2
    },
    "byLanguage": {
      "pt_BR": 3,
      "en_US": 1
    }
  }
}
```

### 5. Listar Contas Disponíveis

**GET** `/api/whatsapp-templates/accounts`

Lista todas as contas WhatsApp Business disponíveis para o usuário.

## 🏗️ Estrutura dos Componentes

### Componente HEADER
```json
{
  "type": "HEADER",
  "format": "TEXT|IMAGE|VIDEO|DOCUMENT",
  "text": "Texto do header (para formato TEXT)",
  "example": {
    "header_text": ["Exemplo de texto"]
  }
}
```

### Componente BODY
```json
{
  "type": "BODY",
  "text": "Texto da mensagem com {{1}}, {{2}} para parâmetros",
  "example": {
    "body_text": [
      ["Valor 1", "Valor 2"]
    ]
  }
}
```

### Componente FOOTER
```json
{
  "type": "FOOTER",
  "text": "Texto do footer"
}
```

### Componente BUTTONS
```json
{
  "type": "BUTTONS",
  "buttons": [
    {
      "type": "QUICK_REPLY|URL|PHONE_NUMBER|OTP|MPM|CATALOG|FLOW|VOICE_CALL|APP",
      "text": "Texto do botão",
      "url": "https://exemplo.com (para tipo URL)",
      "phone_number": "+5511999999999 (para tipo PHONE_NUMBER)"
    }
  ]
}
```

## 📝 Categorias de Template

- **UTILITY**: Mensagens utilitárias (confirmações, atualizações, etc.)
- **MARKETING**: Mensagens promocionais e de marketing
- **AUTHENTICATION**: Mensagens de autenticação e códigos OTP

## 🌍 Idiomas Suportados

- `pt_BR`: Português (Brasil)
- `en_US`: Inglês (Estados Unidos)
- `es_ES`: Espanhol (Espanha)

## ⚠️ Limitações e Regras

1. **Nome do Template**: Máximo 512 caracteres
2. **Componente BODY**: Obrigatório em todos os templates
3. **Parâmetros**: Use {{1}}, {{2}}, {{3}} para parâmetros posicionais
4. **Botões**: Máximo 3 botões por template
5. **Limite**: 250 templates por conta (não verificada) ou 6.000 (verificada)

## 🔄 Status dos Templates

- **PENDING**: Aguardando aprovação da Meta
- **APPROVED**: Aprovado e disponível para uso
- **REJECTED**: Rejeitado pela Meta
- **DISABLED**: Desabilitado
- **IN_APPEAL**: Em processo de apelação

## 📱 Exemplo de Uso no Frontend

```typescript
// Abrir modal de criação
const [showCreateModal, setShowCreateModal] = useState(false);

// Criar template
const handleCreateTemplate = async (templateData) => {
  try {
    const response = await fetch('/api/whatsapp-templates/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        businessAccountId: '102290129340398',
        templateData
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Template criado:', result.data.templateId);
      // Recarregar lista de templates
      loadTemplates();
    }
  } catch (error) {
    console.error('Erro ao criar template:', error);
  }
};
```

## 🚀 Próximos Passos

1. **Validação Avançada**: Implementar validação mais robusta dos componentes
2. **Upload de Mídia**: Suporte para templates com imagens, vídeos e documentos
3. **Editor Visual**: Interface drag-and-drop para criar templates
4. **Histórico de Versões**: Controle de versões dos templates
5. **Aprovação em Lote**: Aprovar múltiplos templates simultaneamente

## 📞 Suporte

Para dúvidas ou problemas com a API, consulte:
- [Documentação da Meta WhatsApp Business API](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/)
- [Guia de Categorização de Templates](https://developers.facebook.com/docs/whatsapp/updates-to-pricing/new-template-guidelines)
- [Suporte da Meta para Desenvolvedores](https://developers.facebook.com/support/)
