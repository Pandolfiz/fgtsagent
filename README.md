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

## 🔧 Tecnologias

### Backend
- **Node.js** e **Express**: API RESTful
- **PostgreSQL/Supabase**: Banco de dados
- **JWT**: Autenticação
- **Swagger**: Documentação da API

### Frontend
- **React**: UI Componentizada
- **Vite**: Build tool
- **TailwindCSS**: Estilização
- **React Router**: Navegação
- **ChartJS**: Gráficos para o dashboard

## 🚀 Instalação

### Pré-requisitos
- Node.js (v16+)
- npm ou yarn
- PostgreSQL ou conta Supabase

### Configuração do Ambiente

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/fgts-manager.git
cd fgts-manager
```

2. Instale as dependências do backend:
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
SUPABASE_JWT_SECRET=seu_jwt_secret

# Configurações de App
APP_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:5173
```

5. Configure o arquivo `.env` no diretório `frontend`:
```
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon
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

3. Acesse o aplicativo em:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api

### Produção

1. Construa o frontend:
```bash
cd frontend
npm run build
cd ..
```

2. Inicie o servidor em modo produção:
```bash
npm start
```

## 📁 Estrutura do Projeto

```
/
├── frontend/              # Frontend React
│   ├── public/            # Arquivos estáticos
│   │   ├── assets/        # Recursos (imagens, etc)
│   │   ├── components/    # Componentes React
│   │   ├── lib/           # Bibliotecas e utilitários
│   │   ├── pages/         # Páginas/rotas
│   │   └── utilities/     # Funções utilitárias
│   └── package.json       # Dependências frontend
│
├── src/                   # Backend Node.js
│   ├── config/            # Configurações
│   ├── controllers/       # Controladores da API
│   ├── middleware/        # Middlewares Express
│   ├── models/            # Modelos de dados
│   ├── routes/            # Rotas da API
│   ├── services/          # Serviços do backend
│   ├── utils/             # Utilitários
│   └── views/             # Templates EJS
│
├── supabase/              # Configurações Supabase
│   ├── migrations/        # Migrações de banco de dados
│   └── functions/         # Edge Functions
│
└── package.json           # Dependências do projeto
```

## 📈 API RESTful

A API segue princípios RESTful e está disponível em `/api`. Principais endpoints:

- **Autenticação**
  - `POST /api/auth/register` - Registro de usuário
  - `POST /api/auth/login` - Login
  - `GET /api/auth/me` - Usuário atual

- **FGTS**
  - `POST /api/fgts/consult` - Consultar saldo FGTS
  - `POST /api/fgts/simulate` - Simular antecipação

- **Propostas**
  - `GET /api/proposals` - Listar propostas
  - `POST /api/proposals` - Criar proposta
  - `GET /api/proposals/:id` - Detalhes da proposta

- **Dashboard**
  - `GET /api/dashboard/stats` - Estatísticas gerais

## 🤝 Contribuição

1. Faça o fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Contato

Para questões ou suporte, entre em contato através de [seu-email@exemplo.com]. 