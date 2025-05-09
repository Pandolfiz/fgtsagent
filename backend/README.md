# Backend - Integração com WhatsApp Cloud API

Este projeto implementa a integração com a API Cloud do WhatsApp para envio de mensagens.

## Configuração do Ambiente

Para executar este projeto, você precisa configurar as seguintes variáveis de ambiente:

### Variáveis de Ambiente Obrigatórias

```env
# Supabase
SUPABASE_URL=sua_url_do_supabase
SUPABASE_KEY=sua_chave_do_supabase

# WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN=seu_token_de_acesso_do_whatsapp
```

As outras configurações necessárias para a API do WhatsApp (phone_number_id e business_account_id) são obtidas da tabela `whatsapp_credentials` no Supabase.

## Estrutura da Tabela whatsapp_credentials

A tabela `whatsapp_credentials` no Supabase deve conter as seguintes colunas:

- `id` (UUID): ID único para cada registro
- `client_id` (UUID): ID do cliente associado às credenciais
- `wpp_number_id` (String): ID do número de telefone WhatsApp Business
- `wpp_business_account_id` (String): ID da conta de negócios WhatsApp
- `created_at` (Timestamp): Data de criação
- `updated_at` (Timestamp): Data de atualização

## Endpoints da API

### Enviar Mensagem

```
POST /api/messages
```

**Corpo da Requisição**:
```json
{
  "conversationId": "string",
  "content": "string",
  "recipientId": "string"
}
```

## Documentação Oficial

Para mais informações sobre a API Cloud do WhatsApp, consulte a [documentação oficial da Meta](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages). 