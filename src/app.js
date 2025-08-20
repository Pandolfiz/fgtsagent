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
const session = require('express-session');
const flash = require('connect-flash');
const config = require('./config');
const userApiKeyMiddleware = require('./middleware/userApiKeyMiddleware');
const { requireAuth } = require('./middleware/auth');
const { refreshTokens, applyRefreshedTokens } = require('./middleware/tokenRefresh');
const { 
  monitorLoginAttempts, 
  monitorDataAccess, 
  monitorFinancialTransactions, 
  detectSuspiciousActivity, 
  rateLimiter, 
  securityHeaders, 
  sanitizeInput 
} = require('./middleware/securityMiddleware');
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

// Configurar limites de requisição com estratégia híbrida (Rate + Speed Limiting)
// Rate Limiting: Limite alto para proteção contra ataques massivos
// Speed Limiting: Desaceleração gradual para melhor UX

// Rate Limiting Global (limite alto para proteção)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5000 // Aumentado para 5000 requisições (proteção contra ataques massivos)
});

// Rate Limiting para APIs (limite alto)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3000 // Aumentado para 3000 requisições
});

// Rate Limiting para autenticação (limite moderado)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // Aumentado para 100 tentativas (proteção contra brute force)
});

// Speed Limiting Global (desaceleração gradual)
const globalSpeedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: 200, // Começar a desacelerar após 200 requisições
  delayMs: () => 100, // 100ms de atraso por requisição adicional
  maxDelayMs: 3000 // Máximo 3 segundos de atraso
});

// Speed Limiting para APIs (desaceleração moderada)
const apiSpeedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: 150, // Começar a desacelerar após 150 requisições
  delayMs: () => 200, // 200ms de atraso por requisição adicional
  maxDelayMs: 5000 // Máximo 5 segundos de atraso
});

// Speed Limiting para autenticação (desaceleração agressiva)
const authSpeedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: 10, // Começar a desacelerar após 10 tentativas
  delayMs: () => 1000, // 1 segundo de atraso por tentativa adicional
  maxDelayMs: 15000 // Máximo 15 segundos de atraso
});

