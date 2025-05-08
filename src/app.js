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
const adminRoutes = require('./routes/adminRoutes');
const apiRoutes = require('./routes/apiRoutes');
const evolutionCredentialRoutes = require('./routes/evolutionCredentialRoutes');
const chatWebhookRoutes = require('./routes/chatWebhookRoutes');
const chatRoutes = require('./routes/chatRoutes');
const contactsRoutes = require('./routes/contacts');
const messagesRoutes = require('./routes/messages');
const { webhookAuth } = require('./middleware/webhookAuth');

// Definir variáveis de ambiente para autenticação OAuth2
process.env.USE_SUPABASE_AUTH = process.env.USE_SUPABASE_AUTH || 'true';

// Inicializar o aplicativo Express - criar uma nova instância limpa
const app = express();

// Configurar o Express para confiar em proxies
app.set('trust proxy', 1);

// Configurar limites de requisição
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300 // Máximo de 300 requisições por janela de tempo
});

// Limiter mais restritivo para rotas de API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200 // Máximo de 200 requisições por janela de tempo
});

// Limiter ainda mais restritivo para rotas de autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30 // Máximo de 30 requisições por janela de tempo
});

// Speed limiter para rotas de API
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: 100, // Começar a atrasar depois de 100 requisições
  delayMs: () => 500, // 500ms de atraso fixo por requisição acima do limite
  validate: { delayMs: false } // Desabilitar a validação para evitar o aviso
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

// Configurar CORS para permitir requisições do frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cookieParser());

// Aplicar sanitização de dados para todas as rotas
app.use(sanitizeRequest(['body', 'query', 'params']));

// Servir arquivos estáticos - primeiro as assets do backend
app.use(express.static(path.join(__dirname, 'public')));

// Servir arquivos estáticos do frontend (build)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

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

// Rotas API e de autenticação
const webRoutes = require('./routes/webRoutes');
const authRoutes = require('./routes/authRoutes');
const credentialsRoutes = require('./routes/credentialsRoutes');

// Rota de verificação de saúde (deve vir antes de outras rotas)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Rota do webhook (deve vir antes das rotas autenticadas)
app.use('/api/webhooks/evolution', webhookAuth, chatWebhookRoutes);

// Rotas API - estas devem vir antes da rota catch-all para o React
app.use('/api', apiRoutes);
app.use('/auth', authLimiter, authRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/whatsapp-credentials', requireAuth, evolutionCredentialRoutes);
app.use('/api/credentials', credentialsRoutes);
app.use('/api', credentialsRoutes);
app.use('/api/chat', requireAuth, chatRoutes);
app.use('/api/admin', adminRoutes);

// Novas rotas para gerenciamento de contatos e mensagens
app.use('/api/contacts', requireAuth, contactsRoutes);
app.use('/api/messages', requireAuth, messagesRoutes);

// Rotas específicas do backend com renderização de template
app.use('/admin', webRoutes.router);

// Rotas específicas de OAuth2 - tratadas separadamente
app.get('/auth/v1/callback', (req, res) => {
  console.log('Detectado callback do Supabase:', req.path, req.query);
  res.redirect(`/oauth2-credential/callback?${new URLSearchParams(req.query).toString()}`);
});

app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
  console.log('Detectado callback específico do Google:', req.path);
  res.sendFile(path.join(__dirname, '../frontend/dist/oauth-handler.html'));
});

app.get(['/oauth2-credential/callback', '/oauth2-credential/callback/'], (req, res) => {
  console.log('Detectado callback OAuth2 específico:', req.path);
  res.sendFile(path.join(__dirname, '../frontend/dist/oauth-handler.html'));
});

// Rota genérica para qualquer padrão de callback OAuth
app.get('*/callback*', (req, res) => {
  console.log('Detectado padrão de callback OAuth genérico:', req.path);
  res.sendFile(path.join(__dirname, '../frontend/dist/oauth-handler.html'));
});

// Todas as outras solicitações são tratadas pelo React Router
// Esta rota deve vir DEPOIS de todas as rotas API e callback OAuth específicas
app.get('*', (req, res) => {
  // Lista de rotas do backend que não devem ser tratadas pelo React Router
  const backendRoutes = ['/api/', '/auth/', '/admin/', '/health', '/webhooks/'];
  const isBackendRoute = backendRoutes.some(route => req.path.startsWith(route));
  
  if (isBackendRoute) {
    // Se for uma rota de API ou backend não encontrada, retornar 404
    return res.status(404).json({
      success: false,
      message: 'Endpoint não encontrado'
    });
  }
  
  // Para qualquer outra rota, servir o index.html do React
  console.log('Servindo App React para:', req.path);
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
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
  
  // Se for uma requisição para o dashboard ou front React, usar o SPA React
  if (req.path.startsWith('/dashboard') || !req.path.startsWith('/admin/')) {
    return res.status(err.statusCode || 500).sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
  
  // Responder com página de erro para requisições web (apenas admin)
  res.status(err.statusCode || 500).render('error', {
    title: 'Erro',
    message: err.message || 'Ocorreu um erro inesperado',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = app;