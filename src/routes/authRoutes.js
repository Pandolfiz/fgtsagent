// Rotas de autenticação
const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validationMiddleware');
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../services/database');
const logger = require('../utils/logger');
const authService = require('../services/auth');

// Verificar se todas as funções necessárias existem no controller
const ensureFunctionExists = (controller, fnName, defaultFn) => {
  if (typeof controller[fnName] !== 'function') {
    console.log(`AVISO: Função ${fnName} não encontrada no controller de autenticação. Usando implementação padrão.`);
    controller[fnName] = defaultFn;
  }
};

// Verificar funções de renderização
ensureFunctionExists(authController, 'renderLogin', (req, res) => {
  res.render('auth/login', { title: 'Login' });
});

ensureFunctionExists(authController, 'renderSignup', (req, res) => {
  res.render('auth/signup', { title: 'Cadastro' });
});

// Verificar funções de API
ensureFunctionExists(authController, 'register', (req, res) => {
  res.status(501).json({ success: false, message: 'Função de registro não implementada' });
});

ensureFunctionExists(authController, 'login', (req, res) => {
  res.status(501).json({ success: false, message: 'Função de login não implementada' });
});

ensureFunctionExists(authController, 'logout', (req, res) => {
  res.status(200).json({ success: true, message: 'Logout realizado' });
});

ensureFunctionExists(authController, 'requestPasswordReset', (req, res) => {
  res.status(501).json({ success: false, message: 'Função de recuperação de senha não implementada' });
});

ensureFunctionExists(authController, 'confirmPasswordReset', (req, res) => {
  res.status(501).json({ success: false, message: 'Função de confirmação de senha não implementada' });
});

