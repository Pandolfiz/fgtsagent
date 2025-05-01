# SAAS FGTS

## Visão Geral

Plataforma completa para gestão de agentes, automação de atendimento, integrações e operações financeiras, com backend Node.js (Express), autenticação Supabase, dashboard React, testes automatizados e CI/CD.

---

## Principais Funcionalidades
- API RESTful para gerenciamento de agentes, leads, propostas, clientes, mensagens, base de conhecimento e integrações.
- Autenticação e autorização robustas (Supabase, JWT, RLS).
- Dashboard administrativo em React (src/dashboard-react).
- Sanitização, validação e limitação de requisições para segurança.
- Scripts utilitários para manutenção, integração e subworkflows n8n.
- Testes automatizados (unitários e integração) com Jest e Supertest.
- CI/CD com GitHub Actions.

---

## Estrutura do Projeto

```
src/
  app.js                # App Express principal
  server.js             # Inicialização do servidor
  config/               # Configurações (Supabase, Redis, etc)
  controllers/          # Lógica de negócio (agentes, auth, dashboard, etc)
  models/               # Modelos de dados
  routes/               # Rotas da API e web
  services/             # Integrações externas e lógica de serviço
  middleware/           # Middlewares (auth, sanitização, etc)
  tests/
    unit/               # Testes unitários
    integration/        # Testes de integração
  dashboard-react/      # Frontend React (dashboard)
  scripts/              # Scripts utilitários (ex: subworkflow-manager)
  public/               # Assets públicos (js, css, imagens)
  views/                # Templates EJS para páginas web
  utils/                # Funções utilitárias
  logs/                 # Logs de execução
```

---

## Tecnologias Utilizadas
- Node.js + Express
- Supabase (PostgreSQL, Auth, Storage)
- React (dashboard)
- Jest e Supertest (testes)
- GitHub Actions (CI/CD)
- Docker e docker-compose (opcional)
- Helmet, CORS, Rate Limit, Slow Down (segurança)

---

## Testes Automatizados
- **Unitários:** Funções utilitárias, validação, sanitização.
- **Integração:** Autenticação, rotas protegidas, APIs principais.

### Exemplos reais:

**Validação de e-mail e campo obrigatório:**
```js
expect(validator.validate({ email: 'invalido' }, schema)).toEqual([
  { field: 'email', message: 'O campo email deve ser um e-mail válido' }
]);
```

**Login inválido:**
```js
const res = await request(app)
  .post('/auth/login')
  .send({ email: 'naoexiste@email.com', password: 'senhaerrada' });
expect(res.statusCode).toBe(401);
```

**Rota protegida:**
```js
const res = await request(app).get('/api/agents');
expect([401, 403]).toContain(res.statusCode);
```

### Como rodar os testes

```bash
npm test
```

---

## CI/CD
- Pipeline automatizado no GitHub Actions:
  - Instala dependências, executa lint, testes e build.
  - Só permite deploy se todos os testes passarem.
  - Roda em todo push/pull request na branch `main`.

---

## Scripts Utilitários
- **subworkflow-manager.js:** Gerencia subworkflows do n8n via CLI (ver `src/scripts/README.md`).
- Outros scripts para manutenção e integração podem estar disponíveis em `src/scripts/`.

---

## Configuração do Ambiente

Crie um arquivo `.env` na raiz do projeto com as variáveis:

```
SUPABASE_URL=https://sua-instancia.supabase.co
SUPABASE_SERVICE_KEY=sua-chave-de-serviço
```

---

## Estrutura do Banco de Dados (Supabase)

### Tabelas principais
- **clients:** Clientes da plataforma (relaciona com user_profiles, leads, proposals, etc)
- **user_profiles:** Perfis de usuários (relaciona com clients)
- **evolution_credentials:** Instâncias de integração Evolution (WhatsApp)
- **partner_credentials:** Credenciais de parceiros para integrações
- **leads:** Leads capturados (relaciona com clients, balance, proposals)
- **proposals:** Propostas comerciais (relaciona com leads, clients)
- **balance:** Consultas de saldo e simulações (relaciona com clients, leads)
- **knowledge_base:** Base de conhecimento para agentes (vetorização para IA)
- **messages:** Mensagens trocadas via agentes (relaciona com evolution_credentials)
- **long_term_memory:** Memória de longo prazo dos agentes
- **agent_memories:** Memória temporária dos agentes

### Observações
- **RLS (Row Level Security):** Ativado em várias tabelas para segurança multi-tenant.
- **Campos de metadados:** Uso extensivo de campos `metadata` (jsonb) para flexibilidade.
- **Relacionamentos:** Estrutura relacional bem definida entre clientes, leads, propostas, agentes, etc.
- **Vetorização:** Campo `embedding` (vector) na knowledge_base para IA/Busca semântica.

---

## Contribuição
- Sempre crie uma branch para suas alterações.
- Adicione testes para novas funcionalidades ou correções.
- Abra um Pull Request para revisão.

---

## Documentação Técnica
Veja `src/documentacao-tecnica.md` para detalhes sobre nomenclatura de workflows, subworkflows e integrações com n8n. 