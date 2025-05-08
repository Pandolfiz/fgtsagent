// Controlador de autenticação
const authService = require('../services/auth');
const { AppError } = require('../utils/errors');
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const { supabase } = require('../config/supabase');

/**
 * Registrar um novo usuário
 */
const signup = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    if (!email || !password) {
      throw new AppError('Email e senha são obrigatórios', 400);
    }
    
    const userData = {
      firstName: firstName || '',
      lastName: lastName || ''
    };
    
    const user = await authService.signUp(email, password, userData);
    
    res.status(201).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login de usuário (versão serviço)
 */
const loginWithService = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new AppError('Email e senha são obrigatórios', 400);
    }
    
    const { user, session } = await authService.login(email, password);
    
    res.status(200).json({
      status: 'success',
      data: { user, session }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout de usuário (versão serviço)
 */
const logoutWithService = async (req, res, next) => {
  try {
    // Obter o token de autenticação
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      // Tentar fazer logout no Supabase
      try {
        await supabaseAdmin.auth.signOut({
          scope: 'global'
        });
        logger.info(`Logout bem-sucedido para usuário: ${req.user.id}`);
      } catch (logoutError) {
        // Apenas registrar o erro, mas continuar com o logout no lado do cliente
        logger.error(`Erro no logout do Supabase: ${logoutError.message}`);
      }
    }
    
    // Sempre retornar sucesso para o cliente, mesmo que falhe no servidor
    res.status(200).json({
      status: 'success',
      data: null,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    logger.error(`Erro no logout: ${error.message}`);
    // Mesmo em caso de erro, retornamos sucesso para o cliente
    // para garantir que ele apague o token localmente
    res.status(200).json({
      status: 'success',
      data: null,
      message: 'Logout realizado com sucesso'
    });
  }
};

/**
 * Obter usuário atual (versão serviço)
 */
const getCurrentUser = async (req, res, next) => {
  try {
    // Agora utilizamos o método getUserProfile corrigido
    const user = await authService.getUserProfile(req.user.id);
    
    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    // Se ocorrer erro específico de recursão, use a abordagem simplificada
    if (error.message && error.message.includes('recursion')) {
      return res.status(200).json({
        status: 'success',
        data: { 
          user: {
            id: req.user.id,
            email: req.user.email,
            firstName: '',
            lastName: '',
            avatarUrl: null,
            organizations: []
          }
        }
      });
    }
    
    next(error);
  }
};

/**
 * Atualizar usuário atual (versão serviço)
 */
const updateUser = async (req, res, next) => {
  try {
    const { firstName, lastName, avatarUrl } = req.body;
    
    // Tentar atualizar o perfil através do serviço
    try {
      const user = await authService.updateUserProfile(req.user.id, {
        firstName, 
        lastName, 
        avatarUrl
      });
      
      return res.status(200).json({
        status: 'success',
        data: { user }
      });
    } catch (updateError) {
      // Se falhar a atualização, retornar os dados enviados sem persistir
      logger.error(`Erro ao atualizar perfil: ${updateError.message}`);
      
      return res.status(200).json({
        status: 'success',
        data: { 
          user: {
            id: req.user.id,
            email: req.user.email,
            firstName: firstName || '',
            lastName: lastName || '',
            avatarUrl: avatarUrl || null
          }
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Solicitar redefinição de senha
 */
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório'
      });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.APP_URL}/auth/reset-password`,
      // Configurar o idioma como português do Brasil
      locale: 'pt-BR'
    });

    if (error) {
      logger.error('Erro ao solicitar redefinição de senha:', error.message);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Se o email estiver registrado, você receberá instruções para redefinir sua senha'
    });
  } catch (err) {
    logger.error('Erro ao processar solicitação de redefinição de senha:', err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Confirmar redefinição de senha
 */
const confirmPasswordResetWithService = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      throw new AppError('Token e nova senha são obrigatórios', 400);
    }
    
    await authService.resetPassword(token, password);
    
    res.status(200).json({
      status: 'success',
      message: 'Senha atualizada com sucesso'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Registrar um novo usuário (versão direta)
 */
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validar entrada
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e senha são obrigatórios'
      });
    }

    // Log para depuração (remover em produção)
    console.log(`Tentativa de registro para: ${email}`);

    // Registrar usuário via Admin API do Supabase com email auto-confirmado
    const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    });

    if (error) {
      logger.error(`Erro ao registrar usuário: ${error.message}`);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    try {
      // Criar perfil de usuário
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: user.id,
          full_name: name,
          email: user.email,
          avatar_url: null
        });

      if (profileError) {
        logger.error(`Erro ao criar perfil de usuário: ${profileError.message}`);
        // Não vamos falhar o registro se apenas o perfil falhar
        console.log('Erro no perfil, mas continuando com o registro');
      }
    } catch (profileErr) {
      logger.error(`Exceção ao criar perfil de usuário: ${profileErr}`);
      // Continuar com o registro mesmo que o perfil falhe
    }

    return res.status(201).json({
      success: true,
      message: 'Conta criada com sucesso! Faça login para continuar.',
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (err) {
    logger.error(`Erro inesperado no registro: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno no servidor. Tente novamente mais tarde.'
    });
  }
};

/**
 * Login de usuário (versão direta)
 */
const login = async (req, res) => {
  try {
    // Limpar qualquer sessão anterior para evitar contaminação entre usuários
    res.clearCookie('authToken');
    res.clearCookie('refreshToken');
    res.clearCookie('supabase-auth-token');
    
    // Inicializar/Limpar dados de usuário para evitar contaminação
    req.user = null;
    
    // Log da operação
    logger.info(`Iniciando processo de login após limpeza de cookies anteriores`);
    
    const { email, password } = req.body;

    // Validar entrada
    if (!email || !password) {
      return res.status(400).json({
        success: false, 
        message: 'Email e senha são obrigatórios'
      });
    }

    // Log para depuração (remover em produção)
    console.log(`Tentativa de login para: ${email}`);

    // Fazer login no Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      logger.error(`Erro de login: ${error.message}`);
      // Email não confirmado
      if (error.message.includes('Email not confirmed')) {
        return res.status(401).json({
          success: false,
          message: 'É necessário confirmar seu email antes de fazer login. Verifique sua caixa de entrada.'
        });
      }
      // Credenciais inválidas (email ou senha)
      return res.status(401).json({
        success: false,
        message: 'Email ou senha inválidos. Verifique e tente novamente.'
      });
    }

    // Login bem-sucedido
    logger.info(`Login bem-sucedido para: ${email}`);

    // Definir cookies explicitamente com os tokens de sessão
    const accessToken = data.session.access_token;
    const refreshToken = data.session.refresh_token;
    const expiresIn = 60 * 60 * 24; // 24 horas em segundos
    
    // Definir cookie do token de acesso
    res.cookie('authToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expiresIn * 1000 // em milissegundos
    });
    
    // Definir cookie do token de refresh
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dias em milissegundos
    });
    
    // Armazenar informações no log
    logger.info(`Cookies para usuário ${data.user.id} foram definidos após login bem-sucedido`);

    return res.status(200).json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email
      },
      session: {
        accessToken,
        refreshToken
      }
    });
  } catch (err) {
    logger.error(`Erro inesperado no login: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno no servidor. Tente novamente mais tarde.'
    });
  }
};

/**
 * Logout de usuário (versão direta)
 */
const logout = async (req, res) => {
  try {
    // Limpar cookie
    res.clearCookie('authToken');
    
    // Encerrar sessão no Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      logger.error('Erro ao encerrar sessão no Supabase:', error.message);
    }
    
    return res.status(200).json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (err) {
    logger.error('Erro ao processar logout:', err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Obter informações do usuário atual (versão direta)
 */
const getMe = async (req, res) => {
  try {
    // Verificar se temos um usuário autenticado do middleware
    if (!req.user) {
      // Se não temos, tentar obter token diretamente do request
      let token = null;
      
      // 1. Verificar nos headers de autorização
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.substring(7);
        logger.info('Token encontrado no header Authorization');
      } 
      // 2. Verificar nos cookies
      else if (req.cookies && (req.cookies.authToken || req.cookies['supabase-auth-token'] || req.cookies['js-auth-token'])) {
        token = req.cookies.authToken || req.cookies['supabase-auth-token'] || req.cookies['js-auth-token'];
        logger.info('Token encontrado nos cookies');
      }
      
      if (token) {
        // Tentar obter o usuário com o token encontrado
        try {
          const { data: userResponse, error: userError } = await supabase.auth.getUser(token);
          
          if (userError) {
            logger.error(`Erro ao obter usuário a partir do token: ${userError.message}`);
            return res.status(401).json({
              success: false,
              message: 'Não autenticado - Token inválido'
            });
          }
          
          if (userResponse && userResponse.user) {
            // Usar o usuário obtido
            req.user = userResponse.user;
            logger.info(`Usuário autenticado manualmente: ${req.user.id}`);
          }
        } catch (tokenError) {
          logger.error(`Erro ao processar token manual: ${tokenError.message}`);
          return res.status(401).json({
            success: false,
            message: 'Não autenticado - Erro ao processar token'
          });
        }
      }
      
      // Se ainda não temos usuário, retornar erro de autenticação
      if (!req.user) {
        logger.warn('Acesso não autorizado - Usuário não encontrado');
        return res.status(401).json({
          success: false,
          message: 'Não autenticado'
        });
      }
    }
    
    try {
      // Obter perfil completo - sem usar single() para evitar erro com múltiplos registros
      const { data: profilesData, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', req.user.id)
        .order('updated_at', { ascending: false });
        
      if (error) {
        logger.error(`Erro ao buscar perfil do usuário: ${error.message}`);
        
        // Extrair nome completo dos metadados do usuário
        const userMetadataName = req.user.user_metadata?.full_name || 
          (req.user.user_metadata?.first_name && req.user.user_metadata?.last_name ? 
            `${req.user.user_metadata.first_name} ${req.user.user_metadata.last_name}` : '');
        
        // Log para depuração
        logger.info(`Retornando dados do usuário a partir dos metadados: ${JSON.stringify(req.user.user_metadata)}`);
            
        // Mesmo com erro, retornar um perfil padrão em vez de falhar
        return res.status(200).json({
          success: true,
          user: {
            id: req.user.id,
            email: req.user.email,
            full_name: userMetadataName || '',
            displayName: userMetadataName || req.user.email?.split('@')[0] || 'Usuário',
            firstName: req.user.user_metadata?.first_name || '',
            lastName: req.user.user_metadata?.last_name || '',
            name: userMetadataName || req.user.email?.split('@')[0] || 'Usuário',
            avatar_url: req.user.user_metadata?.avatar_url || null,
            role: req.user.app_metadata?.role || 'user'
          }
        });
      }
      
      // Usar o primeiro registro (mais recente) ou um objeto vazio se não houver registros
      const profile = (profilesData && profilesData.length > 0) ? profilesData[0] : {};
      
      // Se houver múltiplos perfis, registrar para análise posterior
      if (profilesData && profilesData.length > 1) {
        logger.warn(`Múltiplos perfis encontrados para o usuário ${req.user.id}. Total: ${profilesData.length}`);
      }
      
      // Determinar nome final de exibição
      let finalName = '';
      if (profile.full_name) {
        finalName = profile.full_name;
        logger.info(`Nome extraído da tabela user_profiles.full_name: ${finalName}`);
      } else {
        // Tentar obter via Admin API do Supabase Auth
        try {
          const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.getUserById(req.user.id);
          if (!adminError && adminData?.user?.user_metadata?.full_name) {
            finalName = adminData.user.user_metadata.full_name;
            logger.info(`Nome extraído de user_metadata via Admin API: ${finalName}`);
          }
        } catch (adminFetchError) {
          logger.warn(`Falha ao buscar metadata de usuário via Admin API: ${adminFetchError.message}`);
        }
      }
      if (!finalName) {
        finalName = (profile.first_name && profile.last_name)
          ? `${profile.first_name} ${profile.last_name}`
          : profile.name || req.user.email?.split('@')[0] || 'Usuário';
      }
      const displayName = finalName;
      
      logger.info(`Nome final selecionado: "${displayName}"`);
      
      // Log para depuração dos dados retornados
      logger.info(`Retornando perfil completo: usuário=${req.user.id}, displayName=${displayName}`);
      
      // Construir resposta com todas as possíveis propriedades de nome
      const response = {
        success: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          ...profile, // Incluir todos os campos do perfil
          // Garantir que os campos de nome estejam presentes
          full_name: displayName, // Usar o nome correto aqui
          displayName: displayName, // E aqui também
          firstName: profile.first_name || req.user.user_metadata?.first_name || '',
          lastName: profile.last_name || req.user.user_metadata?.last_name || '',
          name: displayName, // E aqui também
          // Incluir explicitamente os metadados para o frontend
          user_metadata: req.user.user_metadata || {},
          // Adicionar propriedades específicas para o frontend
          avatar_url: req.user.user_metadata?.avatar_url || profile.avatar_url || null,
          role: req.user.app_metadata?.role || 'user'
        }
      };
      
      logger.info(`Tamanho da resposta: ${JSON.stringify(response).length} bytes`);
      
      return res.status(200).json(response);
    } catch (dbErr) {
      logger.error(`Erro na consulta de perfil: ${dbErr.message || JSON.stringify(dbErr)}`);
      // Em caso de erro na consulta, retornar os dados básicos do usuário
      const userMetadataName = req.user.user_metadata?.full_name || 
        (req.user.user_metadata?.first_name && req.user.user_metadata?.last_name ? 
          `${req.user.user_metadata.first_name} ${req.user.user_metadata.last_name}` : '');
      
      return res.status(200).json({
        success: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          full_name: userMetadataName || '',
          displayName: userMetadataName || req.user.email?.split('@')[0] || 'Usuário',
          firstName: req.user.user_metadata?.first_name || '',
          lastName: req.user.user_metadata?.last_name || '',
          name: userMetadataName || req.user.email?.split('@')[0] || 'Usuário',
          avatar_url: req.user.user_metadata?.avatar_url || null,
          role: req.user.app_metadata?.role || 'user'
        }
      });
    }
  } catch (err) {
    logger.error(`Erro ao buscar informações do usuário: ${err.message || JSON.stringify(err)}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Renderizar a página de login
 */
const renderLogin = (req, res) => {
  // Verificar se estamos usando ngrok
  const isNgrok = req.headers.host && req.headers.host.includes('ngrok');
  
  logger.info(`Renderizando página de login. Usando ngrok: ${isNgrok}`);
  
  // Obter mensagem de erro, se existir
  const error = req.query.error;
  const errorMessage = error ? decodeURIComponent(error) : null;
  
  if (errorMessage) {
    logger.warn(`Erro na autenticação: ${errorMessage}`);
  }
  
  res.render('auth/login', { 
    title: 'Login',
    error: errorMessage,
    isNgrok
  });
};

const renderSignup = (req, res) => {
  res.render('auth/signup', { 
    title: 'Cadastro'
  });
};

/**
 * Confirmar redefinição de senha (versão direta)
 */
const confirmPasswordReset = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Nova senha é obrigatória'
      });
    }

    const { error } = await supabase.auth.updateUser({
      password
    });

    if (error) {
      logger.error('Erro ao redefinir senha:', error.message);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Senha atualizada com sucesso'
    });
  } catch (err) {
    logger.error('Erro ao processar redefinição de senha:', err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Atualizar perfil do usuário atual (versão direta)
 */
const updateCurrentUser = async (req, res) => {
  try {
    const { full_name, avatar_url } = req.body;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Não autenticado'
      });
    }
    
    // Atualizar metadados do usuário no Supabase Auth
    if (full_name) {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          full_name,
          first_name: full_name.split(' ')[0] // Extrair o primeiro nome
        }
      });
      
      if (updateError) {
        logger.error('Erro ao atualizar metadados do usuário:', updateError.message);
      }
    }
    
    // Atualizar perfil do usuário
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        full_name: full_name,
        avatar_url: avatar_url,
        updated_at: new Date()
      })
      .eq('id', req.user.id);
      
    if (profileError) {
      logger.error('Erro ao atualizar perfil do usuário:', profileError.message);
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar perfil'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Perfil atualizado com sucesso'
    });
  } catch (err) {
    logger.error('Erro ao atualizar perfil do usuário:', err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Reenviar email de confirmação
 */
const resendConfirmationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório'
      });
    }
    
    // Utiliza a API do Supabase para reenviar o email de confirmação
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.APP_URL}/auth/login`,
        // Configurar o idioma como português do Brasil
        locale: 'pt-BR'
      }
    });
    
    if (error) {
      logger.error('Erro ao reenviar email de confirmação:', error.message);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Email de confirmação reenviado. Por favor, verifique sua caixa de entrada ou spam.'
    });
  } catch (err) {
    logger.error('Erro ao processar reenvio de email de confirmação:', err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Renovar token de autenticação do usuário
 * Esta função permite renovar o token JWT para manter o usuário autenticado
 */
const refreshToken = async (req, res) => {
  try {
    // Obter o refresh token
    let refreshTokenValue = req.body.refresh_token;
    
    // Se não houver no body, verificar nos cookies
    if (!refreshTokenValue && req.cookies.refreshToken) {
      refreshTokenValue = req.cookies.refreshToken;
    }
    
    // Obter o token de acesso atual
    const accessToken = req.headers.authorization?.split(' ')[1] || req.cookies.authToken;
    
    logger.info(`refreshToken: Token de acesso disponível: ${accessToken ? 'Sim' : 'Não'}`);
    logger.info(`refreshToken: Refresh token disponível: ${refreshTokenValue ? 'Sim' : 'Não'}`);
    
    if (!refreshTokenValue && !accessToken) {
      return res.status(401).json({
        success: false,
        message: 'Nenhum token fornecido'
      });
    }
    
    // Primeira abordagem: verificar se já temos uma sessão ativa
    let sessionData;
    let userData;
    
    if (accessToken) {
      try {
        // Verificar sessão atual
        const { data: currentSession, error: sessionError } = await supabase.auth.getSession();
        
        if (!sessionError && currentSession?.session) {
          logger.info('Sessão ativa encontrada, tentando renovar');
          sessionData = currentSession;
          
          // Obter dados do usuário da sessão atual
          if (currentSession.session.user) {
            userData = currentSession.session.user;
            logger.info(`Usuário obtido da sessão atual: ${userData.id}`);
          }
          
          // Se temos uma sessão ativa e um refresh token, tentar renovar com o refresh token
          if (refreshTokenValue) {
            const { data, error } = await supabase.auth.refreshSession({
              refresh_token: refreshTokenValue
            });
            
            if (!error && data?.session) {
              // Sessão renovada com sucesso usando refresh token
              logger.info('Sessão renovada com sucesso usando refresh token');
              sessionData = data;
              userData = data.user;
              
              // Configurar cookies
              if (data.session.access_token) {
                res.cookie('authToken', data.session.access_token, {
                  httpOnly: true,
                  secure: process.env.NODE_ENV === 'production',
                  maxAge: 24 * 60 * 60 * 1000 // 1 dia
                });
              }
              
              if (data.session.refresh_token) {
                res.cookie('refreshToken', data.session.refresh_token, {
                  httpOnly: true,
                  secure: process.env.NODE_ENV === 'production',
                  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dias
                });
              }
              
              // Obter informações completas do usuário
              const { data: userResponse, error: userError } = await supabase.auth.getUser(data.session.access_token);
              
              if (!userError && userResponse?.user) {
                userData = userResponse.user;
                logger.info(`Dados completos do usuário obtidos após renovação: ${userData.id}`);
              }
              
              return res.status(200).json({
                success: true,
                message: 'Token renovado com sucesso',
                data: {
                  user: userData,
                  session: {
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                    expires_at: data.session.expires_at
                  }
                }
              });
            }
          }
          
          // Se não tiver refresh token ou a renovação falhar, tente renovar a sessão atual
          logger.info('Tentando renovar sessão atual sem refresh token específico');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && refreshData?.session) {
            // Sessão renovada com sucesso
            logger.info('Sessão renovada com sucesso');
            sessionData = refreshData;
            userData = refreshData.user;
            
            // Configurar cookies
            if (refreshData.session.access_token) {
              res.cookie('authToken', refreshData.session.access_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000 // 1 dia
              });
            }
            
            if (refreshData.session.refresh_token) {
              res.cookie('refreshToken', refreshData.session.refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dias
              });
            }
            
            // Obter informações completas do usuário
            const { data: userResponse, error: userError } = await supabase.auth.getUser(refreshData.session.access_token);
            
            if (!userError && userResponse?.user) {
              userData = userResponse.user;
              logger.info(`Dados completos do usuário obtidos após renovação da sessão atual: ${userData.id}`);
            }
            
            return res.status(200).json({
              success: true,
              message: 'Token renovado com sucesso',
              data: {
                user: userData,
                session: {
                  access_token: refreshData.session.access_token,
                  refresh_token: refreshData.session.refresh_token,
                  expires_at: refreshData.session.expires_at
                }
              }
            });
          } else {
            logger.warn(`Erro ao renovar sessão atual: ${refreshError?.message}`);
          }
        }
      } catch (sessionErr) {
        logger.warn(`Erro ao verificar sessão atual: ${sessionErr.message}`);
      }
    }
    
    // Segunda abordagem: tentar obter o usuário diretamente do token atual
    if (accessToken && !userData) {
      try {
        const { data: userResponse, error: userError } = await supabase.auth.getUser(accessToken);
        
        if (!userError && userResponse?.user) {
          userData = userResponse.user;
          logger.info(`Usuário obtido diretamente do token atual: ${userData.id}`);
        }
      } catch (userErr) {
        logger.warn(`Erro ao obter usuário do token atual: ${userErr.message}`);
      }
    }
    
    // Terceira abordagem: se chegou aqui, não temos sessão ativa ou a renovação falhou
    // Tentar usar apenas o refresh token para criar uma nova sessão
    if (refreshTokenValue) {
      logger.info('Tentando criar nova sessão com refresh token');
      
      // Tenta renovar a sessão usando o refresh token
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshTokenValue
      });
      
      if (error || !data.session) {
        logger.error('Erro ao renovar token:', error?.message || 'Sessão não gerada');
        return res.status(401).json({
          success: false,
          message: 'Erro ao renovar token: ' + (error?.message || 'Token inválido')
        });
      }
      
      // Definir o novo access token e refresh token nos cookies
      if (data.session.access_token) {
        res.cookie('authToken', data.session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000 // 1 dia
        });
      }
      
      if (data.session.refresh_token) {
        res.cookie('refreshToken', data.session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dias
        });
      }
      
      // Obter informações completas do usuário
      const { data: userResponse, error: userError } = await supabase.auth.getUser(data.session.access_token);
      
      if (!userError && userResponse?.user) {
        userData = userResponse.user;
        logger.info(`Dados completos do usuário obtidos após criação de nova sessão: ${userData.id}`);
      } else {
        userData = data.user;
      }
      
      // Retornar a nova sessão
      return res.status(200).json({
        success: true,
        message: 'Token renovado com sucesso',
        data: {
          user: userData,
          session: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at
          }
        }
      });
    }
    
    // Se chegou aqui, não foi possível renovar a sessão
    return res.status(401).json({
      success: false,
      message: 'Não foi possível renovar a sessão. Por favor, faça login novamente.'
    });
  } catch (err) {
    logger.error('Erro ao processar renovação de token:', err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao renovar token: ' + err.message
    });
  }
};

/**
 * Criar uma sessão para um usuário específico (admin only)
 * Esta função permite que um administrador crie uma sessão válida para qualquer usuário
 * Útil para testes, impersonificação ou resolver problemas de sessão
 * @param {Object} req - Objeto de requisição Express
 * @param {Object} res - Objeto de resposta Express
 */
const createSession = async (req, res) => {
  try {
    const { userId, expiresIn } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário é obrigatório'
      });
    }

    // Verificação de administrador já é feita pelo middleware requireAdmin
    // então não precisamos verificar novamente aqui

    // Verificar se o usuário alvo existe antes de prosseguir
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !userData || !userData.user) {
      logger.error(`Erro ao verificar usuário para criação de sessão: ${userError?.message || 'Usuário não encontrado'}`);
      return res.status(404).json({
        success: false,
        message: `Usuário não encontrado: ${userError?.message || 'ID inválido'}`
      });
    }

    let sessionData;
    let errorDetails = null;

    // A partir do Supabase 2.49.4, podemos tentar usar o método createUserSession
    try {
      logger.info(`Tentando criar sessão administrativa para o usuário ${userId} usando createUserSession`);
      
      const { data, error } = await supabaseAdmin.auth.admin.createUserSession({
        userId: userId,
        expiresIn: expiresIn || 3600
      });
      
      if (error) {
        throw new Error(`Erro ao criar sessão via admin API: ${error.message}`);
      }
      
      sessionData = {
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
        expires_in: expiresIn || 3600,
        expires_at: Math.floor(Date.now() / 1000) + (expiresIn || 3600),
        user: {
          id: userData.user.id,
          email: userData.user.email,
          app_metadata: userData.user.app_metadata,
          user_metadata: userData.user.user_metadata
        }
      };
      
      logger.info(`Sessão criada com sucesso via createUserSession para usuário ${userId}`);
    } catch (primaryError) {
      errorDetails = primaryError;
      logger.error(`Falha na criação de sessão via createUserSession: ${primaryError.message}`);
      
      // Tentar método alternativo via API
      try {
        logger.info(`Tentando método alternativo via API para o usuário ${userId}`);
        sessionData = await authService.createAdminSessionViaApi(userId, expiresIn || 3600);
      } catch (secondaryError) {
        logger.error(`Falha na segunda tentativa de criar sessão: ${secondaryError.message}`);
        
        // Método direto de criação de sessão
        try {
          logger.info(`Tentando método direto para o usuário ${userId}`);
          sessionData = await authService.createAdminSession(userId, expiresIn || 3600);
        } catch (emergencyError) {
          logger.error(`Falha em todas as tentativas de criar sessão: ${emergencyError.message}`);
          throw new Error(`Falha ao criar sessão após múltiplas tentativas: ${emergencyError.message}`);
        }
      }
    }

    // Se chegou aqui, uma das abordagens funcionou
    
    // Definir cookie seguro com o token
    res.cookie('supabase-auth-token', sessionData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: (expiresIn || 3600) * 1000,
      sameSite: 'strict'
    });

    // Registrar ação para auditoria
    logger.info(`Sessão administrativa criada para usuário: ${userId} por admin: ${req.user.id}`);

    return res.status(200).json({
      success: true,
      message: errorDetails ? 'Sessão criada com método de fallback' : 'Sessão criada com sucesso',
      fallback_used: !!errorDetails,
      error_details: errorDetails ? errorDetails.message : null,
      data: sessionData
    });
  } catch (err) {
    logger.error(`Erro crítico ao criar sessão administrativa: ${err.message}`);
    logger.error(`Stack trace: ${err.stack}`);
    
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Erro interno ao criar sessão',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

/**
 * Verificar um token JWT e retornar informações sobre ele
 * Útil para diagnóstico de problemas com tokens
 * @param {Object} req - Objeto de requisição Express
 * @param {Object} res - Objeto de resposta Express
 */
const verifyToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token é obrigatório'
      });
    }
    
    // Verificar se é um token válido do Supabase
    try {
      // Obter o JWT secret
      const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
      
      if (!JWT_SECRET) {
        return res.status(500).json({
          success: false,
          message: 'SUPABASE_JWT_SECRET não está configurado no ambiente'
        });
      }
      
      // Decodificar o token
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      
      // Se chegou aqui, token é válido
      const now = Math.floor(Date.now() / 1000);
      const timeToExpire = decoded.exp - now;
      
      // Verificar se a sessão existe no banco de dados
      let sessionInfo = null;
      if (decoded.session_id) {
        try {
          const { data: sessionData, error: sessionError } = await supabaseAdmin
            .from('auth.sessions')
            .select('*')
            .eq('id', decoded.session_id)
            .single();
            
          if (!sessionError && sessionData) {
            sessionInfo = {
              id: sessionData.id,
              created_at: sessionData.created_at,
              updated_at: sessionData.updated_at,
              user_id: sessionData.user_id,
              has_refresh_token: !!sessionData.refresh_token
            };
          }
        } catch (sessionErr) {
          logger.error(`Erro ao verificar sessão: ${sessionErr.message}`);
          // Continuar sem as informações da sessão
        }
      }
      
      // Buscar informações do usuário
      let userInfo = null;
      if (decoded.sub) {
        try {
          const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(decoded.sub);
          
          if (!userError && userData && userData.user) {
            userInfo = {
              id: userData.user.id,
              email: userData.user.email,
              email_confirmed_at: userData.user.email_confirmed_at,
              last_sign_in_at: userData.user.last_sign_in_at,
              created_at: userData.user.created_at,
              updated_at: userData.user.updated_at,
              is_anonymous: userData.user.is_anonymous || false
            };
          }
        } catch (userErr) {
          logger.error(`Erro ao buscar informações do usuário: ${userErr.message}`);
          // Continuar sem as informações do usuário
        }
      }
      
      return res.status(200).json({
        success: true,
        message: 'Token válido',
        token_info: {
          subject: decoded.sub,
          audience: decoded.aud,
          issued_at: new Date(decoded.iat * 1000).toISOString(),
          expires_at: new Date(decoded.exp * 1000).toISOString(),
          expires_in_seconds: timeToExpire,
          is_expired: timeToExpire <= 0,
          email: decoded.email,
          session_id: decoded.session_id,
          role: decoded.role
        },
        session: sessionInfo,
        user: userInfo
      });
    } catch (tokenError) {
      // Token inválido
      logger.warn(`Token inválido verificado: ${tokenError.message}`);
      
      // Tentar extrair informações mesmo sendo inválido
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          
          return res.status(400).json({
            success: false,
            message: `Token inválido: ${tokenError.message}`,
            partial_info: {
              subject: payload.sub,
              audience: payload.aud,
              issued_at: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
              expires_at: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
              email: payload.email,
              session_id: payload.session_id
            }
          });
        }
      } catch (parseError) {
        // Não foi possível extrair informações do token
      }
      
      return res.status(400).json({
        success: false,
        message: `Token inválido: ${tokenError.message}`
      });
    }
  } catch (err) {
    logger.error(`Erro ao verificar token: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro interno ao verificar token: ${err.message}`,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Exportar todas as funções em um objeto único
module.exports = {
  // Versões antigas (compatibilidade)
  signup,
  loginWithService,
  logoutWithService,
  getCurrentUser,
  updateUser,
  confirmPasswordResetWithService,
  
  // Versões novas (diretas)
  register,
  login,
  logout,
  getMe,
  renderLogin,
  renderSignup,
  requestPasswordReset,
  confirmPasswordReset,
  updateCurrentUser,
  resendConfirmationEmail,
  refreshToken,
  createSession,
  verifyToken
};