// Aplicar limitadores globalmente, exceto para ambientes de desenvolvimento
if (process.env.NODE_ENV !== 'development') {
  // Rate Limiting: Proteção contra ataques massivos
  app.use(generalLimiter);
  
  // Speed Limiting: Melhor UX com desaceleração gradual
  app.use(globalSpeedLimiter);
  app.use('/api', apiSpeedLimiter);
  
  logger.info('Sistema híbrido de Rate + Speed Limiting habilitado para produção');
  logger.info('Rate Limiting: Proteção contra ataques massivos');
  logger.info('Speed Limiting: Desaceleração gradual para melhor UX');
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
    // Log para debug
    //console.log(`[CORS DEBUG] Origem da requisição: ${origin}`);
    
    // Permitir requisições sem origem (ex: Postman, aplicações móveis)
    //if (!origin) {
    //  console.log(`[CORS DEBUG] Permitindo requisição sem origem`);
    //  return callback(null, true);
    //}
    
    // Lista de domínios permitidos
    const allowedOrigins = [
      // Localhost com diferentes portas
      'http://localhost:5173',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://localhost:8000',
      
      // Interfaces de rede locais (para desenvolvimento)
      'http://172.27.0.1:5173',
      'http://172.27.0.1:5173',
      'http://192.168.15.188:5173',
      'http://192.168.15.188:5173',
      'http://172.20.80.1:5173',
      'http://172.20.80.1:5173',
      
      // URLs de produção
      'https://fgtsagent.com.br',
      'https://www.fgtsagent.com.br',
      'http://fgtsagent.com.br',
      'http://www.fgtsagent.com.br',
      
      // Variáveis de ambiente
      process.env.FRONTEND_URL,
      process.env.APP_URL
    ].filter(Boolean); // Remove valores nulos ou undefined
    
    // console.log(`[CORS DEBUG] Origens permitidas:`, allowedOrigins);
    
    // Verificar se a origem da requisição está na lista
    if (!origin) {
      callback(null, true);
    } else if (
      allowedOrigins.includes(origin) ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('172.27.0.1') ||
      origin.includes('192.168.15.188') ||
      origin.includes('172.20.80.1') ||
      (origin.includes('.ngrok-free.app') || origin.includes('.ngrok.io'))
    ) {
      callback(null, true);
    } else {
      logger.warn(`[CORS] Origem rejeitada: ${origin}`);
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

// Middleware de renovação automática de tokens
app.use(refreshTokens);

// Middleware de segurança cibernética (apenas headers e detecção de atividades suspeitas)
app.use(securityHeaders);
app.use(detectSuspiciousActivity);

// Rate limiting personalizado removido - agora usando estratégia híbrida (Rate + Speed Limiting)
// Aplicado de forma mais granular nos locais específicos

// Sanitização de entrada para prevenir XSS
app.use(sanitizeInput);

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

// Log das rotas registradas para debug
console.log('Rotas registradas no app:');
app._router.stack.forEach((middleware, index) => {
  if (middleware.route) {
    console.log(`  ${middleware.route.stack[0].method.toUpperCase()} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    console.log(`  Router: ${middleware.regexp}`);
  }
});

// Rota de teste para debug
app.get('/api/teste', (req, res) => {
  console.log('Rota de teste acessada!');
  res.json({ ok: true, message: 'Rota de teste funcionando!' });
});



// Rota específica para health check do Docker (sem autenticação) - REMOVIDA (duplicada)

// Rota do webhook (deve vir antes das rotas autenticadas)
app.use('/api/webhooks/evolution', webhookAuth, chatWebhookRoutes);

// Rotas específicas de mensagens e contatos - devem vir ANTES de app.use('/api', apiRoutes)
app.use('/api/messages', requireAuth, messagesRoutes);
app.use('/api/contacts', requireAuth, contactsRoutes);

// Rotas específicas do Stripe (deve vir ANTES da rota genérica /api)
app.use('/api/stripe', stripeRoutes);

// Rota de health direta para debug (deve vir ANTES da rota genérica /api)
app.get('/api/health/direct', (req, res) => {
  console.log('Rota de health direta acessada!');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Health check direto funcionando!'
  });
});

// Rotas de health check (deve vir ANTES da rota genérica /api)
console.log('Registrando rotas de health check...');

// Rota de health simples para substituir o healthRoutes
app.get('/api/health', (req, res) => {
  console.log('Rota de health acessada!');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Health check funcionando!'
  });
});

// Rota de health cache
app.get('/api/health/cache', (req, res) => {
  console.log('Rota de health cache acessada!');
  res.json({ 
    success: true,
    cache: {
      size: 0,
      keys: [],
      totalKeys: 0
    },
    timestamp: new Date().toISOString()
  });
});

// Rota de health cache clear
app.post('/api/health/cache/clear', (req, res) => {
  console.log('Rota de health cache clear acessada!');
  res.json({ 
    success: true,
    message: 'Cache limpo completamente',
    timestamp: new Date().toISOString()
  });
});

console.log('Rotas de health check registradas com sucesso');

// Rotas API - estas devem vir DEPOIS das rotas específicas
app.use('/api', apiRoutes);

// Middleware para aplicar tokens renovados na resposta
app.use(applyRefreshedTokens);

// Rotas de autenticação com Rate + Speed Limiting
app.use('/auth', authLimiter, authSpeedLimiter, authRoutes);
app.use('/api/auth', authLimiter, authSpeedLimiter, authRoutes);
app.use('/api/whatsapp-credentials', requireAuth, whatsappCredentialRoutes);
app.use('/api/credentials', credentialsRoutes);
// REMOVIDO: app.use('/api', credentialsRoutes); // Isso sobrescrevia todas as rotas /api/*
app.use('/api/chat', requireAuth, chatRoutes);
app.use('/api/admin', adminRoutes);

// Rotas de leads
app.use('/api/leads', require('./routes/leadRoutes'));

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
    // Excluir rotas de health check do middleware de captura
    if (req.path.startsWith('/api/health')) {
      console.log('Rota de health check não encontrada, mas não deve ser capturada aqui');
      return res.status(404).json({
        success: false,
        message: 'Rota de health check não encontrada'
      });
    }
    
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

app.get('/api/teste', (req, res) => {
  res.json({ ok: true });
});

// Exportar o aplicativo Express
module.exports = app;

app.get('/api/teste', (req, res) => {
  res.json({ ok: true });
});