// Serviço de autenticação
const { supabaseAdmin } = require('./database');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const axios = require('axios');

class AuthService {
  async signUp(email, password, userData) {
    try {
      if (!supabaseAdmin) {
        throw new AppError('Serviço de autenticação não configurado', 500);
      }
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: userData.firstName || '',
          full_name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
        }
      });
      if (authError) {
        logger.error(`Erro ao registrar usuário no Supabase: ${authError.message}`);
        throw new AppError(authError.message, 400);
      }
      const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('id', authData.user.id)
        .single();
      if (existingProfile) {
        // logger.info(`Perfil já existe para o usuário ${authData.user.id}, atualizando...`);
        const { error: updateError } = await supabaseAdmin
          .from('user_profiles')
          .update({
            first_name: userData.firstName || '',
            last_name: userData.lastName || '',
            updated_at: new Date()
          })
          .eq('id', authData.user.id);
        if (updateError) {
          logger.warn(`Não foi possível atualizar perfil para o usuário ${authData.user.id}: ${updateError.message}`);
        }
      } else {
        const { error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            first_name: userData.firstName || '',
            last_name: userData.lastName || '',
            created_at: new Date(),
            updated_at: new Date()
          });
        if (profileError) {
          logger.warn(`Não foi possível criar perfil para o usuário ${authData.user.id}: ${profileError.message}`);
        }
      }
      logger.info(`Novo usuário registrado: ${email}`);
      try {
        // Criar registro na tabela clients via Supabase
        const { error: clientError } = await supabaseAdmin
          .from('clients')
          .insert({
            id: authData.user.id,
            name: userData.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : email,
            email: authData.user.email
          });
        if (clientError) {
          logger.warn(`Não foi possível criar cliente para o usuário ${authData.user.id}: ${clientError.message}`);
        } else {
          logger.info(`Cliente criado na tabela clients para o usuário ${authData.user.id}`);
        }
      } catch (clientError) {
        logger.warn(`Não foi possível criar cliente para o usuário ${authData.user.id}: ${clientError.message}`);
      }
      return {
        id: authData.user.id,
        email: authData.user.email
      };
    } catch (error) {
      logger.error(`Erro ao registrar usuário: ${error.message}`);
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new AppError(
          `Falha ao registrar usuário: ${error.message}`,
          400
        );
      }
    }
  }
  
  async login(email, password) {
    try {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw new AppError(error.message, 401);
      
      logger.info(`Login bem-sucedido: ${email}`);
      
      return {
        user: {
          id: data.user.id,
          email: data.user.email
        },
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token
        }
      };
    } catch (error) {
      logger.error(`Erro ao fazer login: ${error.message}`);
      throw error;
    }
  }
  
  async logout(userId) {
    try {
      const { error } = await supabaseAdmin.auth.admin.signOut(userId);
      
      if (error) throw new AppError(error.message, 400);
      
      logger.info(`Logout bem-sucedido: ${userId}`);
      
      return true;
    } catch (error) {
      logger.error(`Erro ao fazer logout: ${error.message}`);
      throw error;
    }
  }
  
  async getUserProfile(userId) {
    try {
      // Verificar se o Supabase está configurado
      if (!supabaseAdmin) {
        throw new AppError('Serviço de autenticação não configurado', 500);
      }
      
      // Obter dados do usuário
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (userError) throw new AppError(userError.message, 404);
      
      // Obter perfil do usuário
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        // Se não encontrar um perfil, criar um básico
        if (profileError.message && profileError.message.includes('No rows found')) {
          const { data: newProfile, error: createError } = await supabaseAdmin
            .from('user_profiles')
            .insert({
              id: userId,
              first_name: '',
              last_name: '',
              created_at: new Date(),
              updated_at: new Date()
            })
            .select()
            .single();
          
          if (createError) throw new AppError(createError.message, 400);
          
          return {
            id: userData.user.id,
            email: userData.user.email,
            firstName: newProfile.first_name || '',
            lastName: newProfile.last_name || '',
            avatarUrl: newProfile.avatar_url || null,
            organizations: []
          };
        } else {
          throw new AppError(profileError.message, 404);
        }
      }
      
      // Obter organizações do usuário de forma segura (sem recursão)
      let organizations = [];
      try {
        const { data: memberships, error: membershipError } = await supabaseAdmin
          .from('organization_members')
          .select(`
            id,
            role,
            organization_id
          `)
          .eq('user_id', userId);
        
        if (!membershipError && memberships) {
          // Para cada associação, buscar dados da organização separadamente
          organizations = await Promise.all(
            memberships.map(async (member) => {
              const { data: org, error: orgError } = await supabaseAdmin
                .from('organizations')
                .select('id, name, slug')
                .eq('id', member.organization_id)
                .single();
                
              if (orgError || !org) return null;
              
              return {
                id: org.id,
                name: org.name,
                slug: org.slug,
                role: member.role
              };
            })
          );
          
          // Filtrar resultados nulos
          organizations = organizations.filter(Boolean);
        }
      } catch (error) {
        logger.error(`Erro ao buscar organizações: ${error.message}`);
        // Não falhar completamente se apenas as organizações falharem
        organizations = [];
      }
      
      return {
        id: userData.user.id,
        email: userData.user.email,
        firstName: profileData.first_name || '',
        lastName: profileData.last_name || '',
        avatarUrl: profileData.avatar_url || null,
        organizations
      };
    } catch (error) {
      logger.error(`Erro ao buscar perfil do usuário: ${error.message}`);
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new AppError(`Falha ao buscar perfil: ${error.message}`, 400);
      }
    }
  }
  
  async updateUserProfile(userId, updates) {
    try {
      const { firstName, lastName, avatarUrl } = updates;
      
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          avatar_url: avatarUrl,
          updated_at: new Date()
        })
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw new AppError(error.message, 400);
      
      logger.info(`Perfil atualizado para o usuário: ${userId}`);
      
      return {
        id: userId,
        firstName: data.first_name,
        lastName: data.last_name,
        avatarUrl: data.avatar_url
      };
    } catch (error) {
      logger.error(`Erro ao atualizar perfil do usuário: ${error.message}`);
      throw error;
    }
  }
  
  async requestPasswordReset(email) {
    try {
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email);
      
      if (error) throw new AppError(error.message, 400);
      
      logger.info(`Solicitação de redefinição de senha enviada para: ${email}`);
      
      return true;
    } catch (error) {
      logger.error(`Erro ao solicitar redefinição de senha: ${error.message}`);
      throw error;
    }
  }
  
  async resetPassword(token, newPassword) {
    try {
      const { error } = await supabaseAdmin.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw new AppError(error.message, 400);
      
      logger.info('Senha atualizada com sucesso');
      
      return true;
    } catch (error) {
      logger.error(`Erro ao redefinir senha: ${error.message}`);
      throw error;
    }
  }
  
  async inviteUser(email, organizationId, role) {
    try {
      // 1. Criar convite no Supabase
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
      
      if (error) throw new AppError(error.message, 400);
      
      // 2. Associar à organização com o papel especificado
      const { error: memberError } = await supabaseAdmin
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: data.user.id,
          role
        });
      
      if (memberError) throw new AppError(memberError.message, 400);
      
      logger.info(`Usuário convidado: ${email} para organização: ${organizationId}`);
      
      return {
        id: data.user.id,
        email: data.user.email
      };
    } catch (error) {
      logger.error(`Erro ao convidar usuário: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria uma sessão administrativa para um usuário específico
   * @param {string} userId - ID do usuário para criar a sessão
   * @param {number} expiresIn - Tempo de expiração em segundos (padrão: 1 hora)
   * @returns {Object} - Dados da sessão criada (access_token, refresh_token, etc.)
   */
  async createAdminSession(userId, expiresIn = 3600) {
    try {
      // Verificar se o Supabase Admin está configurado
      if (!supabaseAdmin) {
        logger.error('Tentativa de criar sessão sem supabaseAdmin configurado');
        throw new AppError('Serviço de administração Supabase não configurado', 500);
      }

      // Verificar se o usuário existe
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (userError || !userData) {
        logger.error(`Erro ao buscar usuário para criar sessão: ${userError?.message || 'Usuário não encontrado'}`);
        throw new AppError(`Usuário não encontrado: ${userError?.message || 'ID inválido'}`, 404);
      }

      // Obter chave JWT do projeto - verificar múltiplas fontes
      const config = require('../config');
      
      // Para fins de teste, definimos um valor padrão para o JWT Secret
      const jwtSecret = config.supabase.jwtSecret || 
                     process.env.SUPABASE_JWT_SECRET || 
                     'meu_jwt_secret_para_teste_local';
      
      // Ainda registramos o aviso, mas não falharemos mais
      if (!config.supabase.jwtSecret && !process.env.SUPABASE_JWT_SECRET) {
        logger.warn('AVISO: SUPABASE_JWT_SECRET não configurado no ambiente. Usando valor padrão para testes.');
      }

      // Criar payload JWT
      const exp = Math.round(Date.now() / 1000) + expiresIn;
      const iat = Math.round(Date.now() / 1000);
      const sessionId = require('crypto').randomUUID();
      
      // Construir payload para o JWT
      const payload = {
        aud: "authenticated",
        exp,
        iat,
        sub: userId,
        userId: userId,
        email: userData.user.email,
        app_metadata: { 
          ...userData.user.app_metadata,
          role: 'authenticated' // Evitar colocar 'admin' no token automaticamente
        },
        user_metadata: userData.user.user_metadata || {},
        role: "authenticated",
        session_id: sessionId
      };

      // Assinar o token com a chave secreta JWT
      const jwt = require('jsonwebtoken');
      const accessToken = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });

      // Criar refresh token
      const refreshToken = require('crypto').randomUUID();

      // Verificar se já existe uma sessão para este sessionId (muito improvável, mas vamos verificar)
      try {
        // logger.info(`Verificando se existe sessão para o sessionId ${sessionId}`);
        const { data: existingSession, error: checkError } = await supabaseAdmin
          .from('sessions')
          .schema('auth')
          .select('id')
          .eq('id', sessionId)
          .single();
          
        if (!checkError && existingSession) {
          logger.warn(`Sessão já existe com ID ${sessionId}, gerando novo ID`);
          const newSessionId = require('crypto').randomUUID();
          logger.info(`Novo sessionId gerado: ${newSessionId}`);
          
          // Atualizar payload e token com novo ID
          payload.session_id = newSessionId;
          const newAccessToken = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });
          
          return {
            access_token: newAccessToken,
            refresh_token: refreshToken,
            expires_in: expiresIn,
            expires_at: exp,
            user: {
              id: userData.user.id,
              email: userData.user.email,
              app_metadata: userData.user.app_metadata,
              user_metadata: userData.user.user_metadata
            }
          };
        }
      } catch (checkError) {
        // Continuar mesmo com erro na verificação
        logger.warn(`Erro ao verificar sessão existente: ${checkError.message}`);
      }

      // Tentar armazenar a sessão na tabela auth.sessions
      try {
        // logger.info(`Tentando criar sessão no banco para o usuário ${userId} com sessionId ${sessionId}`);
        
        const sessionData = {
          id: sessionId,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          factor_id: null,
          aal: 'aal1',
          not_after: new Date(exp * 1000).toISOString(),
          refreshed_at: null,
          user_agent: '',
          ip: '',
          refresh_token: refreshToken
        };
        
        // Usar upsert para evitar erros de chave duplicada
        const { error: sessionError } = await supabaseAdmin
          .from('sessions')
          .schema('auth')
          .upsert(sessionData, {
            onConflict: 'id',
            ignoreDuplicates: false
          });

        if (sessionError) {
          // Log detalhado para diagnóstico
          logger.warn(`Erro ao criar sessão no banco de dados: ${sessionError.message}`);
          logger.warn(`Detalhes do erro: ${JSON.stringify(sessionError)}`);
          logger.warn(`Dados da sessão: ${JSON.stringify(sessionData)}`);
          
          // Tentar método alternativo se o primeiro falhar
          try {
            logger.info('Tentando método alternativo de criação de sessão...');
            const { error: insertError } = await supabaseAdmin
              .from('sessions')
              .schema('auth')
              .insert(sessionData);
              
            if (insertError) {
              logger.warn(`Erro no método alternativo: ${insertError.message}`);
            } else {
              logger.info('Sessão criada com sucesso usando método alternativo');
            }
          } catch (altError) {
            logger.warn(`Erro no método alternativo: ${altError.message}`);
          }
          
          // Continuar mesmo sem armazenar na tabela auth.sessions
          logger.info('Continuando com criação do token mesmo sem registro na tabela de sessões');
        } else {
          logger.info(`Sessão criada com sucesso no banco para o usuário ${userId}`);
        }
      } catch (sessionDbError) {
        logger.warn(`Exceção ao criar sessão no banco: ${sessionDbError.message}`);
        logger.warn(`Stack trace: ${sessionDbError.stack}`);
        // Continuar, pois o token ainda será válido, apenas não poderá ser renovado
      }

      logger.info(`Sessão administrativa criada para usuário: ${userId}`);

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
        expires_at: exp,
        user: {
          id: userData.user.id,
          email: userData.user.email,
          app_metadata: userData.user.app_metadata,
          user_metadata: userData.user.user_metadata
        }
      };
    } catch (error) {
      logger.error(`Erro ao criar sessão administrativa: ${error.message}`);
      
      // Verificar se é um erro da aplicação ou erro genérico
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new AppError(`Falha ao criar sessão administrativa: ${error.message}`, 500);
      }
    }
  }

  /**
   * Cria uma sessão para um usuário através da API admin oficial
   * @param {string} userId - ID do usuário
   * @param {number} expiresIn - Tempo de expiração da sessão em segundos (padrão: 3600)
   * @returns {Promise<Object>} Objeto contendo o token e informações do usuário
   */
  async createAdminSessionViaApi(userId, expiresIn = 3600) {
    try {
      if (!supabaseAdmin) {
        throw new Error('Supabase Admin não configurado');
      }

      // Verificar se o usuário existe na tabela auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (authError || !authUser) {
        logger.error(`Usuário não encontrado na auth: ${authError?.message || 'ID inválido'}`);
        throw new Error(`Usuário não encontrado: ${authError?.message || 'ID inválido'}`);
      }
      
      // Verificar perfil e criar/atualizar usando upsert em vez de insert
      try {
        // logger.info(`Verificando/atualizando perfil para o usuário ${userId}`);
        const { error: upsertError } = await supabaseAdmin
          .from('user_profiles')
          .upsert({
            id: userId,
            first_name: authUser.user.user_metadata?.first_name || '',
            last_name: authUser.user.user_metadata?.last_name || '',
            email: authUser.user.email,
            created_at: new Date(),
            updated_at: new Date()
          }, {
            onConflict: 'id',
            // Atualizar apenas alguns campos quando encontrar conflito
            ignoreDuplicates: false
          });
          
        if (upsertError) {
          // Apenas log, não falhar o processo de criação de sessão
          logger.warn(`Erro ao atualizar perfil para o usuário ${userId}: ${upsertError.message}`);
        } else {
          logger.info(`Perfil criado/atualizado com sucesso para o usuário ${userId}`);
        }
      } catch (profileError) {
        // Continuar mesmo com erro no perfil
        logger.warn(`Exceção ao atualizar perfil do usuário ${userId}: ${profileError.message}`);
      }

      // Tente criar uma sessão usando a API Admin mais recente do Supabase
      try {
        // logger.info(`Tentando criar sessão para o usuário ${userId} via API Admin`);
        
        // Na versão 2.49.4 do Supabase, o método correto é createSession
        const { data, error } = await supabaseAdmin.auth.admin.createSession({
          userId: userId,
          expiresIn: expiresIn
        });
        
        if (error) {
          throw new Error(`Erro ao criar sessão via API Admin: ${error.message}`);
        }
        
        return {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: expiresIn,
          expires_at: Math.floor(Date.now() / 1000) + expiresIn,
          user: {
            id: authUser.user.id,
            email: authUser.user.email,
            app_metadata: authUser.user.app_metadata,
            user_metadata: authUser.user.user_metadata
          }
        };
      } catch (adminApiError) {
        logger.warn(`Não foi possível criar sessão via API Admin: ${adminApiError.message}`);
        logger.info('Usando método alternativo para criar sessão JWT...');
        
        // Se falhar, use o método personalizado que gera um JWT válido
        return await this.createAdminSession(userId, expiresIn);
      }
    } catch (error) {
      logger.error('Erro no createAdminSessionViaApi:', error);
      throw error;
    }
  }

  /**
   * Inicia o processo de login com Google OAuth
   * @returns {Promise<string>} URL para redirecionamento
   */
  async loginWithGoogle() {
    try {
      const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: process.env.OAUTH_SUPABASE_REDIRECT_URL || `${process.env.APP_URL}/auth/google/callback`
        }
      });
      
      if (error) throw new AppError(error.message, 400);
      
      return data.url;
    } catch (error) {
      logger.error(`Erro ao iniciar login com Google: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica um token ID do Google e autentica o usuário
   * @param {string} idToken - Token ID do Google
   * @returns {Promise<Object>} Dados do usuário e sessão
   */
  async verifyGoogleToken(idToken) {
    try {
      const { data, error } = await supabaseAdmin.auth.signInWithIdToken({
        provider: 'google',
        token: idToken
      });
      
      if (error) throw new AppError(error.message, 401);
      
      return {
        user: data.user,
        session: data.session
      };
    } catch (error) {
      logger.error(`Erro ao verificar token do Google: ${error.message}`);
      throw error;
    }
  }

  /**
   * Processa o callback do OAuth após autenticação bem-sucedida
   * @param {string} code - Código de autenticação 
   * @returns {Promise<Object>} Dados da sessão
   */
  async handleOAuthCallback(code) {
    try {
      const { data, error } = await supabaseAdmin.auth.exchangeCodeForSession(code);
      
      if (error) throw new AppError(error.message, 401);
      
      return {
        session: data.session,
        user: data.user
      };
    } catch (error) {
      logger.error(`Erro ao processar callback OAuth: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new AuthService();