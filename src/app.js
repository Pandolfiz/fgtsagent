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
const { requestLogger, errorLogger } = require('./middleware/requestLogger');
const { sanitizeInput } = require('./middleware/validationMiddleware');
const session = require('express-session');
const flash = require('connect-flash');
const config = require('./config');
const userApiKeyMiddleware = require('./middleware/userApiKeyMiddleware');
const { requireAuth } = require('./middleware/auth');
const adminRoutes = require('./routes/adminRoutes');
const apiRoutes = require('./routes/apiRoutes');
const whatsappCredentialRoutes = require('./routes/whatsappCredentialRoutes');
const chatWebhookRoutes = require('./routes/chatWebhookRoutes');
const chatRoutes = require('./routes/chatRoutes');
const contactsRoutes = require('./routes/contacts');
const messagesRoutes = require('./routes/messages');
const healthRoutes = require('./routes/healthRoutes');
const { webhookAuth } = require('./middleware/webhookAuth');
const { errorHandler } = require('./middleware/errorHandler');
const databaseChecker = require('./utils/databaseChecker');
const { applyAllMigrations } = require('./utils/applyMigrations');

// Definir variáveis de ambiente para autenticação OAuth2
process.env.USE_SUPABASE_AUTH = process.env.USE_SUPABASE_AUTH || 'true';

// Inicializar o aplicativo Express - criar uma nova instância limpa
const app = express();

// Configurar o Express para confiar em proxies
app.set('trust proxy', 1);

// Configurar limites de requisição
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000 // Máximo de 1000 requisições por janela de tempo
});

// Limiter mais restritivo para rotas de API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000 // Máximo de 1000 requisições por janela de tempo
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
      scriptSrc: [
        "'self'",
        "'nonce-${res.locals.nonce}'", // Usar nonce para scripts inline
        "cdn.jsdelivr.net",
        "*.googleapis.com",
        "*.supabase.co",
        "https://js.stripe.com"
      ],
      styleSrc: [
        "'self'",
        "'nonce-${res.locals.nonce}'", // Usar nonce para estilos inline
        "cdn.jsdelivr.net",
        "fonts.googleapis.com",
        "*.googleapis.com",
        "cdnjs.cloudflare.com"
      ],
      fontSrc: [
        "'self'",
        "fonts.gstatic.com",
        "cdn.jsdelivr.net",
        "*.googleapis.com",
        "cdnjs.cloudflare.com",
        "use.fontawesome.com"
      ],
      frameSrc: [
        "'self'",
        "https://js.stripe.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "*.supabase.co",
        "ui-avatars.com",
        "placehold.co",
        "*.googleapis.com"
      ],
      connectSrc: [
        "'self'",
        "*.supabase.co",
        "wss:",
        "*.evolution-api.com",
        "*.v8sistema.com",
        "*.googleapis.com"
      ],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"], // Prevenir incorporação em iframes
      upgradeInsecureRequests: [], // Forçar HTTPS em produção
    }
  },
  // Configurações adicionais de segurança
  crossOriginEmbedderPolicy: false, // Permitir incorporação de recursos externos
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
}));

// Middleware para gerar nonce para CSP
app.use((req, res, next) => {
  // Gerar nonce único para cada requisição
  res.locals.nonce = require('crypto').randomBytes(16).toString('base64');
  
  // Atualizar CSP com o nonce gerado
  res.setHeader('Content-Security-Policy',
    `default-src 'self'; ` +
    `script-src 'self' 'nonce-${res.locals.nonce}' cdn.jsdelivr.net *.googleapis.com *.supabase.co https://js.stripe.com; ` +
    `style-src 'self' 'nonce-${res.locals.nonce}' cdn.jsdelivr.net fonts.googleapis.com *.googleapis.com cdnjs.cloudflare.com; ` +
    `font-src 'self' fonts.gstatic.com cdn.jsdelivr.net *.googleapis.com cdnjs.cloudflare.com use.fontawesome.com; ` +
    `img-src 'self' data: blob: *.supabase.co ui-avatars.com placehold.co *.googleapis.com; ` +
    `connect-src 'self' *.supabase.co wss: *.evolution-api.com *.v8sistema.com *.googleapis.com; ` +
    `media-src 'self'; ` +
    `object-src 'none'; ` +
    `base-uri 'self'; ` +
    `form-action 'self'; ` +
    `frame-ancestors 'none'; ` +
    `frame-src 'self' https://js.stripe.com; ` +
    `upgrade-insecure-requests;`
  );
  
  next();
});

