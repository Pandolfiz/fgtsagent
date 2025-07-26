// Middleware para autenticação
const { supabase, supabaseAdmin } = require('../config/supabase');
const logger = require('../config/logger');

// Cache para evitar condições de corrida na criação de perfis
const userProfileLocks = new Map();

/**
 * Cria um lock para operações de perfil de usuário
 * @param {string} userId - ID do usuário
 * @returns {Promise} Promise que resolve quando o lock é liberado
 */
async function acquireUserProfileLock(userId) {
  // Se já existe um lock para este usuário, aguardar
  if (userProfileLocks.has(userId)) {
    logger.debug(`Aguardando lock para usuário ${userId}`);
    await userProfileLocks.get(userId);
  }

  // Criar novo lock
  let resolveLock;
  const lockPromise = new Promise(resolve => {
    resolveLock = resolve;
  });
  
  userProfileLocks.set(userId, lockPromise);
  
  // Retornar função para liberar o lock
  return () => {
    userProfileLocks.delete(userId);
    resolveLock();
  };
}

/**
 * Verifica e cria o perfil do usuário no banco de dados se não existir
 * @param {Object} user - Objeto do usuário autenticado
 */
async function ensureUserProfile(user) {
  if (!user || !user.id) {
    logger.error('ensureUserProfile: Usuário inválido');
    return false;
  }

  // Adquirir lock para evitar condições de corrida
  const releaseLock = await acquireUserProfileLock(user.id);

  try {
    logger.info(`[ensureUserProfile] Verificando perfil de usuário para ${user.id}`);
    
    // Verificar se o perfil já existe (usando transação para consistência)
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    
    if (profileError) {
      logger.error(`Erro ao verificar perfil: ${profileError.message}`);
      return false;
    }
    
    // Verificar se o cliente já existe
    const { data: existingClient, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    
    if (clientError) {
      logger.error(`Erro ao verificar cliente: ${clientError.message}`);
    }
    
    const needsProfile = !existingProfile;
    const needsClient = !existingClient;
    

    
    if (needsProfile || needsClient) {
      // logger.info(`Usuário ${user.id} precisa: ${needsProfile ? 'perfil' : ''} ${needsProfile && needsClient ? 'e' : ''} ${needsClient ? 'cliente' : ''}`);
      
      // Extrair informações do usuário uma única vez
      const userMetadata = user.user_metadata || {};
      const fullName = userMetadata.full_name || 
                      userMetadata.name || 
                      `${userMetadata.first_name || userMetadata.given_name || ''} ${userMetadata.last_name || userMetadata.family_name || ''}`.trim();
      

      
      // Preparar dados
      const profileData = needsProfile ? {
        id: user.id,
        email: user.email,
        first_name: userMetadata.first_name || userMetadata.given_name || '',
        last_name: userMetadata.last_name || userMetadata.family_name || '',
        full_name: fullName,
        avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } : null;
      
      const clientData = needsClient ? {
        id: user.id,
        name: fullName || user.email,
        email: user.email,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } : null;
      
      if (needsProfile) {
        logger.info(`[ensureUserProfile] Criando perfil com dados:`, profileData);
      }
      
      if (needsClient) {
        logger.info(`[ensureUserProfile] Criando cliente com dados:`, clientData);
      }
      
      // Executar operações em paralelo (agora que temos lock)
      const operations = [];
      
      if (needsProfile) {
        operations.push(
          supabaseAdmin
            .from('user_profiles')
            .upsert(profileData, { onConflict: 'id' })
            .then(result => ({ type: 'profile', result }))
        );
      }
      
      if (needsClient) {
        operations.push(
          supabaseAdmin
            .from('clients')
            .upsert(clientData, { onConflict: 'id' })
            .then(result => ({ type: 'client', result }))
        );
      }
      
      // Aguardar todas as operações
      const results = await Promise.allSettled(operations);
      
      // Verificar resultados
      let hasErrors = false;
      for (const { status, value, reason } of results) {
        if (status === 'rejected') {
          logger.error(`Erro na operação: ${reason.message}`);
          hasErrors = true;
        } else if (value.result.error) {
          logger.error(`Erro ao criar ${value.type}: ${value.result.error.message}`);
          hasErrors = true;
        } else {
          logger.info(`[ensureUserProfile] ${value.type} criado/atualizado com sucesso`);
        }
      }
      
      if (hasErrors) {
        logger.error(`[ensureUserProfile] Erros encontrados durante criação de perfil/cliente`);
        return false;
      }
      
      // Atualizar o objeto user com os dados do perfil criado
      if (needsProfile && profileData) {
        user.profile = profileData;
        logger.info(`[ensureUserProfile] Perfil adicionado ao objeto user:`, profileData);
      }
      
      return true;
    } else {
      logger.info(`[ensureUserProfile] Usuário ${user.id} já possui perfil e cliente`);
      return true;
    }
  } catch (error) {
    logger.error(`[ensureUserProfile] Erro geral: ${error.message}`);
    return false;
  } finally {
    // Sempre liberar o lock
    releaseLock();
  }
}

// Função auxiliar para determinar a URL de login correta para o frontend React
function getReactLoginUrl(req, redirectPath, message) {
  const redirectUrl = encodeURIComponent(redirectPath);
  const clientAppUrl = req.headers['referer'] || '/';
  const baseUrl = clientAppUrl.split('?')[0].replace(/\/+$/, '');
  
  // Verificar se estamos usando Hash Router ou Browser Router
  // Por padrão, assumimos Browser Router no React moderno
  const isHashRouter = process.env.REACT_ROUTER_TYPE === 'hash';
  
  if (isHashRouter) {
    // Hash Router (#/login)
    return `${baseUrl}/#/login?redirect=${redirectUrl}&message=${encodeURIComponent(message)}`;
  } else {
    // Browser Router (/login)
    return `${baseUrl}/login?redirect=${redirectUrl}&message=${encodeURIComponent(message)}`;
  }
}

/**
 * Middleware para verificar se o usuário está autenticado
 */
const requireAuth = async (req, res, next) => {
  // console.log(`[AUTH LOG] requireAuth chamado para ${req.method} ${req.originalUrl}`);
  try {
    // Inicializar/Limpar dados de usuário para evitar contaminação entre requisições
    req.user = null;
    
    // Verificar e criar tabela de perfis se necessário
    await checkAndCreateTables();
    
    // Verificar token na requisição
    // 1. Verificar nos cookies
    let token = req.cookies.authToken;
    // logger.info(`Token do cookie: ${token ? 'encontrado' : 'não encontrado'}`);
    
    // 2. Se não encontrou nos cookies, verificar no header de autorização
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        // logger.info(`Token do header: ${token ? 'encontrado' : 'não encontrado'}`);
      }
    }
    
    // 3. Se ainda não encontrou, verificar na query string (para uso em fluxos especiais)
    if (!token && req.query.token) {
      token = req.query.token;
      // logger.info(`Token da query: ${token ? 'encontrado' : 'não encontrado'}`);
    }
    
    // 4. Verificar nos parâmetros do body para API
    if (!token && req.body && req.body.token) {
      token = req.body.token;
      // logger.info(`Token do body: ${token ? 'encontrado' : 'não encontrado'}`);
    }
    
    if (!token) {
      // Não autenticado
      logger.warn('Acesso não autorizado - Token não encontrado');
      
      // Para requisições de API, retornar erro 401
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({
          success: false,
          message: 'Não autorizado - Autenticação necessária'
        });
      }
      
      // Para acesso web, redirecionar para o login com parâmetro redirect
      // Em vez de redirecionar diretamente para /login, verificamos o tipo de cliente
      const isReactClient = !req.headers['accept'] || req.headers['accept'].includes('text/html');
      
      if (isReactClient) {
        // Aplicativo React - redirecionar para a URL base e deixar o React Router lidar
        const loginPath = getReactLoginUrl(req, req.originalUrl, 'Faça login para acessar esta página');
        
        // logger.info(`Redirecionando cliente React para: ${loginPath}`);
        return res.redirect(loginPath);
      } else {
        // Cliente tradicional - redirecionar para a rota /login convencional
        const redirectUrl = encodeURIComponent(req.originalUrl);
        // logger.info(`Redirecionando para o login com redirect=${redirectUrl}`);
        return res.redirect(`/login?redirect=${redirectUrl}&message=Faça login para acessar esta página`);
      }
    }
    
    // Analisar o token JWT para verificar a expiração
    try {
      const [headerEncoded, payloadEncoded] = token.split('.');
      if (headerEncoded && payloadEncoded) {
        const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64').toString('utf8'));
        if (payload && payload.exp) {
          const expiryTime = payload.exp * 1000; // Converter para milissegundos
          const currentTime = Date.now();
          const timeRemaining = expiryTime - currentTime;
          
          // Se o token expira em menos de 10 minutos, renovar o cookie
          if (timeRemaining < 600000 && timeRemaining > 0) {
            // logger.info('Token prestes a expirar, renovando cookie por mais 1 dia');
            res.cookie('authToken', token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production', 
              maxAge: 24 * 60 * 60 * 1000 // 1 dia
            });
          } else if (timeRemaining <= 0) {
            logger.warn('Token já expirado');
            
            // Em vez de redirecionar imediatamente, tentamos gerar um novo token
            try {
              // Extrair o user_id do payload
              const userId = payload.sub;
              if (userId) {
                // logger.info(`Tentando renovar token expirado para usuário ${userId}`);
                
                // Gerar um novo token usando o userId
                const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
                
                if (!userError && userData && userData.user) {
                  // Gerar token JWT manualmente
                  const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.createSession({
                    user_id: userId
                  });
                  
                  // Corrigir a API para usar a versão correta do Supabase
                  try {
                    // Verificar qual API está disponível e usar a correta
                    let newSession = null;
                    let newSessionError = null;
                    
                    // Tentativa 1: Nova API (v2.x)
                    if (typeof supabaseAdmin.auth.admin.createSession === 'function') {
                      const result = await supabaseAdmin.auth.admin.createSession({
                        user_id: userId
                      });
                      newSession = result.data;
                      newSessionError = result.error;
                    } 
                    // Tentativa 2: Método alternativo - criar um JWT manualmente
                    else if (typeof supabaseAdmin.auth.createSession === 'function') {
                      const result = await supabaseAdmin.auth.createSession({
                        userId: userId,
                        expiresIn: 3600 // 1 hora
                      });
                      newSession = result.data;
                      newSessionError = result.error;
                    }
                    // Tentativa 3: Método alternativo - signInById
                    else if (typeof supabaseAdmin.auth.signInWithId === 'function') {
                      const result = await supabaseAdmin.auth.signInWithId(userId);
                      newSession = result.data;
                      newSessionError = result.error;
                    }
                    
                    if (newSessionError) {
                      logger.error(`Erro ao gerar novo token: ${newSessionError.message}`);
                      throw new Error('Não foi possível renovar o token');
                    } else if (newSession && newSession.access_token) {
                      // logger.info(`Novo token gerado com sucesso para usuário ${userId}`);
                      // Definir novo token e continuar
                      token = newSession.access_token;
                      res.cookie('authToken', token, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        maxAge: 24 * 60 * 60 * 1000 // 1 dia
                      });
                      // Continuar com o token renovado
                    } else {
                      throw new Error('Falha ao gerar novo token');
                    }
                  } catch (retryError) {
                    logger.error(`Erro nas tentativas adicionais: ${retryError.message}`);
                    throw new Error('Não foi possível renovar o token');
                  }
                } else {
                  logger.error(`Usuário não encontrado: ${userError?.message || 'ID inválido'}`);
                  throw new Error('Usuário não encontrado');
                }
              } else {
                logger.error('Token inválido: não contém ID do usuário');
                throw new Error('Token inválido');
              }
            } catch (renewError) {
              logger.error(`Erro ao renovar token: ${renewError.message}`);
              
              // Limpar cookies inválidos
              res.clearCookie('authToken');
              
              if (req.originalUrl.startsWith('/api/')) {
                return res.status(401).json({
                  success: false,
                  message: 'Token expirado. Faça login novamente.'
                });
              }
              
              // Para acesso web, redirecionar para o login com parâmetro redirect
              const redirectUrl = encodeURIComponent(req.originalUrl);
              // logger.info(`Redirecionando para o login após expiração de token: redirect=${redirectUrl}`);
              
              // Verificar se é cliente React
              const isReactClient = !req.headers['accept'] || req.headers['accept'].includes('text/html');
              
              if (isReactClient) {
                // Aplicativo React - redirecionar para a rota base
                const loginPath = getReactLoginUrl(req, req.originalUrl, 'Sua sessão expirou. Faça login novamente.');
                
                // logger.info(`Redirecionando cliente React para: ${loginPath}`);
                return res.redirect(loginPath);
              } else {
                // Cliente tradicional
                return res.redirect(`/login?redirect=${redirectUrl}&message=Sua sessão expirou. Faça login novamente.`);
              }
            }
          }
        }
      }
    } catch (parseError) {
      logger.warn(`Erro ao analisar token JWT: ${parseError.message}`);
      // Continuar com a verificação padrão do Supabase
    }
    
    // Verificar token com o Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    let user = data?.user;

    // Se houver erro de autenticação, tentar abordagem alternativa
    if (error || !user) {
      logger.warn(`Erro de autenticação: ${error ? error.message : 'Usuário não encontrado'}`);
      
      // Tentar extrair informações do token mesmo se inválido
      try {
        const [headerEncoded, payloadEncoded] = token.split('.');
        if (headerEncoded && payloadEncoded) {
          const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64').toString('utf8'));
          if (payload && payload.sub) {
            const userId = payload.sub;
            // logger.info(`Tentando recuperar usuário pelo ID: ${userId}`);
            
            // Obter informações do usuário diretamente pelo ID
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
            
            if (!userError && userData && userData.user) {
              // logger.info(`Usuário recuperado com sucesso: ${userData.user.email}`);
              user = userData.user;
              
              // Gerar novo token
              const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.createSession({
                user_id: userId
              });
              
              if (!sessionError && sessionData) {
                token = sessionData.access_token;
                // logger.info(`Novo token gerado com sucesso para usuário ${userId}`);
                
                // Definir cookie com o novo token
                res.cookie('authToken', token, {
                  httpOnly: true,
                  secure: process.env.NODE_ENV === 'production',
                  maxAge: 24 * 60 * 60 * 1000 // 1 dia
                });
              } else {
                logger.error(`Erro ao gerar novo token: ${sessionError?.message || 'Erro desconhecido'}`);
              }
            } else {
              logger.error(`Erro ao recuperar usuário por ID: ${userError?.message || 'Usuário não encontrado'}`);
              throw new Error('Usuário não encontrado');
            }
          } else {
            logger.error('Token inválido: não contém ID do usuário');
            throw new Error('Token inválido');
          }
        } else {
          logger.error('Formato de token inválido');
          throw new Error('Formato de token inválido');
        }
      } catch (recoveryError) {
        logger.error(`Falha na recuperação de usuário: ${recoveryError.message}`);
        
        // Limpar cookies inválidos
        res.clearCookie('authToken');
        
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(401).json({
            success: false,
            message: 'Token inválido ou expirado. Faça login novamente.'
          });
        }
        
        // Para acesso web, redirecionar para o login com parâmetro redirect
        const redirectUrl2 = encodeURIComponent(req.originalUrl);
        // logger.info(`Redirecionando para o login após falha de recuperação: redirect=${redirectUrl2}`);
        
        // Verificar se é cliente React
        const isReactClient = !req.headers['accept'] || req.headers['accept'].includes('text/html');
        
        if (isReactClient) {
          // Aplicativo React - redirecionar para a rota base
          const loginPath = getReactLoginUrl(req, req.originalUrl, 'Sua sessão expirou. Faça login novamente.');
          
          // logger.info(`Redirecionando cliente React para: ${loginPath}`);
          return res.redirect(loginPath);
        } else {
          // Cliente tradicional
          return res.redirect(`/login?redirect=${redirectUrl2}&message=Sua sessão expirou. Faça login novamente.`);
        }
      }
    }
    
    if (!user) {
      logger.error('Usuário não encontrado após todas as tentativas de recuperação');
      
      // Limpar cookies inválidos
      res.clearCookie('authToken');
      
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não encontrado. Faça login novamente.'
        });
      }
      
      // Para acesso web, redirecionar para o login com parâmetro redirect
      const redirectUrl3 = encodeURIComponent(req.originalUrl);
      // logger.info(`Redirecionando para o login após usuário não encontrado: redirect=${redirectUrl3}`);
      
      // Verificar se é cliente React
      const isReactClient = !req.headers['accept'] || req.headers['accept'].includes('text/html');
      
      if (isReactClient) {
        // Aplicativo React - redirecionar para a rota base
        const loginPath = getReactLoginUrl(req, req.originalUrl, 'Sua sessão expirou. Faça login novamente.');
        
        // logger.info(`Redirecionando cliente React para: ${loginPath}`);
        return res.redirect(loginPath);
      } else {
        // Cliente tradicional
        return res.redirect(`/login?redirect=${redirectUrl3}&message=Sua sessão expirou. Faça login novamente.`);
      }
    }
    
    // Verificar se o usuário tem metadados
    if (!user.user_metadata) {
      user.user_metadata = {};
      // logger.info(`Inicializando user_metadata para o usuário ${user.id}`);
    }
    
    // // DEBUG: Imprimir ID do usuário para diagnóstico
    // logger.info(`DEBUG: ID do usuário: "${user.id}"`);
    
    // IMPORTANTE: Verificar e criar o perfil do usuário se não existir
    // Chama a função para qualquer tipo de autenticação (formulário ou OAuth)
    const profileCreated = await ensureUserProfile(user);
    // logger.info(`Resultado da verificação/criação de perfil: ${profileCreated ? 'sucesso' : 'falha'}`);

    // Verificar e tentar corrigir os metadados do usuário
    try {
      // Se não temos full_name nos metadados, mas temos first_name e last_name, vamos construir
      if (!user.user_metadata.full_name && user.user_metadata.first_name) {
        // Construir o nome completo a partir do primeiro e último nome
        const firstName = user.user_metadata.first_name || '';
        const lastName = user.user_metadata.last_name || '';
        user.user_metadata.full_name = firstName + (firstName && lastName ? ' ' : '') + lastName;
        
        // logger.info(`Full name construído para o usuário ${user.id}: ${user.user_metadata.full_name}`);
        
        // Tentar atualizar os metadados no Supabase
        try {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...user.user_metadata
            }
          });
          
          if (updateError) {
            logger.warn(`Não foi possível atualizar metadados do usuário ${user.id}: ${updateError.message}`);
          } else {
            // logger.info(`Metadados do usuário ${user.id} atualizados com sucesso`);
          }
        } catch (updateErr) {
          logger.warn(`Erro ao atualizar metadados do usuário ${user.id}: ${updateErr.message}`);
        }
      }
      
      // Se não temos um perfil na tabela user_profiles, tenta criar um com os metadados
      if (!user.profile) {
        // logger.info(`Perfil não encontrado para o usuário ${user.id}, tentando criar...`);
        
        // Verificar se a tabela user_profiles existe
        await checkAndCreateTables();
        
        // Verificar primeiro se o perfil já existe
        try {
          const { data: existingProfile, error: searchError } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
            
          if (searchError) {
            logger.warn(`Erro ao verificar perfil existente para ${user.id}: ${searchError.message}`);
          }
          
          // Se o perfil já existe, apenas use-o
          if (existingProfile) {
            // logger.info(`Perfil já existe para o usuário ${user.id}, usando o existente`);
            user.profile = existingProfile;
          } else {
            // Criar um perfil apenas se não existir
            try {
              const { data: insertData, error: insertError } = await supabaseAdmin
                .from('user_profiles')
                .insert({
                  id: user.id,
                  email: user.email,
                  first_name: user.user_metadata?.first_name || '',
                  last_name: user.user_metadata?.last_name || '',
                  full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
                  avatar_url: user.user_metadata?.avatar_url || '',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .maybeSingle();
              
              if (insertError) {
                // Se ainda houver erro de duplicação, tente buscar o perfil novamente
                if (insertError.message && insertError.message.includes('duplicate key value')) {
                  // logger.info(`Ocorreu conflito ao inserir perfil. Buscando perfil existente para ${user.id}...`);
                  
                  const { data: existingProfileRetry, error: retryError } = await supabaseAdmin
                    .from('user_profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();
                    
                  if (!retryError && existingProfileRetry) {
                    // logger.info(`Perfil encontrado após conflito para o usuário ${user.id}`);
                    user.profile = existingProfileRetry;
                  } else {
                    logger.warn(`Não foi possível recuperar perfil após conflito: ${retryError?.message || 'Perfil não encontrado'}`);
                  }
                } else {
                  logger.warn(`Não foi possível criar perfil para o usuário ${user.id}: ${insertError.message}`);
                }
              } else if (insertData) {
                // logger.info(`Perfil criado com sucesso para o usuário ${user.id}`);
                user.profile = insertData;
              }
            } catch (insertErr) {
              logger.warn(`Erro ao inserir perfil para o usuário ${user.id}: ${insertErr.message}`);
            }
          }
        } catch (checkErr) {
          logger.warn(`Erro ao verificar perfil existente para o usuário ${user.id}: ${checkErr.message}`);
        }
      }
    } catch (metadataErr) {
      logger.error(`Erro ao processar metadados do usuário ${user.id}: ${metadataErr.message}`);
    }
    
    // Adicionar o displayName para facilitar
    if (!user.displayName) {
      // Prioridade para exibição:
      // 1. full_name dos metadados ou perfil
      // 2. combinação de first_name + last_name
      // 3. first_name
      // 4. email
      // 5. "Usuário" (genérico)
      
      const metadata = user.user_metadata || {};
      const profile = user.profile || {};
      
      logger.info(`[requireAuth] Definindo displayName para usuário ${user.id}:`, {
        metadata_full_name: metadata.full_name,
        metadata_first_name: metadata.first_name,
        metadata_last_name: metadata.last_name,
        profile_full_name: profile.full_name,
        profile_first_name: profile.first_name,
        profile_last_name: profile.last_name,
        user_email: user.email
      });
      
      // Obter o nome completo de metadados ou perfil
      if (metadata.full_name) {
        user.displayName = metadata.full_name;
        logger.info(`[requireAuth] Usando full_name dos metadados para displayName: ${user.displayName}`);
      } else if (profile.full_name) {
        user.displayName = profile.full_name;
        logger.info(`[requireAuth] Usando full_name do perfil para displayName: ${user.displayName}`);
      } 
      // Tentar construir a partir de first_name + last_name
      else if (metadata.first_name && metadata.last_name) {
        user.displayName = `${metadata.first_name} ${metadata.last_name}`;
        logger.info(`[requireAuth] Usando first_name + last_name dos metadados para displayName: ${user.displayName}`);
      } else if (profile.first_name && profile.last_name) {
        user.displayName = `${profile.first_name} ${profile.last_name}`;
        logger.info(`[requireAuth] Usando first_name + last_name do perfil para displayName: ${user.displayName}`);
      }
      // Usar apenas first_name
      else if (metadata.first_name) {
        user.displayName = metadata.first_name;
        logger.info(`[requireAuth] Usando first_name dos metadados para displayName: ${user.displayName}`);
      } else if (profile.first_name) {
        user.displayName = profile.first_name;
        logger.info(`[requireAuth] Usando first_name do perfil para displayName: ${user.displayName}`);
      }
      // Usar email como último recurso antes do genérico
      else if (user.email) {
        // Tentar extrair um nome do email, por exemplo luizfiorimr@email.com -> Luizfiorimr
        const emailName = user.email.split('@')[0];
        user.displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        logger.info(`[requireAuth] Usando email para displayName: ${user.displayName}`);
      } else {
        // Último recurso - nome genérico
        user.displayName = 'Usuário';
        logger.info(`[requireAuth] Usando nome genérico para displayName: ${user.displayName}`);
      }
      
      // Verificar se o displayName está vazio por algum motivo e definir um fallback
      if (!user.displayName || user.displayName.trim() === '') {
        // Checar se temos o email como último recurso
        if (user.email) {
          const emailName = user.email.split('@')[0];
          user.displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
          logger.info(`[requireAuth] Definindo displayName a partir do email como fallback: ${user.displayName}`);
        } else {
          user.displayName = 'Usuário';
          logger.info(`[requireAuth] Definindo displayName genérico como último recurso`);
        }
      }
    }
    
    // Log para debugging do displayName
    logger.info(`[requireAuth] Usuário final: ID=${user.id}, Email=${user.email}, DisplayName="${user.displayName}"`);
    
    // Usuário está autenticado, adicionar ao objeto de requisição para uso posterior
    req.user = user;
    // Adicionar indicador de que este usuário foi autenticado via JWT
    req.user.auth_method = 'jwt';
    req.token = token;
    
    // logger.info(`Usuário autenticado: ${user.email}, ID: ${user.id}`);
    
    // Garantir que o token esteja nos cookies para futuras requisições
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 1 dia
    });
    
    next();
  } catch (err) {
    logger.error(`Erro no middleware de autenticação: ${err.message}`, err);
    
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao processar autenticação'
      });
    }
    
    return res.status(500).render('error', {
      message: 'Erro ao processar autenticação',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
};

/**
 * Middleware para verificar se o usuário pertence a uma organização
 */
const requireOrganization = async (req, res, next) => {
  try {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Acesso não autorizado' });
    }

    // Buscar organizações do usuário
    const { data: organizations, error } = await supabase
      .from('organization_members')
      .select('organization_id, organizations(id, name, slug)')
      .eq('user_id', req.user.id);

    if (error) {
      logger.error('Erro ao buscar organizações:', error.message);
      return res.status(500).json({ success: false, message: 'Erro ao verificar organização' });
    }

    if (!organizations || organizations.length === 0) {
      // Verificar se é API ou web
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Você não pertence a nenhuma organização',
          redirect: '/organizations/new'
        });
      }
      
      // Redirecionar para criar organização
      return res.redirect('/organizations/new?message=Você precisa criar ou participar de uma organização&success=false');
    }

    // Adicionar organizações ao objeto req
    req.organizations = organizations.map(org => ({
      id: org.organization_id,
      name: org.organizations?.name,
      slug: org.organizations?.slug
    }));

    next();
  } catch (err) {
    logger.error('Erro no middleware de organização:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

/**
 * Middleware para verificar se o usuário é administrador da organização
 */
const requireAdmin = async (req, res, next) => {
  // logger.warn('[ADMIN] Entrou no middleware requireAdmin');
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Acesso não autorizado' });
    }

    // Buscar o perfil do usuário no banco usando supabaseAdmin
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    // logger.warn(`[ADMIN DEBUG] Resultado profile:`, profile, 'Erro:', error);

    if (error || !profile) {
      // logger.warn('[ADMIN] Perfil não encontrado ou erro ao buscar role.');
      return res.status(403).json({ success: false, message: 'Acesso restrito a administradores' });
    }

    // Permitir qualquer valor de role
    if (!profile.role) {
      // logger.warn('[ADMIN] Usuário sem role definido no perfil.');
      return res.status(403).json({ success: false, message: 'Acesso restrito a administradores' });
    }

    // logger.warn(`[ADMIN] Usuário com role "${profile.role}" permitido.`);
    return next();
  } catch (err) {
    logger.error('Erro no middleware de administrador:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

/**
 * Função para verificar se as tabelas necessárias existem e criá-las caso não existam
 */
async function checkAndCreateTables() {
  try {
    // logger.info('Verificando tabelas do sistema...');
    
    let tableExists = false;
    
    // Verificar se a tabela user_profiles existe usando RPC
    try {
      const { data: tablesData, error: tablesError } = await supabaseAdmin.rpc('check_table_exists', { 
        table_name: 'user_profiles' 
      });
      
      if (!tablesError && tablesData !== null) {
        tableExists = tablesData === true;
        // logger.info(`Verificação via RPC: tabela user_profiles ${tableExists ? 'existe' : 'não existe'}`);
      } else {
        logger.warn(`Erro ao verificar tabela via RPC: ${tablesError?.message || 'Resposta inválida'}`);
        throw new Error('Falha na verificação via RPC');
      }
    } catch (rpcError) {
      logger.warn(`Função RPC indisponível: ${rpcError.message}`);
      
      // Método alternativo: verificar diretamente com SQL
      // logger.info('Tentando verificar tabela diretamente com SQL...');
      
      try {
        // Usar from() com uma query simples para verificar se a tabela existe
        const { data: directCheckData, error: directCheckError } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .limit(1);
        
        // Se não há erro ou é apenas "relation does not exist", sabemos o status da tabela
        if (directCheckError && directCheckError.message.includes('relation "user_profiles" does not exist')) {
          tableExists = false;
          // logger.info(`Verificação direta: tabela user_profiles não existe`);
        } else if (!directCheckError) {
          tableExists = true;
          // logger.info(`Verificação direta: tabela user_profiles existe`);
        } else {
          logger.warn(`Erro na verificação direta: ${directCheckError?.message || 'Sem dados'}`);
          // Assumir que a tabela não existe para tentar criá-la
          tableExists = false;
        }
      } catch (sqlError) {
        logger.error(`Erro ao executar verificação direta: ${sqlError.message}`);
        // Assumir que a tabela não existe para tentar criá-la
        tableExists = false;
      }
    }
    
    // Se a tabela não existir, criá-la
    if (!tableExists) {
      // logger.warn(`Tabela 'user_profiles' não encontrada. Tentando criar...`);
      
      // SQL para criação da tabela user_profiles
      const createProfilesSQL = `
        CREATE TABLE IF NOT EXISTS public.user_profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT UNIQUE,
          first_name TEXT,
          last_name TEXT,
          full_name TEXT,
          avatar_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Criar índice para buscas por email
        CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
        
        -- Comentário na tabela
        COMMENT ON TABLE public.user_profiles IS 'Perfis de usuários da plataforma';
      `;
      
      // Tentar criar a tabela usando RPC
      try {
        const { error: createError } = await supabaseAdmin.rpc('execute_sql', { 
          sql_query: createProfilesSQL 
        });
        
        if (createError) {
          logger.error(`Erro ao criar tabela via RPC: ${createError.message}`);
          throw new Error('Falha ao criar tabela via RPC');
        } else {
          // logger.info(`Tabela 'user_profiles' criada com sucesso via RPC!`);
          return;
        }
      } catch (rpcCreateError) {
        logger.warn(`Função RPC execute_sql indisponível: ${rpcCreateError.message}`);
        
        // Método alternativo: executar SQL diretamente
        // logger.info('Tentando criar tabela diretamente com SQL...');
        
        try {
          // Tentar usar uma abordagem alternativa sem .sql()
          // Em vez de executar SQL diretamente, usamos uma operação que force a criação se necessário
          // logger.info(`Tentativa de criação de tabela não suportada pelo cliente JavaScript do Supabase.`);
          logger.error(`Para resolver este problema, você precisa:`);
          logger.error(`1. Acessar o painel do Supabase (https://supabase.com/dashboard)`);
          logger.error(`2. Ir na seção 'SQL Editor'`);
          logger.error(`3. Executar o SQL de criação da tabela user_profiles manualmente`);
          logger.error(`4. Ou usar uma migração apropriada através do CLI do Supabase`);
          
        } catch (createError) {
          logger.error(`Erro ao tentar alternativa de criação: ${createError.message}`);
          logger.error(`A tabela user_profiles deve ser criada manualmente no painel do Supabase.`);
        }
      }
    } else {
      // logger.info(`Tabela 'user_profiles' verificada e está disponível.`);
    }
  } catch (err) {
    logger.error(`Erro ao verificar e criar tabelas: ${err.message}`);
    // Não interrompe o fluxo, apenas registra o erro
  }
}

// Middleware para verificar se o usuário está autenticado em rotas da API
const isAuthenticatedApi = async (req, res, next) => {
  try {
    // Inicializa um estado padrão de autenticação
    req.isAuthenticated = false;
    
    // Verificar token em diferentes fontes
    let accessToken = null;
    
    // Verificar no header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      accessToken = req.headers.authorization.split(' ')[1];
    }
    
    // Verificar nos cookies se não encontrou no header
    if (!accessToken && req.cookies && req.cookies.authToken) {
      accessToken = req.cookies.authToken;
    }
    
    // Verificar nos parâmetros de query (útil para WebSockets)
    if (!accessToken && req.query && req.query.token) {
      accessToken = req.query.token;
    }
    
    // Se não encontrou token em nenhum lugar, retornar erro
    if (!accessToken) {
      // logger.info('API: Sem token de autenticação');
      return res.status(401).json({
        success: false,
        message: 'Acesso negado: Token não fornecido'
      });
    }
    
    // Verificar se o token é válido
    let tokenPayload = null;
    let tokenUser = null;
    
    try {
      // Obter informações do usuário usando o token
      const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
      
      if (userError) {
        // logger.warn(`API: Erro ao obter usuário pelo token: ${userError.message}`);
        
        // Se o erro indica token expirado, tentar renovar
        if (userError.message.includes('expired') || userError.message.includes('invalid')) {
          // logger.info('API: Token expirado ou inválido, tentando renovar');
          
          // Verificar se temos refresh token
          const refreshToken = req.cookies.refreshToken;
          
          if (refreshToken) {
            // Tenta renovar a sessão usando o refresh token
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
              refresh_token: refreshToken
            });
            
            if (!refreshError && refreshData?.session) {
              // Sessão renovada com sucesso
              // logger.info('API: Sessão renovada com sucesso no middleware');
              
              // Atualizar cookies
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
              
              // Usar o novo token para obter os dados do usuário
              const { data: newUserData, error: newUserError } = await supabase.auth.getUser(refreshData.session.access_token);
              
              if (!newUserError && newUserData?.user) {
                tokenUser = newUserData.user;
                // logger.info(`API: Usuário recuperado após renovação do token: ${tokenUser.id}`);
                
                // Configurar o payload do token
                tokenPayload = { sub: tokenUser.id, email: tokenUser.email };
                accessToken = refreshData.session.access_token;
              } else {
                logger.error('API: Erro ao obter usuário após renovação do token:', newUserError?.message);
                return res.status(401).json({
                  success: false,
                  message: 'Erro ao renovar sessão. Por favor, faça login novamente.'
                });
              }
            } else {
              logger.error('API: Erro ao renovar sessão:', refreshError?.message);
              return res.status(401).json({
                success: false,
                message: 'Erro ao renovar sessão. Por favor, faça login novamente.'
              });
            }
          } else {
            // logger.warn('API: Sem refresh token disponível para renovação');
            return res.status(401).json({
              success: false,
              message: 'Sessão expirada. Por favor, faça login novamente.'
            });
          }
        } else {
          // Outro tipo de erro na verificação do token
          logger.error('API: Erro na verificação do token:', userError.message);
          return res.status(401).json({
            success: false,
            message: 'Erro de autenticação. Por favor, faça login novamente.'
          });
        }
      } else if (userData?.user) {
        // Token válido, usuário encontrado
        tokenUser = userData.user;
        tokenPayload = { sub: tokenUser.id, email: tokenUser.email };
        // logger.info(`API: Usuário autenticado: ${tokenUser.id}`);
      } else {
        logger.warn('API: Token válido mas usuário não encontrado');
        return res.status(401).json({
          success: false,
          message: 'Usuário não encontrado. Por favor, faça login novamente.'
        });
      }
    } catch (tokenErr) {
      logger.error('API: Erro ao processar token:', tokenErr.message);
      return res.status(401).json({
        success: false,
        message: 'Erro de autenticação. Por favor, faça login novamente.'
      });
    }
    
    // Se chegou aqui, o token é válido e temos o payload
    if (tokenPayload && tokenUser) {
      // Marcar a requisição como autenticada
      req.isAuthenticated = true;
      
      // Obter usuário completo da base de dados
      const userId = tokenPayload.sub;
      
      try {
        // Buscar dados completos do usuário
        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .select('*, organizations(*)')
          .eq('id', userId)
          .single();
        
        if (userError) {
          logger.error('API: Erro ao buscar usuário:', userError.message);
          return res.status(401).json({
            success: false,
            message: 'Erro ao buscar dados do usuário.'
          });
        }
        
        if (!user) {
          logger.warn(`API: Usuário não encontrado na base de dados: ${userId}`);
          return res.status(401).json({
            success: false,
            message: 'Usuário não encontrado.'
          });
        }
        
        // Preparar metadados do usuário
        let userMetadata = tokenUser.user_metadata || {};
        
        // Garantir que temos dados completos
        if (!user.email && tokenUser.email) {
          user.email = tokenUser.email;
        }
        
        if (!user.name && userMetadata.name) {
          user.name = userMetadata.name;
        }
        
        // Definir o usuário na requisição
        req.user = user;
        req.userId = userId;
        req.accessToken = accessToken;
        
        // Definir o usuário também em res.locals para acesso nos templates
        res.locals.user = user;
        res.locals.userId = userId;
        
        // logger.info(`API: Usuário autenticado e configurado: ${user.id} (${user.email})`);
        
        // Prosseguir para a próxima middleware
        return next();
      } catch (dbError) {
        logger.error('API: Erro ao processar dados do usuário:', dbError.message);
        return res.status(500).json({
          success: false,
          message: 'Erro interno. Por favor, tente novamente.'
        });
      }
    } else {
      // Não foi possível autenticar
      logger.warn('API: Falha na autenticação: token inválido ou usuário não encontrado');
      return res.status(401).json({
        success: false,
        message: 'Erro de autenticação. Por favor, faça login novamente.'
      });
    }
  } catch (err) {
    logger.error('API: Erro no middleware de autenticação:', err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno. Por favor, tente novamente.'
    });
  }
};

