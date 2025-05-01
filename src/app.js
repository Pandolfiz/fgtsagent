// app.js (atualizado)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const ejsLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { sanitizeRequest } = require('./middleware/sanitizationMiddleware');
const session = require('express-session');
const flash = require('connect-flash');
const config = require('./config');
const userApiKeyMiddleware = require('./middleware/userApiKeyMiddleware');
const { requireAuth } = require('./middleware/auth');
const { migrate } = require('./config/migrate');
const adminRoutes = require('./routes/adminRoutes');
const apiRoutes = require('./routes/apiRoutes');
const evolutionCredentialRoutes = require('./routes/evolutionCredentialRoutes');
const chatWebhookRoutes = require('./routes/chatWebhookRoutes');
const chatRoutes = require('./routes/chatRoutes');
const { webhookAuth } = require('./middleware/webhookAuth');

// Inicializar o aplicativo Express
const app = express();

// Configurar o Express para confiar em proxies
app.set('trust proxy', 1);

// Configurar limites de requisição
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // Máximo de 300 requisições por janela de tempo
  standardHeaders: true,
  message: { success: false, message: 'Muitas requisições. Por favor, tente novamente mais tarde.' }
});

// Limiter mais restritivo para rotas de API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // Máximo de 200 requisições por janela de tempo
  standardHeaders: true,
  message: { success: false, message: 'Muitas requisições à API. Por favor, tente novamente mais tarde.' }
});

// Limiter ainda mais restritivo para rotas de autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // Máximo de 30 requisições por janela de tempo
  standardHeaders: true,
  message: { success: false, message: 'Muitas tentativas de autenticação. Por favor, tente novamente mais tarde.' }
});

// Speed limiter para rotas de API
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: 100, // Começar a atrasar depois de 100 requisições
  delayMs: (used, req) => {
    const delayAfter = req.slowDown.limit;
    return (used - delayAfter) * 500; // 500ms de atraso multiplicado pelo número de requisições acima do limite
  },
  validate: { delayMs: true } // Habilitar validação explícita para seguir a nova versão
});

// Aplicar limitadores globalmente, exceto para ambientes de desenvolvimento
if (process.env.NODE_ENV !== 'development') {
  app.use(generalLimiter);
  app.use('/api', speedLimiter);
  logger.info('Rate limiting habilitado para ambiente de produção');
}

// Middleware básicos
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'cdn.jsdelivr.net', 'code.jquery.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com'],
      fontSrc: ["'self'", 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cookieParser());

// Aplicar sanitização de dados para todas as rotas
app.use(sanitizeRequest(['body', 'query', 'params']));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configurar engine de templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configurar layouts
app.use(ejsLayouts);
app.set('layout', 'layout');

// Middleware para definir o path atual em todas as respostas
app.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

// Configurar middleware de sessão
app.use(session({
  secret: process.env.SESSION_SECRET || 'sua-chave-secreta-aqui',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Configurar flash messages
app.use(flash());

// Middleware para disponibilizar mensagens flash em todas as views
app.use((req, res, next) => {
  res.locals.messages = {
    success: req.flash('success'),
    error: req.flash('error')
  };
  next();
});

// Rotas
const webRoutes = require('./routes/webRoutes');
const authRoutes = require('./routes/authRoutes');
const credentialsRoutes = require('./routes/credentialsRoutes');

// Rota de verificação de saúde (deve vir antes de outras rotas)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Rota do webhook (deve vir antes das rotas autenticadas)
app.use('/api/webhooks/evolution', webhookAuth, chatWebhookRoutes);

// Rotas que precisam de autenticação
app.use('/api', apiRoutes);
app.use('/auth', authLimiter, authRoutes); // Aplicar rate limiting às rotas de autenticação
app.use('/api/auth', authLimiter, authRoutes); // Aplicar rate limiting às rotas de autenticação da API
app.use('/api/evolution-credentials', requireAuth, evolutionCredentialRoutes);
app.use('/api/credentials', credentialsRoutes);
app.use('/api', credentialsRoutes);
app.use('/api/chat', requireAuth, chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/', webRoutes.router);  // Atualizado para usar webRoutes.router

// Adicionar rota específica para o callback OAuth2 na raiz do aplicativo
app.get('/oauth2-credential/callback', (req, res) => {
  // Esta rota vai receber apenas o fragmento de hash da URL após autenticação
  // Como os parâmetros estão após # (hash fragment), eles não são enviados ao servidor
  // Precisamos usar JavaScript do lado do cliente para extraí-los
  
  return res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Processando Autenticação</title>
      <script>
        // Extrair parâmetros do fragmento de hash
        const hashParams = window.location.hash.substring(1).split('&').reduce((acc, param) => {
          const [key, value] = param.split('=');
          acc[key] = decodeURIComponent(value);
          return acc;
        }, {});
        
        // Verificar token
        if (hashParams.access_token) {
          // Enviar o token para seu backend para processar a autenticação
          fetch('/auth/process-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(hashParams)
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              // Redirecionar para o dashboard
              window.location.href = '/dashboard';
            } else {
              // Redirecionar para a página de login com erro
              window.location.href = '/auth/login?error=' + encodeURIComponent(data.error || 'Falha na autenticação');
            }
          })
          .catch(error => {
            console.error('Erro:', error);
            window.location.href = '/auth/login?error=erro_de_processamento';
          });
        } else {
          // Sem token, redirecionar para a página de login
          window.location.href = '/auth/login?error=token_ausente';
        }
      </script>
    </head>
    <body>
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
        <div style="text-align: center;">
          <h2>Processando sua autenticação...</h2>
          <p>Por favor, aguarde enquanto redirecionamos você.</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Verificar se existem outras referências a arquivos OAuth2 e remover
app.get('/api/credentials/oauth2/callback/:provider', async (req, res) => {
  // Esta rota não é mais necessária após a remoção das credenciais do Google
  res.status(404).send("Esta rota não está mais disponível");
});

// Outras rotas OAuth2 que precisam ser removidas
app.get('/api/credentials/oauth2/authorize/:organizationId/:provider', async (req, res) => {
  // Esta rota não é mais necessária após a remoção das credenciais do Google
  res.status(404).send("Esta rota não está mais disponível");
});

app.get('/api/credentials/oauth2/popup/:provider', async (req, res) => {
  // Esta rota não é mais necessária após a remoção das credenciais do Google
  res.status(404).send("Esta rota não está mais disponível");
});

// Middleware para rotas não encontradas
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'Endpoint não encontrado'
    });
  }
  
  res.status(404).render('error', {
    title: 'Página não encontrada',
    message: 'A página que você está procurando não existe',
    error: {}
  });
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
  logger.error(`Erro na aplicação: ${err.stack || err.message}`);
  
  // Verificar se é uma requisição de API
  if (req.path.startsWith('/api/')) {
    // Responder com JSON para erros em requisições de API
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Erro interno do servidor'
    });
  }
  
  // Responder com página de erro para requisições web
  res.status(err.statusCode || 500).render('error', {
    title: 'Erro',
    message: err.message || 'Ocorreu um erro inesperado',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Adicionar migração para garantir que as tabelas existam
async function runMigration() {
  try {
    const result = await migrate();
    if (result.success) {
      console.log(`Migração: ${result.message}`);
    } else {
      console.error(`Erro na migração: ${result.error}`);
    }
  } catch (error) {
    console.error(`Erro na migração: ${error.message}`);
  }
}

// Executar migração no início do aplicativo
runMigration().catch(err => {
  console.error('Falha na migração inicial:', err);
});

module.exports = app;