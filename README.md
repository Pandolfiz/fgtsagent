# FGTS Manager

Sistema de gerenciamento para consulta, simulação e formalização de contratos de antecipação de saque-aniversário do FGTS.

## 📋 Sobre o Projeto

FGTS Manager é uma aplicação web completa que permite a empresas parceiras gerenciar todo o processo de antecipação do saque-aniversário do FGTS, desde a consulta de saldo, simulação de valores, geração de propostas, até a formalização e acompanhamento dos contratos.

### Funcionalidades Principais

- **Consulta de Saldo FGTS**: Integração com APIs para verificação de saldo disponível
- **Simulações de Antecipação**: Cálculo de valores e taxas para antecipação
- **Geração de Propostas**: Criação de propostas para clientes
- **Dashboard Analítico**: Visualização de métricas e desempenho
- **Gerenciamento de Usuários**: Sistema de autenticação e permissões
- **API Completa**: Endpoints para integração com outros sistemas
- **Chat em Tempo Real**: Comunicação instantânea entre usuários com suporte a diferentes agentes (humano/IA)
- **Assistente IA**: Chat inteligente para atendimento automatizado via interface web e WhatsApp
- **Upload de Documentos**: Gestão de documentos e arquivos dos clientes
- **Integração WhatsApp**: Comunicação via API oficial do WhatsApp Cloud

## 🔧 Tecnologias

### Backend
- **Node.js** e **Express**: API RESTful e servidor web
- **PostgreSQL/Supabase**: Banco de dados principal e autenticação
- **Supabase Realtime**: Para funcionalidades em tempo real e notificações
- **JWT**: Autenticação e autorização de usuários
- **Socket.io**: Comunicação em tempo real entre cliente e servidor
- **Winston**: Logging estruturado para monitoramento
- **Redis**: Cache, rate limiting e gerenciamento de filas
- **Multer**: Upload e processamento de documentos
- **WhatsApp Cloud API**: Integração oficial com WhatsApp Business
- **OpenAI/GPT**: Processamento de linguagem natural para assistente IA
- **Helmet**: Segurança da aplicação com headers HTTP
- **Express Rate Limit**: Proteção contra abuso da API
- **Bull**: Processamento de tarefas em background

### Frontend
- **React**: UI Componentizada
- **Vite**: Build tool de alta performance
- **TailwindCSS**: Framework CSS utilitário para estilização
- **React Router**: Navegação cliente-side
- **Socket.io Client**: Comunicação em tempo real
- **Axios**: Cliente HTTP para requisições
- **Toastify**: Sistema de notificações toast
- **React Query**: Gerenciamento de estado e cache de dados
- **QRCode**: Geração de QR codes para WhatsApp

## 🚀 Instalação

### Pré-requisitos
- Node.js (v18+)
- npm ou yarn
- PostgreSQL ou conta Supabase
- Redis (para cache e gerenciamento de filas)
- Conta de desenvolvedor Meta (para API do WhatsApp)
- Chave de API OpenAI (para assistente IA)

### Configuração do Ambiente

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/fgts-manager.git
cd fgts-manager
```

2. Instale as dependências do projeto principal:
```bash
npm install
```

3. Instale as dependências do frontend:
```bash
cd frontend
npm install
cd ..
```

4. Configure o arquivo `.env` na raiz do projeto:
```
# Servidor
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=sua_url_supabase
SUPABASE_SERVICE_KEY=sua_chave_servico
SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_JWT_SECRET=seu_jwt_secret

# Redis (para cache e tasks)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Google OAuth (autenticação)
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# WhatsApp API
WHATSAPP_ACCESS_TOKEN=seu_token_whatsapp
WHATSAPP_API_VERSION=v22.0
WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=seu_business_account_id
WHATSAPP_API_URL=https://graph.facebook.com

# OpenAI (para assistente)
OPENAI_API_KEY=sua_chave_openai
OPENAI_MODEL=gpt-4-turbo-preview

# Segurança
JWT_SECRET=seu_jwt_secret
JWT_EXPIRATION=7d
SESSION_SECRET=seu_session_secret