// Middleware para preparar os dados do usuário para o frontend
const prepareUserData = async (req, res, next) => {
  try {
    // Se o usuário já foi autenticado, preparar seus dados
    if (req.isAuthenticated && req.user) {
      // Garantir que temos res.locals inicializado
      if (!res.locals) res.locals = {};
      
      // Atribuir usuário e ID aos locals para acesso nas views
      res.locals.user = req.user;
      res.locals.userId = req.user.id;
      
      // logger.info(`Dados do usuário preparados para a view: ${req.user.id}`);
    } else if (req.userId) {
      // Se temos apenas o ID do usuário, buscar dados completos
      try {
        // Buscar dados completos do usuário
        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .select('*, organizations(*)')
          .eq('id', req.userId)
          .single();
        
        if (!userError && user) {
          // Garantir que temos res.locals inicializado
          if (!res.locals) res.locals = {};
          
          // Atribuir usuário e ID aos locals
          req.user = user;
          res.locals.user = user;
          res.locals.userId = user.id;
          
          // logger.info(`Dados do usuário recuperados e preparados: ${user.id}`);
        } else {
          logger.warn(`Não foi possível recuperar dados do usuário: ${req.userId} - ${userError?.message}`);
        }
      } catch (userErr) {
        logger.error('Erro ao buscar dados do usuário:', userErr);
      }
    }
  } catch (err) {
    logger.error('Erro ao preparar dados do usuário:', err);
    // Continuar mesmo com erro
  }
  
  next();
};