// Configurar CORS para permitir requisições do frontend
app.use(cors({
  origin: function(origin, callback) {
    // Permitir requisições sem origem (ex: Postman, aplicações móveis)
    if (!origin) return callback(null, true);
    
    // Lista de domínios permitidos
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://localhost:3000',
      'http://localhost:8000',
      // URLs de produção
      'https://fgtsagent.com.br',
      'https://www.fgtsagent.com.br',
      'http://fgtsagent.com.br',
      'http://www.fgtsagent.com.br',
      // Variáveis de ambiente
      process.env.FRONTEND_URL,
      process.env.APP_URL
    ].filter(Boolean); // Remove valores nulos ou undefined
    
    // Verificar se a origem da requisição está na lista
    if (
      allowedOrigins.includes(origin) ||
      origin.includes('localhost') ||
      (origin && (origin.includes('.ngrok-free.app') || origin.includes('.ngrok.io')))
    ) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS'), false);
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
// app.use(morgan('dev'));
app.use(cookieParser());

// Middleware global para logar todas as requisições recebidas
// app.use((req, res, next) => {
//   console.log(`[GLOBAL LOG] ${req.method} ${req.originalUrl}`);
//   next();
// });

// Aplicar logging avançado (deve vir antes de outras rotas)
app.use(requestLogger);

// Aplicar sanitização de dados para todas as rotas
app.use(sanitizeInput);
app.use(sanitizeRequest(['body', 'query', 'params']));

// 🚀 Frontend é servido pelo Vite (desenvolvimento) ou Nginx (produção)
// Backend focado apenas em APIs - Arquitetura mais limpa e performática
console.log('🎯 Backend configurado apenas para APIs - Frontend servido externamente');

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
const { getSecureJwtSecret } = require('./utils/jwtSecurity');
app.use(session({
  secret: process.env.SESSION_SECRET || getSecureJwtSecret(),
  resave: false,
  saveUninitialized: false,
  name: 'sessionId', // Nome customizado para o cookie de sessão (security by obscurity)
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true, // Prevenir acesso via JavaScript
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: 'lax' // Proteção CSRF
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
const stripeRoutes = require('./routes/stripeRoutes');

// Rotas de health check (deve vir antes de outras rotas)
app.use('/health', healthRoutes);

// Rota pública para verificação de saúde do sistema (para Docker e monitoramento)
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Rota do webhook (deve vir antes das rotas autenticadas)
app.use('/api/webhooks/evolution', webhookAuth, chatWebhookRoutes);

// Rotas específicas de mensagens e contatos - devem vir ANTES de app.use('/api', apiRoutes)
app.use('/api/messages', requireAuth, messagesRoutes);
app.use('/api/contacts', requireAuth, contactsRoutes);

// Rotas específicas do Stripe (deve vir ANTES da rota genérica /api)
app.use('/api/stripe', stripeRoutes);

// Rotas API - estas devem vir depois das rotas específicas
app.use('/api', apiRoutes);
app.use('/auth', authLimiter, authRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/whatsapp-credentials', requireAuth, whatsappCredentialRoutes);
app.use('/api/credentials', credentialsRoutes);
app.use('/api', credentialsRoutes);
app.use('/api/chat', requireAuth, chatRoutes);
app.use('/api/admin', adminRoutes);

// Novas rotas para gerenciamento de contatos e mensagens
// app.use('/api/contacts', requireAuth, contactsRoutes); // Moved up
// app.use('/api/messages', requireAuth, messagesRoutes); // Moved up

// Rotas específicas do backend com renderização de template
app.use('/admin', webRoutes.router);

// Rotas específicas de OAuth2 
// Importante: este padrão deve vir ANTES do handler do SPA React
app.get('/auth/google/callback', (req, res, next) => {
  console.log('Recebendo callback do Google em /auth/google/callback');
  return authRoutes(req, res, next);
});

// OAuth callbacks são tratados pelo nginx/frontend
// Rota 404 para qualquer coisa que não seja API
app.get('*', (req, res) => {
  // Se for uma requisição de API
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'Rota da API não encontrada'
    });
  }
  
  // Para outras requisições, informar que nginx deve tratar
  // Log reduzido para evitar spam nos logs
  if (req.path !== '/' && req.path !== '/dashboard' && req.path !== '/login') {
    console.log('Requisição não-API incomum recebida pelo backend:', req.path);
  }
  res.status(404).json({
    message: 'Backend API - Esta rota deve ser tratada pelo nginx',
    timestamp: new Date().toISOString(),
    path: req.path,
    note: 'Frontend deve ser servido pelo nginx, não pelo backend'
  });
});

// Middleware para tratamento de erros
app.use(errorLogger);
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
  
  // Backend não serve mais frontend - Nginx cuida disso
  
  // Responder com página de erro para requisições web (apenas admin)
  res.status(err.statusCode || 500).render('error', {
    title: 'Erro',
    message: err.message || 'Ocorreu um erro inesperado',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Exportar o aplicativo Express
module.exports = app;