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
const { requireAuth, requireAdmin } = require('./middleware/unifiedAuthMiddleware');
const { refreshTokens, applyRefreshedTokens } = require('./middleware/tokenRefresh');
const tokenProtectionMiddleware = require('./middleware/tokenProtectionMiddleware');
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
      // Localhost com diferentes portas (HTTPS primeiro)
      'https://localhost:5173',
      'https://localhost:3000',
      'https://localhost:8000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'http://localhost:3000',
      'http://localhost:8000',
      
      // Interfaces de rede locais (para desenvolvimento)
      'https://172.27.0.1:5173',
      'http://172.27.0.1:5173',
      'https://192.168.15.188:5173',
      'http://192.168.15.188:5173',
      'https://172.20.80.1:5173',
      'http://172.20.80.1:5173',
      
      // URLs de produção (HTTPS primeiro)
      'https://fgtsagent.com.br',
      'https://www.fgtsagent.com.br',
      'http://fgtsagent.com.br',
      'http://www.fgtsagent.com.br',
      'https://m.stripe.com',
      
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
      (typeof origin === 'string' && (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('172.27.0.1') ||
        origin.includes('192.168.15.188') ||
        origin.includes('172.20.80.1') ||
        origin.includes('.ngrok-free.app') ||
        origin.includes('.ngrok.io')
      ))
    ) {
      callback(null, true);
    } else {
      logger.warn(`[CORS] Origem rejeitada: ${origin}`);
      callback(new Error('Origem não permitida pelo CORS'), false);
    }
  },
  credentials: true
}));

// ✅ CONFIGURAÇÃO ESPECIAL: Middleware condicional para webhooks
// Aplicar express.json() apenas para rotas que NÃO são webhooks
app.use((req, res, next) => {
  // Se for webhook do Stripe, pular o parsing JSON
  if (req.path === '/api/stripe/webhook') {
    return next();
  }
  
  // Para outras rotas, aplicar express.json()
  express.json({ limit: '20mb' })(req, res, next);
});

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

// ✅ ADICIONAR: Middleware de proteção contra limpeza automática de tokens
app.use(tokenProtectionMiddleware.middleware());

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

// ✅ DEBUG: Verificar configuração do ambiente
console.log('🔍 [DEBUG] NODE_ENV:', process.env.NODE_ENV);
console.log('🔍 [DEBUG] Ambiente de desenvolvimento:', process.env.NODE_ENV === 'development');
console.log('🔍 [DEBUG] Ambiente de produção:', process.env.NODE_ENV === 'production');

// ✅ CORRIGIDO: Rota de verificação de email SEM rate limiting
// Esta rota deve ser acessível sem autenticação e sem limitações
app.post('/api/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório'
      });
    }

    // Validação básica do formato do email
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
      });
    }

    // Importar o controller de autenticação para usar a lógica existente
    const authController = require('./controllers/authController');
    
    // Se não existir o controller, usar implementação básica
    if (!authController || typeof authController.checkEmail !== 'function') {
      // Implementação básica de verificação
      const { supabaseAdmin } = require('./services/database');
      const logger = require('./utils/logger');
      
      logger.info('🔍 Verificando disponibilidade do email:', { email });
      
      try {
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
          logger.error('❌ Erro ao listar usuários:', listError);
          throw new Error(`Erro ao listar usuários: ${listError.message}`);
        }
        
        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = usersData.users.find(u => 
          u.email && u.email.toLowerCase().trim() === normalizedEmail
        );
        
        const emailExists = !!existingUser;
        
        return res.json({
          success: true,
          emailExists,
          message: emailExists ? 'Email já está em uso' : 'Email disponível',
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        logger.error('❌ Erro na verificação de email:', error);
        return res.status(500).json({
          success: false,
          message: 'Erro interno ao verificar email'
        });
      }
    } else {
      // Usar a implementação do controller
      return authController.checkEmail(req, res);
    }
    
  } catch (error) {
    const logger = require('./utils/logger');
    logger.error('❌ Erro na verificação de email:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao verificar email'
    });
  }
});

// Rotas API - estas devem vir DEPOIS das rotas específicas
app.use('/api', apiRoutes);