# Configurações de App
APP_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
UPLOAD_DIR=uploads
```

5. Configure o arquivo `.env` no diretório `frontend`:
```
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon
VITE_SOCKET_URL=http://localhost:3000
VITE_WHATSAPP_ENABLED=true
VITE_CHAT_ASSISTANT_ENABLED=true
```

### Configuração do Banco de Dados

1. Se estiver usando Supabase, crie as tabelas necessárias:

```sql
-- Exemplo de criação de tabelas principais
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  remote_jid TEXT NOT NULL,
  push_name TEXT,
  phone TEXT,
  agent_status TEXT DEFAULT 'full',
  agent_state TEXT DEFAULT 'human',
  client_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT NOT NULL,
  sender_id UUID,
  recipient_id TEXT,
  content TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  client_id UUID,
  contact TEXT,
  role TEXT DEFAULT 'USER'
);
```

## 🏃‍♂️ Executando o Projeto

### Desenvolvimento

1. Inicie o servidor backend:
```bash
npm run dev
```

2. Em outro terminal, inicie o frontend:
```bash
cd frontend
npm run dev
```

3. Para executar o frontend e backend simultaneamente:
```bash
npm run dev:all
```

4. Acesse o aplicativo em:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- Documentação API: http://localhost:3000/api/docs (se disponível)

### Produção

1. Construa o frontend:
```bash
npm run build:frontend
```

2. Inicie o servidor em modo produção:
```bash
npm start
```

3. Ou use o comando de build completo:
```bash
npm run build
```

### Scripts Disponíveis

- `npm run dev`: Inicia o servidor backend em modo desenvolvimento
- `npm start`: Inicia o servidor em modo produção
- `npm test`: Executa todos os testes
- `npm run build:frontend`: Compila o frontend
- `npm run build`: Compila o frontend e inicia o servidor
- `npm run dev:all`: Inicia backend e frontend simultaneamente

## 📁 Estrutura do Projeto

```
/
├── frontend/               # Frontend React
│   ├── public/             # Arquivos estáticos
│   │   ├── assets/         # Imagens e recursos estáticos
│   │   ├── components/     # Componentes React reutilizáveis
│   │   ├── contexts/       # Contextos React (auth, theme, etc.)
│   │   ├── hooks/          # Hooks personalizados
│   │   ├── pages/          # Componentes de página
│   │   ├── services/       # Serviços de API e integrações
│   │   ├── utils/          # Funções utilitárias
│   │   ├── App.jsx         # Componente principal
│   │   └── main.jsx        # Ponto de entrada
│   └── dist/               # Build do frontend
│
├── src/                    # Servidor principal (backend)
│   ├── config/             # Configurações (database, auth, etc.)
│   ├── controllers/        # Controladores da API
│   ├── middleware/         # Middlewares Express
│   ├── models/             # Modelos de dados
│   ├── routes/             # Rotas da API
│   ├── services/           # Serviços do backend
│   ├── utils/              # Utilitários
│   ├── views/              # Templates EJS (se usados)
│   ├── repositories/       # Camada de acesso a dados
│   ├── jobs/               # Tarefas em background
│   ├── scripts/            # Scripts de automação
│   ├── migrations/         # Migrações de banco de dados
│   ├── tests/              # Testes automatizados
│   │   ├── unit/           # Testes unitários
│   │   ├── integration/    # Testes de integração
│   │   └── e2e/            # Testes end-to-end
│   ├── app.js              # Configuração do Express
│   └── server.js           # Entrada da aplicação
│
├── supabase/               # Configurações Supabase
│   ├── migrations/         # Migrações de banco de dados
│   └── functions/          # Edge Functions
│
├── uploads/                # Diretório para uploads
├── logs/                   # Logs da aplicação
├── public/                 # Arquivos estáticos públicos
├── scripts/                # Scripts utilitários globais
│
└── package.json            # Dependências do projeto
```

## 📈 API RESTful

A API segue princípios RESTful e está disponível em `/api`. Principais endpoints:

- **Autenticação**
  - `POST /api/auth/register` - Registro de usuário
  - `POST /api/auth/login` - Login com credenciais
  - `GET /api/auth/me` - Dados do usuário atual
  - `POST /api/auth/logout` - Logout do usuário
  - `POST /api/auth/google` - Autenticação com Google OAuth2
  - `POST /api/auth/refresh` - Renovar token JWT

- **FGTS**
  - `POST /api/fgts/consult` - Consultar saldo FGTS
  - `POST /api/fgts/simulate` - Simular antecipação
  - `GET /api/fgts/history` - Histórico de consultas

- **Propostas**
  - `GET /api/proposals` - Listar propostas
  - `POST /api/proposals` - Criar proposta
  - `GET /api/proposals/:id` - Detalhes da proposta
  - `PATCH /api/proposals/:id` - Atualizar proposta
  - `DELETE /api/proposals/:id` - Excluir proposta

- **Mensagens e Chat**
  - `GET /api/messages/:conversationId` - Obter mensagens de uma conversa
  - `POST /api/messages` - Enviar mensagem (suporta diferentes roles: ME, AI, USER)
  - `PATCH /api/messages/:messageId/status` - Atualizar status da mensagem
  - `GET /api/contacts` - Listar contatos
  - `POST /api/contacts` - Criar novo contato
  - `GET /api/contacts/count` - Contagem de contatos

- **Webhooks**
  - `POST /api/webhook/whatsapp` - Webhook para eventos do WhatsApp

- **Dashboard**
  - `GET /api/dashboard/stats` - Estatísticas gerais
  - `GET /api/dashboard/metrics` - Métricas detalhadas

- **Uploads**
  - `POST /api/uploads` - Upload de documentos
  - `GET /api/uploads/:id` - Download de documentos
  - `DELETE /api/uploads/:id` - Excluir documento

- **Websockets**
  - Conexão em `/socket.io` para comunicação em tempo real
  - Eventos para mensagens, notificações e status online

## 🤖 Assistente IA e Integração WhatsApp

O sistema possui um assistente IA integrado que pode:
- Responder perguntas sobre FGTS e processos de antecipação
- Guiar clientes durante o processo de simulação
- Coletar informações necessárias para propostas
- Comunicar-se via WhatsApp com clientes
- Alternar automaticamente para atendimento humano quando necessário

### Modos de Operação

O chat suporta dois modos principais, controlados pelo campo `agent_state` nos contatos:
- `human`: Todas as mensagens são gerenciadas por humanos
- `ai`: O assistente IA responde automaticamente às mensagens

### Configuração da Integração WhatsApp

1. Crie uma conta de desenvolvedor Meta
2. Configure um aplicativo com acesso à WhatsApp Business API
3. Obtenha o token de acesso e preencha no arquivo `.env`
4. Configure o webhook para receber mensagens (deve apontar para `/api/webhook/whatsapp`)
5. Verifique o número de telefone comercial na plataforma Meta

### Serviços de API

O sistema integra-se com diversos serviços, incluindo:
- API oficial do WhatsApp Cloud para envio e recepção de mensagens
- OpenAI para processamento de linguagem natural
- Supabase para autenticação e armazenamento

## 🔄 Integração com Supabase

O projeto utiliza Supabase para:
- Banco de dados PostgreSQL
- Autenticação de usuários e gerenciamento de permissões
- Armazenamento de arquivos (Storage)
- Comunicação em tempo real (Realtime)
- Regras de segurança (RLS) para proteção de dados

Para mais detalhes sobre a integração com OAuth2 do Google, consulte o arquivo [GOOGLE_OAUTH2.md](GOOGLE_OAUTH2.md).

## 🧪 Testes

Para executar os testes automatizados:

```bash
# Testes unitários
npm run test:unit

# Testes de integração
npm run test:integration

# Testes end-to-end
npm run test:e2e

# Todos os testes
npm test
```

O sistema de testes utiliza:
- Jest como framework principal
- Supertest para testes de API
- Mocks para serviços externos

## 🔒 Segurança

O projeto implementa diversas medidas de segurança:
- Autenticação JWT com rotação de tokens
- Sanitização de todas as entradas de usuário
- Rate limiting para prevenir abuso da API
- Verificação de CORS para controle de origens
- Proteção contra ataques XSS e CSRF
- Permissões baseadas em funções (RBAC)
- Logs de auditoria para ações sensíveis

## 🤝 Contribuição

1. Faça o fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

Consulte o guia de contribuição para mais detalhes sobre coding standards, processo de revisão e setup de desenvolvimento.

## 📄 Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Contato

Para questões ou suporte, entre em contato através de [seu-email@exemplo.com]. 