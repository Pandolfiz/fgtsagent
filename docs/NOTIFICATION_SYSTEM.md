# Sistema de Notificações em Tempo Real

## Visão Geral

O sistema de notificações foi desenvolvido para monitorar mudanças nas tabelas `balance` e `proposals` do Supabase e notificar os usuários em tempo real quando novos registros são criados ou atualizados.

## Arquitetura

### Backend (Node.js/Express)
- **Serviço de Notificações**: `src/services/notificationService.js`
- **Rotas de API**: `src/routes/notificationRoutes.js`
- **Real-time Subscriptions**: Usando Supabase Real-time
- **Webhooks**: Suporte para envio de notificações via webhook (opcional)

### Frontend (React)
- **Cliente Supabase**: `frontend/src/lib/supabaseClient.js`
- **Hook de Notificações**: `frontend/src/hooks/useRealtimeNotifications.js`
- **Componente de Notificações**: `frontend/src/components/NotificationCenter.jsx`
- **Botão de Notificações**: `frontend/src/components/NotificationButton.jsx`

## Funcionalidades

### 🎯 Monitoramento Automático
- **Tabela `balance`**: Monitora inserções e atualizações de saldos
- **Tabela `proposals`**: Monitora inserções e atualizações de propostas
- **Filtragem por Cliente**: Notificações são contextualizadas por cliente

### 🔔 Tipos de Notificação

#### Saldos (Balance)
- **Nova Consulta**: Quando um novo saldo é consultado
- **Atualização**: Quando um saldo existente é atualizado
- **Informações**: Valor do saldo, simulação, fonte, lead associado

#### Propostas (Proposals)
- **Nova Proposta**: Quando uma nova proposta é criada
- **Atualização de Status**: Quando o status da proposta muda
- **Priorização**: Notificações são priorizadas baseadas no status (aprovada = alta prioridade)

### 📱 Interface do Usuário
- **Botão de Notificações**: Badge com contador de notificações não lidas
- **Centro de Notificações**: Painel lateral com histórico completo
- **Filtros**: Por tipo (todas, não lidas, saldos, propostas)
- **Ações**: Marcar como lida, remover, limpar todas
- **Notificações do Navegador**: Push notifications (com permissão)

## Configuração

### Backend

1. **Variáveis de Ambiente** (opcional):
```bash
# URL para webhook de notificações (opcional)
NOTIFICATION_WEBHOOK_URL=https://seu-webhook.com/notifications
```

2. **Inicialização Automática**:
O serviço é iniciado automaticamente quando o servidor é iniciado.

### Frontend

1. **Integração no Layout**:
O `NotificationButton` já está integrado no componente `Navbar`.

2. **Configuração de Permissões**:
O sistema solicita permissão para notificações do navegador automaticamente.

## API Endpoints

### Status do Serviço
```http
GET /api/notifications/status
```
Retorna o status atual do serviço de notificações.

### Controle do Serviço
```http
POST /api/notifications/start    # Iniciar serviço
POST /api/notifications/stop     # Parar serviço
POST /api/notifications/restart  # Reiniciar serviço
```

## Testando o Sistema

### Script de Teste Automatizado
```bash
node src/scripts/test-notifications.js
```

Este script:
1. Verifica a conexão com o Supabase
2. Cria dados de teste (cliente e lead)
3. Insere registro na tabela `balance`
4. Insere registro na tabela `proposals`
5. Atualiza o status da proposta
6. Verifica o status do serviço

### Teste Manual

1. **Via Interface**:
   - Acesse o dashboard
   - Clique no botão de notificações (sino)
   - Use o botão "Simular Notificação" para testes

2. **Via Banco de Dados**:
   ```sql
   -- Inserir saldo de teste
   INSERT INTO balance (client_id, lead_id, balance, simulation, source)
   VALUES ('uuid-do-cliente', 'uuid-do-lead', 15000.00, 9000.00, 'manual_test');
   
   -- Inserir proposta de teste
   INSERT INTO proposals (client_id, lead_id, value, status, source)
   VALUES ('uuid-do-cliente', 'uuid-do-lead', 12000.00, 'pendente', 'manual_test');
   ```

## Estrutura das Notificações

### Dados da Notificação
```javascript
{
  id: "unique-id",
  type: "success|info|warning|error",
  title: "Título da Notificação",
  message: "Mensagem descritiva",
  timestamp: "2024-01-01T12:00:00Z",
  read: false,
  data: {
    table: "balance|proposals",
    action: "insert|update",
    leadId: "uuid",
    clientId: "uuid",
    // ... outros dados específicos
  }
}
```

### Eventos Customizados
O sistema dispara eventos customizados no navegador:
- `balance-insert`
- `balance-update`
- `proposal-insert`
- `proposal-update`

## Logs e Monitoramento

### Backend
- Logs estruturados com Winston
- Status de conexão e subscriptions
- Tentativas de reconexão automática
- Métricas de performance

### Frontend
- Console logs para debugging
- Status de conexão em tempo real
- Contadores de notificações

## Troubleshooting

### Problemas Comuns

1. **Notificações não aparecem**:
   - Verifique se o serviço está rodando: `GET /api/notifications/status`
   - Verifique os logs do backend
   - Confirme se as permissões do navegador estão habilitadas

2. **Conexão perdida**:
   - O serviço tenta reconectar automaticamente
   - Verifique a conectividade com o Supabase
   - Reinicie o serviço se necessário: `POST /api/notifications/restart`

3. **Performance**:
   - Notificações são limitadas a 50 por usuário
   - Limpeza automática de notificações antigas
   - Cache de informações de leads

### Logs Úteis
```bash
# Verificar logs do backend
tail -f logs/combined.log | grep -i notification

# Verificar status do serviço
curl http://localhost:3000/api/notifications/status
```

## Extensibilidade

### Adicionar Novas Tabelas
1. Edite `notificationService.js`
2. Adicione nova subscription
3. Implemente handlers específicos
4. Atualize o frontend se necessário

### Webhooks Personalizados
Configure `NOTIFICATION_WEBHOOK_URL` para enviar notificações para sistemas externos.

### Filtros Personalizados
Estenda o `NotificationCenter` para adicionar novos filtros e categorias.

## Segurança

- **Autenticação**: Todas as rotas de API requerem autenticação
- **Autorização**: Notificações são filtradas por cliente
- **RLS**: Row Level Security do Supabase protege os dados
- **Sanitização**: Dados são sanitizados antes do envio

## Performance

- **Lazy Loading**: Notificações são carregadas sob demanda
- **Debouncing**: Evita notificações duplicadas
- **Cleanup**: Limpeza automática de recursos
- **Caching**: Cache de informações de leads e clientes