// Middleware para dados comuns em todas as views
const commonViewData = (req, res, next) => {
  try {
    // Garantir que temos res.locals inicializado
    if (!res.locals) res.locals = {};
    
    // Se o usuário não foi definido em res.locals mas está disponível em req
    if (!res.locals.user && req.user) {
      res.locals.user = req.user;
      res.locals.userId = req.user.id;
      // logger.info('Usuário copiado de req.user para res.locals.user');
    }
    
    // Definir variáveis globais para todas as views
    res.locals.appName = process.env.APP_NAME || 'Meu App';
    res.locals.appVersion = process.env.APP_VERSION || '1.0.0';
    res.locals.appEnv = process.env.NODE_ENV || 'development';
    res.locals.currentYear = new Date().getFullYear();
    
    // Adicionar informações sobre a requisição atual
    res.locals.currentPath = req.path;
    res.locals.currentUrl = req.originalUrl;
    res.locals.isAuthenticated = req.isAuthenticated || false;
    
    // logger.info(`Dados comuns preparados para a view: ${req.path}`);
  } catch (err) {
    logger.error('Erro ao preparar dados comuns para a view:', err);
    // Continuar mesmo com erro
  }
  
  next();
};

// Exportações do módulo
module.exports = {
  requireAuth,
  requireOrganization,
  requireAdmin,
  checkAndCreateTables,
  isAuthenticatedApi,
  prepareUserData,
  commonViewData,
  ensureUserProfile
};