ensureFunctionExists(authController, 'getMe', (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

ensureFunctionExists(authController, 'updateCurrentUser', (req, res) => {
  res.status(501).json({ success: false, message: 'Função de atualização de usuário não implementada' });
});

ensureFunctionExists(authController, 'resendConfirmationEmail', (req, res) => {
  res.status(501).json({ success: false, message: 'Função de reenvio de email de confirmação não implementada' });
});

// Verificar a função createSession
ensureFunctionExists(authController, 'createSession', (req, res) => {
  res.status(501).json({ success: false, message: 'Função de criação de sessão administrativa não implementada' });
});

// Verificar a função verifyToken
ensureFunctionExists(authController, 'verifyToken', (req, res) => {
  res.status(501).json({ success: false, message: 'Função de verificação de token não implementada' });
});

// Função para atualizar o token
const refreshToken = async (req, res) => {
  try {
    // Verificar se existe um token antigo
    const oldToken = req.cookies['supabase-auth-token'] || req.headers['authorization']?.split(' ')[1];
    
    if (!oldToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token não encontrado' 
      });
    }
    
    try {
      // Tentar atualizar o token usando o Supabase
      const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: oldToken });
      
      if (error) throw error;
      
      const token = data.session.access_token;
      const user = data.user;
      
      // Definir o novo token no cookie
      res.cookie('supabase-auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7 * 1000 // 7 dias
      });
      
      return res.status(200).json({
        success: true,
        data: {
          user,
          token
        }
      });
    } catch (refreshError) {
      logger.warn('Erro ao atualizar token, tentando criar nova sessão admin:', refreshError);
      
      try {
        // Se não conseguir atualizar, tentar extrair o ID do usuário do token antigo
        const payload = JSON.parse(Buffer.from(oldToken.split('.')[1], 'base64').toString('utf-8'));
        const userId = payload.sub;
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'Token inválido'
          });
        }
        
        // Criar nova sessão usando o método admin
        const sessionData = await authService.createAdminSessionViaApi(userId);
        
        // Definir cookie seguro com o token
        res.cookie('supabase-auth-token', sessionData.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: sessionData.expires_in * 1000,
          sameSite: 'strict'
        });
        
        return res.status(200).json({
          success: true,
          data: {
            user: sessionData.user,
            token: sessionData.access_token
          }
        });
      } catch (error) {
        logger.error('Erro ao criar nova sessão admin:', error);
        
        // Se o erro for de chave duplicada, podemos ignorar
        // e tentar recuperar os dados do usuário existente
        if (error.message && error.message.includes('duplicate key')) {
          try {
            logger.info(`Perfil já existe para o usuário ${userId}, tentando criar sessão novamente`);
            
            // Criar sessão diretamente
            const sessionData = await authService.createAdminSession(userId);
            
            // Definir cookie seguro com o token
            res.cookie('supabase-auth-token', sessionData.access_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              maxAge: sessionData.expires_in * 1000,
              sameSite: 'strict'
            });
            
            return res.status(200).json({
              success: true,
              data: {
                user: sessionData.user,
                token: sessionData.access_token
              }
            });
          } catch (retryError) {
            logger.error('Falha na segunda tentativa de criar sessão:', retryError);
          }
        }
        
        return res.status(401).json({
          success: false,
          message: 'Falha na autenticação'
        });
      }
    }
  } catch (error) {
    logger.error('Erro no refresh token:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

const router = express.Router();

// Rotas de renderização (páginas web)
router.get('/login', authController.renderLogin);
router.get('/signup', authController.renderSignup);

// Rotas de autenticação OAuth2 do Google
router.get('/login/google', authController.redirectToGoogleAuth);
router.get('/google/callback', authController.handleGoogleCallback);
router.post('/api/auth/google/token', authController.loginWithGoogleToken);

// API de autenticação
router.post('/register', validate(schemas.register), authController.register);
router.post('/login', validate(schemas.login), authController.login);
router.post('/logout', requireAuth, authController.logout);
router.post('/reset-password', validate(schemas.resetPassword), authController.requestPasswordReset);
router.post('/reset-password/confirm', validate(schemas.confirmResetPassword), authController.confirmPasswordReset);
router.post('/resend-confirmation', validate(schemas.resetPassword), authController.resendConfirmationEmail);
router.get('/me', requireAuth, authController.getMe);
router.put('/me', requireAuth, validate(schemas.updateProfile), authController.updateCurrentUser);
router.post('/refresh-token', refreshToken);

// Rotas administrativas
router.post('/admin/verify-token', requireAuth, requireAdmin, authController.verifyToken);

// Endpoint admin para criar sessões com a API Admin
router.post('/admin/create-session', requireAuth, requireAdmin, authController.createSession);

// Rota alternativa para API REST
router.post('/api/auth/create-session', requireAuth, requireAdmin, authController.createSession);

/**
 * Cria uma sessão para um usuário (admin somente)
 */
router.post('/api/auth/session', requireAuth, async (req, res) => {
  try {
    // Verificar se o usuário é admin
    if (!req.user || !req.user.app_metadata || !req.user.app_metadata.roles || 
        !req.user.app_metadata.roles.includes('admin')) {
      return res.status(403).json({ 
        error: 'Acesso negado. Somente administradores podem criar sessões.' 
      });
    }

    const { userId, expiresIn = 3600 } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'ID do usuário é obrigatório' 
      });
    }

    const authService = await getAuthServiceInstance();
    const result = await authService.createAdminSessionViaApi(userId, expiresIn);
    
    // Configurar o cookie com o token
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn * 1000
    };
    
    res.cookie('token', result.access_token, cookieOptions);
    
    return res.json({
      success: true,
      data: {
        user: result.user,
        session: {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          expires_in: result.expires_in,
          expires_at: result.expires_at
        }
      }
    });
  } catch (error) {
    logger.error(`Erro ao criar sessão: ${error.message}`);
    return res.status(500).json({ 
      error: `Não foi possível criar a sessão: ${error.message}` 
    });
  }
});