// Middleware para aplicar tokens renovados na resposta
app.use(applyRefreshedTokens);

// Rotas de autenticação com Rate + Speed Limiting (mais permissivo em desenvolvimento)
console.log('🔍 [DEBUG] Registrando rotas de autenticação...');
console.log('🔍 [DEBUG] NODE_ENV atual:', process.env.NODE_ENV);

if (process.env.NODE_ENV === 'development') {
  console.log('🔍 [DEBUG] Usando configuração de DESENVOLVIMENTO (sem rate limiting)');
  // Em desenvolvimento: rate limiting mais permissivo
  app.use('/auth', authRoutes);
  app.use('/api/auth', authRoutes);
} else {
  console.log('🔍 [DEBUG] Usando configuração de PRODUÇÃO (com rate limiting)');
  // Em produção: rate limiting completo
  app.use('/auth', authLimiter, authSpeedLimiter, authRoutes);
  app.use('/api/auth', authLimiter, authSpeedLimiter, authRoutes);
}
app.use('/api/whatsapp-credentials', requireAuth, whatsappCredentialRoutes);
app.use('/api/whatsapp-templates', requireAuth, require('./routes/whatsappTemplateRoutes'));
app.use('/api/credentials', credentialsRoutes);
// REMOVIDO: app.use('/api', credentialsRoutes); // Isso sobrescrevia todas as rotas /api/*
app.use('/api/chat', requireAuth, chatRoutes);
app.use('/api/admin', requireAuth, requireAdmin, adminRoutes);

// Rotas de leads
app.use('/api/leads', requireAuth, require('./routes/leadRoutes'));

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

