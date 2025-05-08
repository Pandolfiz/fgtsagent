// Rotas de autenticação
const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validationMiddleware');
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../services/database');
const logger = require('../utils/logger');
const authService = require('../services/auth');
const { google } = require('googleapis');

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

// API de autenticação
router.post('/register', validateRequest(schemas.signup), authController.register);
router.post('/login', validateRequest(schemas.login), authController.login);
router.post('/logout', requireAuth, authController.logout);
router.post('/reset-password', validateRequest(schemas.resetPassword), authController.requestPasswordReset);
router.post('/reset-password/confirm', validateRequest(schemas.resetPasswordConfirm), authController.confirmPasswordReset);
router.post('/resend-confirmation', validateRequest({ email: { required: true, type: 'string', isEmail: true } }), authController.resendConfirmationEmail);
router.get('/me', requireAuth, authController.getMe);
router.put('/me', requireAuth, validateRequest({
  firstName: { required: false, type: 'string', minLength: 2, maxLength: 50 },
  lastName: { required: false, type: 'string', minLength: 2, maxLength: 50 },
  avatarUrl: { required: false, type: 'string' }
}), authController.updateCurrentUser);
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

// Rota para lidar com o callback do OAuth2 do Google
router.get('/callback', async (req, res) => {
  try {
    logger.info('Recebendo callback OAuth2 do Google');
    logger.info(`Query params recebidos: ${JSON.stringify(req.query)}`);
    
    const { code, state, error } = req.query;
    
    // Verificar se houve erro
    if (error) {
      logger.error(`Erro no callback OAuth2: ${error}`);
      return res.send(`
        <html>
          <head><title>Erro na Autenticação</title></head>
          <body>
            <h2>Erro na Autenticação</h2>
            <p>${error}</p>
            <script>
              // Notificar a janela principal sobre o erro
              if (window.opener) {
                window.opener.postMessage({
                  type: 'oauth2-callback',
                  success: false,
                  error: ${JSON.stringify(error)},
                  message: 'Autenticação cancelada ou falhou'
                }, '*');
                
                // Fechar a janela após um tempo
                setTimeout(() => window.close(), 3000);
              } else {
                // Se não houver janela pai, redirecionar
                window.location.href = '/login?error=auth_failed';
              }
            </script>
          </body>
        </html>
      `);
    }
    
    // Verificar se temos o código
    if (!code) {
      logger.error('Código de autorização não recebido no callback OAuth2');
      return res.status(400).send(`
        <html>
          <head><title>Erro na Autenticação</title></head>
          <body>
            <h2>Erro na Autenticação</h2>
            <p>Código de autorização necessário não recebido</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'oauth2-callback',
                  success: false,
                  error: 'missing_code',
                  message: 'Código de autorização não recebido'
                }, '*');
                setTimeout(() => window.close(), 3000);
              } else {
                window.location.href = '/login?error=missing_code';
              }
            </script>
          </body>
        </html>
      `);
    }
    
    // Decodificar o state para obter informações adicionais (se disponível)
    let stateData = {};
    if (state) {
      try {
        stateData = JSON.parse(state);
        logger.info(`State decodificado: ${JSON.stringify(stateData)}`);
      } catch (stateError) {
        logger.error(`Erro ao decodificar state: ${stateError.message}`);
      }
    } else {
      logger.warn('State não fornecido no callback OAuth2. Usando valores padrão.');
      // Definir valores padrão para quando o state não está disponível
      stateData = {
        provider: 'google',
        organizationId: process.env.DEFAULT_ORGANIZATION_ID || 'default_org_id',
        credentialName: `Google (Teste ${new Date().toISOString()})`
      };
    }
    
    const { provider = 'google', organizationId, credentialName } = stateData;
    
    // Processar o código de autorização do Google OAuth2
    const axios = require('axios');
    
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/auth/callback`;
    
    if (!clientId || !clientSecret) {
      logger.error('Credenciais do Google não configuradas corretamente');
      return res.status(500).send(`
        <html>
          <head><title>Erro de Configuração</title></head>
          <body>
            <h2>Erro de Configuração</h2>
            <p>Credenciais do Google não configuradas no servidor</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'oauth2-callback',
                  success: false,
                  error: 'server_config_error',
                  message: 'Configuração incorreta no servidor'
                }, '*');
                setTimeout(() => window.close(), 3000);
              } else {
                window.location.href = '/login?error=server_config';
              }
            </script>
          </body>
        </html>
      `);
    }
    
    try {
      logger.info(`Trocando código por token para provedor: ${provider}`);
      
      // Trocar o código por tokens de acesso
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      });
      
      const { access_token, refresh_token, id_token, expires_in } = tokenResponse.data;
      logger.info('Tokens OAuth2 obtidos com sucesso');
      
      // Obter informações do usuário
      const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      
      const userInfo = userInfoResponse.data;
      logger.info(`Informações do usuário Google obtidas: ${userInfo.email}`);
      
      // Se temos organizationId e o nome da credencial, salvar a credencial
      if (organizationId) {
        try {
          const credentialsService = require('../services/credentialsService');
          
          // Preparar dados da credencial
          const credentialData = {
            name: credentialName || `Google (${userInfo.email})`,
            type: 'google_oauth2',
            organization_id: organizationId,
            data: {
              access_token,
              refresh_token,
              expires_in,
              token_type: 'Bearer',
              scope: req.query.scope,
              user_info: {
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture,
                given_name: userInfo.given_name,
                family_name: userInfo.family_name,
                locale: userInfo.locale,
                sub: userInfo.sub
              }
            }
          };
          
          // Salvar a credencial
          const savedCredential = await credentialsService.saveCredential(credentialData);
          logger.info(`Credencial OAuth2 salva com ID: ${savedCredential.id}`);
          
          // Redirecionar para uma página de sucesso
          return res.send(`
            <html>
              <head><title>Autenticação Bem-sucedida</title></head>
              <body>
                <h2>Autenticação Concluída</h2>
                <p>Sua conta Google foi conectada com sucesso!</p>
                <script>
                  // Notificar a janela principal sobre o sucesso
                  if (window.opener) {
                    window.opener.postMessage({
                      type: 'oauth2-callback',
                      success: true,
                      credentialId: '${savedCredential.id}',
                      provider: 'google',
                      email: '${userInfo.email}'
                    }, '*');
                    
                    // Fechar a janela após um tempo
                    setTimeout(() => window.close(), 3000);
                  } else {
                    // Se não houver janela pai, redirecionar
                    window.location.href = '/dashboard';
                  }
                </script>
              </body>
            </html>
          `);
        } catch (credentialError) {
          logger.error(`Erro ao salvar credencial: ${credentialError.message}`);
          
          // Redirecionar para uma página de erro, mas incluir os tokens na mensagem
          // para que o desenvolvedor possa depurar
          return res.send(`
            <html>
              <head><title>Erro ao Salvar Credencial</title></head>
              <body>
                <h2>Autenticação Bem-sucedida, mas Erro ao Salvar</h2>
                <p>A autenticação com o Google foi bem-sucedida, mas ocorreu um erro ao salvar a credencial.</p>
                <p>Erro: ${credentialError.message}</p>
                
                <h3>Dados para Debug (remover em produção)</h3>
                <pre>${JSON.stringify({access_token: '***redacted***', expires_in, user: userInfo.email})}</pre>
                
                <script>
                  // Notificar a janela principal sobre o erro
                  if (window.opener) {
                    window.opener.postMessage({
                      type: 'oauth2-callback',
                      partialSuccess: true,
                      success: false,
                      error: 'credential_save_failed',
                      message: '${credentialError.message.replace(/'/g, "\\'")}',
                      userEmail: '${userInfo.email}'
                    }, '*');
                    
                    // Fechar a janela após um tempo
                    setTimeout(() => window.close(), 5000);
                  } else {
                    // Se não houver janela pai, redirecionar
                    window.location.href = '/dashboard?error=credential_save_failed';
                  }
                </script>
              </body>
            </html>
          `);
        }
      } else {
        // Apenas exibir informações de sucesso sem salvar credencial
        logger.info('Autenticação OAuth2 bem-sucedida, mas organizationId não fornecido para salvar credencial');
        
        return res.send(`
          <html>
            <head><title>Autenticação Bem-sucedida</title></head>
            <body>
              <h2>Autenticação Concluída</h2>
              <p>Sua conta Google foi autenticada com sucesso!</p>
              <p>Email: ${userInfo.email}</p>
              
              <script>
                // Notificar a janela principal
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'oauth2-callback',
                    success: true,
                    tokens: {
                      access_token: '${access_token}',
                      expires_in: ${expires_in}
                    },
                    user: {
                      email: '${userInfo.email}',
                      name: '${userInfo.name || ''}'
                    }
                  }, '*');
                  
                  // Fechar a janela após um tempo
                  setTimeout(() => window.close(), 3000);
                } else {
                  // Se não houver janela pai, redirecionar
                  window.location.href = '/dashboard';
                }
              </script>
            </body>
          </html>
        `);
      }
    } catch (error) {
      logger.error(`Erro ao processar código OAuth2: ${error.message}`);
      
      // Lidar com diferentes tipos de erros
      let errorMessage = 'Erro desconhecido ao processar autenticação';
      let errorCode = 'unknown_error';
      
      if (error.response) {
        // Erro na resposta do Google
        errorMessage = `Erro na resposta do Google: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
        errorCode = 'google_api_error';
      } else if (error.request) {
        // Sem resposta do Google
        errorMessage = 'Erro de conexão com o Google';
        errorCode = 'connection_error';
      } else {
        // Erro de código
        errorMessage = error.message;
        errorCode = 'code_error';
      }
      
      return res.status(500).send(`
        <html>
          <head><title>Erro na Autenticação</title></head>
          <body>
            <h2>Erro na Autenticação</h2>
            <p>${errorMessage}</p>
            
            <script>
              // Notificar a janela principal sobre o erro
              if (window.opener) {
                window.opener.postMessage({
                  type: 'oauth2-callback',
                  success: false,
                  error: '${errorCode}',
                  message: 'Erro ao processar código de autorização'
                }, '*');
                
                // Fechar a janela após um tempo
                setTimeout(() => window.close(), 5000);
              } else {
                // Se não houver janela pai, redirecionar
                window.location.href = '/login?error=${errorCode}';
              }
            </script>
          </body>
        </html>
      `);
    }
  } catch (error) {
    logger.error(`Erro geral no callback OAuth2: ${error.message}`);
    
    return res.status(500).send(`
      <html>
        <head><title>Erro Inesperado</title></head>
        <body>
          <h2>Erro Inesperado</h2>
          <p>${error.message}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'oauth2-callback',
                success: false,
                error: 'unexpected_error',
                message: 'Erro inesperado durante a autenticação'
              }, '*');
              setTimeout(() => window.close(), 3000);
            } else {
              window.location.href = '/login?error=unexpected';
            }
          </script>
        </body>
      </html>
    `);
  }
});