// Rota de diagnóstico para ambientes de desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  router.get('/admin/test-session-creation', requireAuth, async (req, res) => {
    try {
      logger.info('Testando criação de sessão (somente ambiente de desenvolvimento)');
      
      // Teste de criação de sessão com o próprio usuário logado
      const userId = req.user.id;
      const result = await authService.createAdminSessionViaApi(userId, 600); // 10 minutos
      
      return res.status(200).json({
        success: true,
        message: 'Teste de criação de sessão concluído com sucesso',
        session: result
      });
    } catch (error) {
      logger.error(`Erro durante teste de criação de sessão: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: `Erro no teste de criação de sessão: ${error.message}`,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Rota específica para testar a implementação da função createSession no controller
  router.get('/admin/test-controller-session', requireAuth, requireAdmin, async (req, res) => {
    try {
      logger.info('Testando createSession no controller (somente ambiente de desenvolvimento)');
      
      // Simular uma requisição para o controller
      const mockReq = {
        user: req.user,
        body: {
          userId: req.user.id,
          expiresIn: 600 // 10 minutos
        }
      };
      
      // Chamar o controller diretamente
      return authController.createSession(mockReq, res);
    } catch (error) {
      logger.error(`Erro durante teste do controller createSession: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: `Erro no teste do controller: ${error.message}`,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
  
  // Rota para diagnóstico detalhado de permissões e configurações da tabela auth.sessions
  router.get('/admin/diagnose-session-table', requireAuth, requireAdmin, async (req, res) => {
    try {
      logger.info('Executando diagnóstico da tabela auth.sessions...');
      
      // Verificar permissões na tabela sessions
      const results = {
        tableInfo: null,
        insertTest: null,
        schemaCheck: null,
        databaseVersion: null,
        userPermissions: null,
        directSql: null
      };
      
      // 1. Verificar informações da tabela
      try {
        const { data, error } = await supabaseAdmin
          .from('sessions')
          .select('count')
          .limit(1);
          
        results.tableInfo = {
          success: !error,
          message: error ? error.message : 'Acesso à tabela bem-sucedido',
          data: data
        };
      } catch (e) {
        results.tableInfo = {
          success: false,
          message: e.message,
          error: e
        };
      }
      
      // 2. Verificar schema
      try {
        const { data, error } = await supabaseAdmin
          .from('sessions')
          .schema('auth')
          .select('count')
          .limit(1);
          
        results.schemaCheck = {
          success: !error,
          message: error ? error.message : 'Acesso ao schema auth bem-sucedido',
          data: data
        };
      } catch (e) {
        results.schemaCheck = {
          success: false,
          message: e.message,
          error: e
        };
      }
      
      // 3. Teste de criação de sessão sem inserir na tabela
      const sessionData = {
        test_data: true,
        userId: req.user.id,
        jwtSecret: process.env.SUPABASE_JWT_SECRET ? 'Configurado' : 'Não configurado'
      };
      
      return res.status(200).json({
        success: true,
        message: 'Diagnóstico da tabela auth.sessions concluído',
        results,
        sessionData
      });
    } catch (error) {
      logger.error(`Erro durante diagnóstico: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: `Erro durante diagnóstico: ${error.message}`,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
}

// Rota de diagnóstico de autenticação
router.get('/auth-diagnostics', (req, res) => {
  const cookies = req.cookies || {};
  const headers = req.headers;
  const userAgent = headers['user-agent'];
  const host = headers.host;
  
  // Verificar se há tokens nos cookies
  const hasAuthToken = 'supabase-auth-token' in cookies || 'authToken' in cookies || 'js-auth-token' in cookies;
  const hasRefreshToken = 'supabase-refresh-token' in cookies || 'refreshToken' in cookies;
  
  // Verificar se há token no localStorage (isso será verificado no lado do cliente)
  
  // Verificar se estamos em ambiente de desenvolvimento
  const environment = process.env.NODE_ENV || 'development';
  
  // Verificar se estamos em um ambiente ngrok
  const isNgrok = host && host.includes('ngrok');
  
  // Verificar configurações do Supabase
  const supabaseUrl = process.env.SUPABASE_URL || 'Não definido';
  const hasSuperToken = !!process.env.SERVICE_ROLE_KEY;
  
  // Obter URL base da aplicação
  const protocol = req.protocol;
  const appUrl = process.env.APP_URL || `${protocol}://${host}`;
  
  // Se há token de autenticação, tentar obter informações do usuário
  let userInfo = null;
  let tokenValidity = null;
  
  // Construir os dados de diagnóstico
  const diagnosticData = {
    environment,
    isNgrok,
    appUrl,
    host,
    cookies: Object.keys(cookies),
    hasAuthToken,
    hasRefreshToken,
    userAgent,
    supabaseUrl,
    hasSuperToken,
    date: new Date().toISOString(),
    userInfo,
    tokenValidity
  };
  
  // Renderizar a resposta como JSON e também como HTML para fácil visualização
  const htmlOutput = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Diagnóstico de Autenticação</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
        h1 { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        h2 { color: #3498db; margin-top: 30px; }
        .container { max-width: 900px; margin: 0 auto; }
        .card { background: #fff; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-bottom: 20px; overflow: hidden; }
        .card-header { background: #f8f9fa; padding: 15px 20px; border-bottom: 1px solid #eee; }
        .card-body { padding: 20px; }
        .status { padding: 5px 10px; border-radius: 3px; font-size: 14px; font-weight: bold; display: inline-block; margin: 5px 0; }
        .status.success { background: #d4edda; color: #155724; }
        .status.warning { background: #fff3cd; color: #856404; }
        .status.error { background: #f8d7da; color: #721c24; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        table, th, td { border: 1px solid #ddd; }
        th { background: #f8f9fa; padding: 10px; text-align: left; }
        td { padding: 10px; }
        code { background: #f8f9fa; padding: 2px 5px; border-radius: 3px; font-family: monospace; font-size: 14px; color: #e74c3c; }
        .alert { padding: 15px; border-radius: 4px; margin: 15px 0; }
        .alert-danger { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .alert-warning { background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; }
        .alert-success { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .btn { display: inline-block; font-weight: 400; text-align: center; white-space: nowrap; vertical-align: middle; user-select: none; border: 1px solid transparent; padding: .375rem .75rem; font-size: 1rem; line-height: 1.5; border-radius: .25rem; transition: color .15s ease-in-out,background-color .15s ease-in-out,border-color .15s ease-in-out,box-shadow .15s ease-in-out; text-decoration: none; }
        .btn-primary { color: #fff; background-color: #3498db; border-color: #3498db; }
        .btn-danger { color: #fff; background-color: #e74c3c; border-color: #e74c3c; }
        .btn-success { color: #fff; background-color: #2ecc71; border-color: #2ecc71; }
        #localStorageContent { background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 10px; display: none; }
        .actions { margin-top: 20px; display: flex; gap: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Diagnóstico de Autenticação</h1>
        
        <div class="card">
          <div class="card-header">
            <h2 style="margin: 0;">Status da Autenticação</h2>
          </div>
          <div class="card-body">
            <div class="${hasAuthToken ? 'status success' : 'status error'}">
              ${hasAuthToken ? 'Token de autenticação encontrado' : 'Token de autenticação não encontrado'}
            </div>
            <div class="${hasRefreshToken ? 'status success' : 'status warning'}">
              ${hasRefreshToken ? 'Token de atualização encontrado' : 'Token de atualização não encontrado'}
            </div>
            
            <div id="localStorageStatus" class="status warning">
              Verificando localStorage...
            </div>
            
            <div class="alert ${hasAuthToken ? 'alert-success' : 'alert-danger'}">
              <strong>${hasAuthToken ? 'Autenticado!' : 'Não autenticado'}</strong>
              <p>${hasAuthToken 
                ? 'Seus cookies de autenticação foram encontrados. Você está autenticado.' 
                : 'Não foram encontrados cookies de autenticação. Você precisa fazer login novamente.'}
              </p>
            </div>
            
            <div class="actions">
              <a href="/auth/login" class="btn btn-primary">Ir para Login</a>
              <a href="/dashboard" class="btn btn-success">Ir para Dashboard</a>
              <a href="/auth/test-auth" class="btn btn-primary">Testar Autenticação</a>
              <button onclick="clearAuthData()" class="btn btn-danger">Limpar Dados de Autenticação</button>
            </div>
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h2 style="margin: 0;">Ambiente</h2>
          </div>
          <div class="card-body">
            <table>
              <tr>
                <th>Variável</th>
                <th>Valor</th>
              </tr>
              <tr>
                <td>Ambiente</td>
                <td><code>${environment}</code></td>
              </tr>
              <tr>
                <td>Usando ngrok</td>
                <td><code>${isNgrok}</code></td>
              </tr>
              <tr>
                <td>Host</td>
                <td><code>${host}</code></td>
              </tr>
              <tr>
                <td>URL da Aplicação</td>
                <td><code>${appUrl}</code></td>
              </tr>
              <tr>
                <td>URL do Supabase</td>
                <td><code>${supabaseUrl}</code></td>
              </tr>
              <tr>
                <td>Token de Serviço Configurado</td>
                <td><code>${hasSuperToken}</code></td>
              </tr>
              <tr>
                <td>Data/Hora</td>
                <td><code>${new Date().toISOString()}</code></td>
              </tr>
            </table>
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h2 style="margin: 0;">Cookies</h2>
          </div>
          <div class="card-body">
            ${Object.keys(cookies).length > 0 
              ? `<table>
                  <tr>
                    <th>Nome</th>
                    <th>Presente</th>
                  </tr>
                  ${Object.keys(cookies).map(cookie => 
                    `<tr>
                      <td>${cookie}</td>
                      <td>✅</td>
                    </tr>`
                  ).join('')}
                </table>`
              : '<div class="alert alert-warning">Nenhum cookie encontrado</div>'
            }
            
            <div>
              <h3>Cookies de Autenticação</h3>
              <ul>
                <li>supabase-auth-token: ${cookies['supabase-auth-token'] ? '✅ Presente' : '❌ Ausente'}</li>
                <li>authToken: ${cookies['authToken'] ? '✅ Presente' : '❌ Ausente'}</li>
                <li>js-auth-token: ${cookies['js-auth-token'] ? '✅ Presente' : '❌ Ausente'}</li>
                <li>supabase-refresh-token: ${cookies['supabase-refresh-token'] ? '✅ Presente' : '❌ Ausente'}</li>
                <li>refreshToken: ${cookies['refreshToken'] ? '✅ Presente' : '❌ Ausente'}</li>
                <li>auth-test-cookie: ${cookies['auth-test-cookie'] ? '✅ Presente' : '❌ Ausente'}</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h2 style="margin: 0;">Armazenamento Local</h2>
          </div>
          <div class="card-body">
            <button onclick="checkLocalStorage()" class="btn btn-primary">Verificar localStorage</button>
            <div id="localStorageContent"></div>
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h2 style="margin: 0;">Informações Completas</h2>
          </div>
          <div class="card-body">
            <pre>${JSON.stringify(diagnosticData, null, 2)}</pre>
          </div>
        </div>
      </div>
      
      <script>
        // Verificar localStorage
        function checkLocalStorage() {
          try {
            const supabaseTokens = localStorage.getItem('supabase_tokens');
            const localStorageDiv = document.getElementById('localStorageContent');
            const localStorageStatus = document.getElementById('localStorageStatus');
            
            if (supabaseTokens) {
              const tokenData = JSON.parse(supabaseTokens);
              const now = Date.now();
              const elapsed = now - tokenData.timestamp;
              const isExpired = elapsed > tokenData.expires_in * 1000;
              
              localStorageStatus.className = isExpired ? 'status warning' : 'status success';
              localStorageStatus.textContent = isExpired 
                ? 'Tokens encontrados no localStorage, mas expirados' 
                : 'Tokens válidos encontrados no localStorage';
              
              const expiryDate = new Date(tokenData.timestamp + (tokenData.expires_in * 1000));
              
              localStorageDiv.innerHTML = \`
                <div class="\${isExpired ? 'alert alert-warning' : 'alert alert-success'}">
                  <strong>\${isExpired ? 'Token Expirado' : 'Token Válido'}</strong>
                  <p>Tempo decorrido: \${Math.round(elapsed/1000)} segundos</p>
                  <p>Expira em: \${expiryDate.toLocaleString()}</p>
                </div>
                <pre>\${JSON.stringify(tokenData, null, 2)}</pre>
              \`;
            } else {
              localStorageStatus.className = 'status error';
              localStorageStatus.textContent = 'Nenhum token encontrado no localStorage';
              
              localStorageDiv.innerHTML = '<div class="alert alert-danger">Nenhum token encontrado no localStorage</div>';
            }
            
            localStorageDiv.style.display = 'block';
          } catch (error) {
            console.error('Erro ao verificar localStorage:', error);
            const localStorageStatus = document.getElementById('localStorageStatus');
            localStorageStatus.className = 'status error';
            localStorageStatus.textContent = 'Erro ao verificar localStorage: ' + error.message;
            
            document.getElementById('localStorageContent').innerHTML = 
              '<div class="alert alert-danger">Erro ao acessar localStorage: ' + error.message + '</div>';
            document.getElementById('localStorageContent').style.display = 'block';
          }
        }
        
        // Limpar dados de autenticação
        function clearAuthData() {
          try {
            // Limpar localStorage
            localStorage.removeItem('supabase_tokens');
            
            // Limpar cookies (via expiração)
            const cookies = ['supabase-auth-token', 'authToken', 'js-auth-token', 
                            'supabase-refresh-token', 'refreshToken', 'auth-test-cookie'];
            
            cookies.forEach(cookie => {
              document.cookie = cookie + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            });
            
            alert('Dados de autenticação limpos com sucesso! A página será recarregada.');
            window.location.reload();
          } catch (error) {
            console.error('Erro ao limpar dados:', error);
            alert('Erro ao limpar dados: ' + error.message);
          }
        }
      </script>
    </body>
    </html>
  `;
  
  // Enviar HTML
  res.send(htmlOutput);
});

// Rota para testar a autenticação e validar tokens
router.get('/test-auth', async (req, res) => {
  try {
    logger.info('Executando teste de autenticação');
    
    // Extrair token do cookie ou cabeçalho
    let token = null;
    
    if (req.cookies && req.cookies['supabase-auth-token']) {
      token = req.cookies['supabase-auth-token'];
      logger.info('Token encontrado no cookie');
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
      logger.info('Token encontrado no cabeçalho de autorização');
    }
    
    if (!token) {
      return res.render('auth/test-auth', {
        title: 'Teste de Autenticação',
        isAuthenticated: false,
        error: 'Nenhum token encontrado. Faça login antes de testar.'
      });
    }
    
    // Verificar token com Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error) {
      logger.error(`Erro ao verificar token: ${error.message}`);
      return res.render('auth/test-auth', {
        title: 'Teste de Autenticação',
        isAuthenticated: false,
        error: `Erro ao verificar token: ${error.message}`
      });
    }
    
    if (!data || !data.user) {
      logger.error('Token válido, mas sem dados de usuário');
      return res.render('auth/test-auth', {
        title: 'Teste de Autenticação',
        isAuthenticated: false,
        error: 'Token válido, mas sem dados de usuário'
      });
    }
    
    // Obter dados do perfil do usuário
    const userId = data.user.id;
    let profileData = null;
    
    try {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (!profileError && profile) {
        profileData = profile;
        logger.info(`Perfil encontrado para o usuário ${userId}`);
      }
    } catch (profileErr) {
      logger.warn(`Erro ao buscar perfil do usuário: ${profileErr.message}`);
    }
    
    // Exibir informações na página
    return res.render('auth/test-auth', {
      title: 'Teste de Autenticação',
      isAuthenticated: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        metadata: data.user.user_metadata || {},
        appMetadata: data.user.app_metadata || {},
        createdAt: data.user.created_at,
        profile: profileData
      },
      token: {
        value: token.substring(0, 15) + '...',
        expiresAt: null // Não podemos extrair isso facilmente sem decodificar o JWT
      }
    });
  } catch (error) {
    logger.error(`Erro no teste de autenticação: ${error.message}`);
    return res.render('auth/test-auth', {
      title: 'Teste de Autenticação',
      isAuthenticated: false,
      error: `Erro inesperado: ${error.message}`
    });
  }
});

/**
 * Endpoint para trocar código de autorização por token (usado no OAuth2)
 * Este endpoint segue a recomendação da documentação do Supabase para o fluxo PKCE
 */
router.post('/exchange-code', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Código de autorização é obrigatório'
      });
    }
    
    console.log('Recebendo solicitação para trocar código por sessão:', code.substring(0, 10) + '...');
    
    // Trocar o código por sessão através do Supabase
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Erro ao trocar código por sessão:', error.message);
      return res.status(400).json({
        success: false,
        message: 'Erro ao trocar código: ' + error.message
      });
    }
    
    if (!data?.session) {
      return res.status(400).json({
        success: false,
        message: 'Sessão não retornada pelo Supabase'
      });
    }
    
    console.log('Código trocado por sessão com sucesso. Usuário:', data.user?.email);
    
    // Configurar cookie com token de autenticação
    res.cookie('supabase-auth-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    });
    
    // Retornar informações de sessão para o cliente
    return res.status(200).json({
      success: true,
      message: 'Autenticação bem-sucedida',
      data: {
        user: {
          id: data.user.id,
          email: data.user.email
        },
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at
        }
      }
    });
  } catch (err) {
    console.error('Erro no endpoint exchange-code:', err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor: ' + err.message
    });
  }
});

/**
 * Endpoint para verificar se um token é válido
 */
router.post('/verify-token', async (req, res) => {
  try {
    // Obter o token de autenticação
    let token;

    // Verificar nos cabeçalhos
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } 
    // Verificar nos cookies
    else if (req.cookies && (req.cookies.authToken || req.cookies['supabase-auth-token'])) {
      token = req.cookies.authToken || req.cookies['supabase-auth-token'];
    }
    // Verificar no corpo da requisição
    else if (req.body && req.body.token) {
      token = req.body.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido'
      });
    }

    // Verificar o token com o Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error) {
      logger.warn(`Token inválido: ${error.message}`);
      return res.status(401).json({
        success: false,
        message: `Token inválido: ${error.message}`
      });
    }
    
    if (!data || !data.user) {
      logger.warn('Token validado sem dados de usuário');
      return res.status(401).json({
        success: false,
        message: 'Token validado sem dados de usuário'
      });
    }
    
    // Definir o cookie com o token validado
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      sameSite: 'lax'
    });
    
    // Retornar sucesso com informações do usuário
    return res.status(200).json({
      success: true,
      message: 'Token válido',
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.app_metadata?.role || 'user'
      }
    });
  } catch (error) {
    logger.error(`Erro ao verificar token: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro ao verificar token'
    });
  }
});

module.exports = router;