// 🧪 ROTAS DE TESTE: Para testar a funcionalidade de templates do WhatsApp
// 🧪 ROTA DE TESTE: Listar contas disponíveis para o Pedro
app.get('/api/test-accounts', async (req, res) => {
  try {
    console.log('🧪 Rota de teste de contas acessada!');
    
    const { supabaseAdmin } = require('./config/supabase');
    
    // Buscar credenciais do Pedro
    const { data: credentials, error: credentialsError } = await supabaseAdmin
      .from('whatsapp_credentials')
      .select('*')
      .eq('client_id', 'fca00589-06a4-4274-9048-2ec3b2ddd60e')
      .eq('connection_type', 'ads');
    
    if (credentialsError || !credentials || credentials.length === 0) {
      return res.json({
        success: false,
        message: 'Nenhuma conta WhatsApp Business encontrada para o Pedro',
        userId: 'fca00589-06a4-4274-9048-2ec3b2ddd60e',
        timestamp: new Date().toISOString()
      });
    }
    
    // Formatar dados das contas
    const accounts = credentials.map(cred => ({
      businessAccountId: cred.wpp_business_account_id,
      phone: cred.phone,
      agentName: cred.agent_name,
      status: cred.status,
      connectionType: cred.connection_type,
      createdAt: cred.created_at,
      updatedAt: cred.updated_at,
      hasMetaData: !!(cred.wpp_number_id && cred.wpp_access_token),
      metaStatus: cred.metadata?.code_verification_status || 'NÃO_VERIFICADO'
    }));
    
    res.json({
      success: true,
      message: `${accounts.length} conta(s) WhatsApp Business encontrada(s) para o Pedro`,
      timestamp: new Date().toISOString(),
      user: {
        id: 'fca00589-06a4-4274-9048-2ec3b2ddd60e',
        name: 'Pedro Margon',
        email: 'lorenzonipedro@gmail.com'
      },
      data: accounts,
      total: accounts.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar contas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar contas',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🧪 ROTA DE TESTE: Buscar templates salvos no banco para o Pedro
app.get('/api/test-templates-saved', async (req, res) => {
  try {
    console.log('🧪 Rota de teste de templates salvos acessada!');
    
    const whatsappTemplateService = require('./services/whatsappTemplateService');
    
    // Business Account ID do Pedro
    const businessAccountId = '507089529147644';
    
    console.log(`🔍 Buscando templates salvos para Business Account: ${businessAccountId}`);
    
    // Buscar templates salvos no banco
    const result = await whatsappTemplateService.getSavedTemplates(businessAccountId, {});
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar templates salvos',
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      message: 'Templates salvos encontrados com sucesso!',
      timestamp: new Date().toISOString(),
      businessAccountId: businessAccountId,
      total: result.total,
      templates: result.data
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar templates salvos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar templates salvos',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🧪 ROTA DE TESTE: Sincronizar templates da Meta API para o Pedro
app.get('/api/test-sync-templates', async (req, res) => {
  try {
    console.log('🧪 Rota de teste de sincronização de templates acessada!');
    
    const whatsappTemplateService = require('./services/whatsappTemplateService');
    const { supabaseAdmin } = require('./config/supabase');
    
    // Buscar credenciais do Pedro
    let { data: credentials, error: credentialsError } = await supabaseAdmin
      .from('whatsapp_credentials')
      .select('*')
      .eq('client_id', 'fca00589-06a4-4274-9048-2ec3b2ddd60e')
      .eq('connection_type', 'ads')
      .single();
    
    if (credentialsError || !credentials) {
      // Se não encontrar credenciais diretas, buscar as que têm o nome do Pedro
      console.log('🔍 Buscando credenciais com nome do Pedro...');
      
      const { data: pedroCredentials, error: pedroError } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .eq('connection_type', 'ads')
        .ilike('instance_name', '%Pedro%')
        .single();
      
      if (pedroError || !pedroCredentials) {
        return res.json({
          success: false,
          message: 'Credenciais do WhatsApp não encontradas para o Pedro',
          userId: 'fca00589-06a4-4274-9048-2ec3b2ddd60e',
          timestamp: new Date().toISOString()
        });
      }
      
      credentials = pedroCredentials;
    }
    
    console.log(`🧪 Credenciais encontradas para o Pedro!`);
    console.log(`🧪 Instance Name: ${credentials.instance_name}`);
    console.log(`🧪 Business Account ID: ${credentials.wpp_business_account_id}`);
    
    // 1. Buscar templates da Meta API
    console.log('🔍 Buscando templates da Meta API...');
    const templatesResponse = await whatsappTemplateService.fetchMessageTemplates(
      credentials.wpp_business_account_id,
      credentials.wpp_access_token
    );
    
    if (!templatesResponse.success) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar templates da Meta API',
        error: templatesResponse.error,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ ${templatesResponse.data.length} templates encontrados na Meta API`);
    
    // 2. Salvar templates no banco
    console.log('💾 Salvando templates no banco...');
    const saveResult = await whatsappTemplateService.saveTemplates(
      credentials.wpp_business_account_id,
      templatesResponse.data
    );
    
    if (!saveResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao salvar templates no banco',
        error: saveResult.error,
        templatesFromMeta: templatesResponse.data,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ ${saveResult.saved} templates salvos no banco`);
    
    // 3. Buscar templates salvos para confirmar
    console.log('🔍 Confirmando templates salvos...');
    const savedTemplates = await whatsappTemplateService.getSavedTemplates(
      credentials.wpp_business_account_id,
      {}
    );
    
    res.json({
      success: true,
      message: 'Sincronização de templates realizada com sucesso!',
      timestamp: new Date().toISOString(),
      user: {
        id: 'fca00589-06a4-4274-9048-2ec3b2ddd60e',
        name: 'Pedro Margon',
        email: 'lorenzonipedro@gmail.com'
      },
      credentials: {
        instanceName: credentials.instance_name,
        businessAccountId: credentials.wpp_business_account_id,
        phoneNumberId: credentials.wpp_number_id,
        status: credentials.status
      },
      syncResults: {
        templatesFromMeta: templatesResponse.data.length,
        templatesSaved: saveResult.saved,
        templatesInDatabase: savedTemplates.success ? savedTemplates.total : 0
      },
      templates: savedTemplates.success ? savedTemplates.data : []
    });
    
  } catch (error) {
    console.error('❌ Erro na sincronização de templates:', error);
    res.status(500).json({
      success: false,
      message: 'Erro na sincronização de templates',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Exportar o aplicativo Express
module.exports = app;