// Rota para capturar o callback com hash fragment do Supabase
router.get('/oauth2-credential/callback', (req, res) => {
  // Esta rota vai receber apenas o fragmento de hash da URL após autenticação
  // Como os parâmetros estão após # (hash fragment), eles não são enviados ao servidor
  // Precisamos usar JavaScript do lado do cliente para extraí-los
  
  logger.info('Recebendo callback OAuth2 na rota /oauth2-credential/callback');
  logger.info(`Headers do request: ${JSON.stringify(req.headers)}`);
  logger.info(`Host: ${req.headers.host}`);
  
  // Enviar uma página minimalista que processa o token e redireciona automaticamente
  return res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Redirecionando...</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background-color: #f8f9fa;
        }
        .loader {
          border: 5px solid #f3f3f3;
          border-top: 5px solid #3498db;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .container {
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="loader"></div>
        <p>Redirecionando...</p>
      </div>
      <script>
        (function() {
          // Extrair parâmetros do fragmento de hash
          const hash = window.location.hash.substring(1);
          const hashParams = hash.split('&').reduce((acc, param) => {
            const parts = param.split('=');
            if (parts.length === 2) {
              acc[parts[0]] = decodeURIComponent(parts[1]);
            }
            return acc;
          }, {});
          
          // Salvar tokens localmente como fallback
          try {
            localStorage.setItem('supabase_tokens', JSON.stringify({
              access_token: hashParams.access_token,
              refresh_token: hashParams.refresh_token,
              expires_in: hashParams.expires_in,
              timestamp: Date.now()
            }));
          } catch (e) {
            console.error('Erro ao salvar tokens localmente:', e);
          }
          
          // Enviar token para o servidor e redirecionar
          if (hashParams.access_token) {
            fetch('/auth/process-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
              },
              body: JSON.stringify(hashParams),
              credentials: 'same-origin'
            })
            .then(response => response.json())
            .then(data => {
              // Redirecionar para o dashboard imediatamente
              window.location.href = data.redirectUrl || '/dashboard';
            })
            .catch(error => {
              console.error('Erro ao processar token:', error);
              // Em caso de erro, tentar usar o token armazenado no localStorage
              // para redirecionar diretamente
              window.location.href = '/login?error=token_ausente';
            });
          } else {
            // Sem token, redirecionar para login
            window.location.href = '/login?error=token_ausente';
          }
        })();
      </script>
    </body>
    </html>
  `);
});

// Rota para processar o token enviado pelo cliente
router.post('/process-token', async (req, res) => {
  try {
    logger.info('Recebendo requisição na rota /process-token');
    logger.info(`Cookies recebidos: ${JSON.stringify(req.cookies || {})}`);
    logger.info(`Headers: ${JSON.stringify(req.headers)}`);
    
    const { access_token, refresh_token, provider_token, expires_in } = req.body;
    
    if (!access_token) {
      logger.error('Token de acesso não fornecido no request para /process-token');
      return res.status(400).json({
        success: false,
        error: 'Token não fornecido'
      });
    }
    
    logger.info(`Token recebido, expires_in: ${expires_in}`);
    
    // IMPORTANTE: Obter dados do usuário a partir do token
    let userData = null;
    try {
      const { data: userResponse, error: userError } = await supabaseAdmin.auth.getUser(access_token);
      if (userError) {
        logger.error(`Erro ao obter usuário a partir do token: ${userError.message}`);
      } else if (userResponse && userResponse.user) {
        userData = userResponse.user;
        logger.info(`Usuário obtido a partir do token: ${userData.email}`);
        
        // IMPORTANTE: Verificar e criar perfil de usuário e cliente se não existir
        const { ensureUserProfile } = require('../middleware/authMiddleware');
        if (typeof ensureUserProfile === 'function') {
          logger.info(`Iniciando verificação/criação de perfil para usuário OAuth2: ${userData.id}`);
          const profileResult = await ensureUserProfile(userData);
          logger.info(`Resultado da verificação/criação de perfil OAuth2: ${profileResult ? 'sucesso' : 'falha'}`);
        } else {
          logger.error('Função ensureUserProfile não encontrada no middleware de autenticação');
        }
      }
    } catch (userFetchError) {
      logger.error(`Exceção ao obter usuário a partir do token: ${userFetchError.message}`);
    }
    
    // Se provider_token estiver disponível, podemos obter informações do usuário do Google
    if (provider_token) {
      try {
        const userInfo = await authService.getGoogleUserInfo(provider_token);
        logger.info(`Autenticação OAuth2 bem-sucedida para: ${userInfo.email}`);
      } catch (error) {
        logger.warn(`Erro ao obter informações do usuário Google: ${error.message}`);
        // Continuamos mesmo se houver erro aqui
      }
    }
    
    // Verificar se estamos em ambiente ngrok
    const isNgrok = req.headers.host && req.headers.host.includes('ngrok');
    
    // Definir cookie para autenticação com configurações adaptadas para ngrok
    const cookieMaxAge = (expires_in || 3600) * 1000;
    logger.info(`Definindo cookie 'authToken' com duração de ${cookieMaxAge}ms`);
    
    // Se for ngrok, usar configurações mais permissivas para os cookies
    const cookieOptions = {
      httpOnly: true,
      secure: isNgrok || process.env.NODE_ENV === 'production',
      maxAge: cookieMaxAge,
      sameSite: isNgrok ? 'none' : 'lax',
      path: '/'
    };
    
    logger.info(`Configuração de cookie para ambiente ${isNgrok ? 'ngrok' : 'normal'}: ${JSON.stringify(cookieOptions)}`);
    
    // CRÍTICO: Definir o cookie authToken corretamente - este é o principal usado na autenticação
    res.cookie('authToken', access_token, cookieOptions);
    
    // Cookies adicionais para compatibilidade com diferentes modos de acesso
    res.cookie('supabase-auth-token', access_token, cookieOptions);
    
    // Cookie de acesso para JavaScript (não httpOnly)
    res.cookie('js-auth-token', access_token, {
      ...cookieOptions,
      httpOnly: false
    });
    
    // Se houver refresh token, armazená-lo também
    if (refresh_token) {
      const refreshTokenMaxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias
      logger.info(`Definindo cookie 'refreshToken' com duração de ${refreshTokenMaxAge}ms`);
      
      const refreshCookieOptions = {
        ...cookieOptions,
        maxAge: refreshTokenMaxAge
      };
      
      res.cookie('refreshToken', refresh_token, refreshCookieOptions);
      res.cookie('supabase-refresh-token', refresh_token, refreshCookieOptions);
    }
    
    // Definir um cookie simples para testar se os cookies estão funcionando
    res.cookie('auth-test-cookie', 'test-value', {
      httpOnly: false,
      secure: isNgrok || process.env.NODE_ENV === 'production',
      maxAge: cookieMaxAge,
      sameSite: isNgrok ? 'none' : 'lax',
      path: '/'
    });
    
    // Adicionalmente, criar uma sessão real no Express para redundância
    if (req.session) {
      req.session.userId = userData?.id;
      req.session.userEmail = userData?.email;
      req.session.accessToken = access_token;
      logger.info(`Sessão Express criada para usuário: ${userData?.id}`);
    } else {
      logger.warn('Sessão Express não disponível - isso pode afetar a persistência da autenticação');
    }
    
    logger.info('Autenticação processada com sucesso, enviando resposta');
    return res.json({
      success: true,
      message: 'Autenticação processada com sucesso',
      redirectUrl: '/dashboard',
      cookieDefined: true,
      loginTime: new Date().toISOString(),
      isNgrok: isNgrok
    });
  } catch (error) {
    logger.error(`Erro ao processar token: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao processar autenticação: ' + error.message
    });
  }
});

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

module.exports = router;