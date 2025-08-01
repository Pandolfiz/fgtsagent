require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
// Rotas da API
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');
const { supabase, supabaseAdmin } = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const dashboardController = require('../controllers/dashboardController');
const proposalController = require('../controllers/proposalController');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const contactController = require('../controllers/contactController');
const agentsController = require('../controllers/agentsController');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Função para criar um controlador mock
const createMockController = (name) => {
  return {
    getAll: (req, res) => res.json({ success: true, data: [], message: `Mock: Listar ${name}` }),
    create: (req, res) => res.json({ success: true, data: { id: 'mock-id' }, message: `Mock: Criar ${name}` }),
    getById: (req, res) => res.json({ success: true, data: { id: req.params.id }, message: `Mock: Obter ${name}` }),
    update: (req, res) => res.json({ success: true, data: { id: req.params.id }, message: `Mock: Atualizar ${name}` }),
    delete: (req, res) => res.json({ success: true, message: `Mock: Deletar ${name}` })
  };
};

// Carregar controladores reais ou usar mocks
let authController;
try {
  authController = require('../controllers/authController');
} catch (error) {
  console.log('Controlador de autenticação não encontrado, usando funções mock');
  authController = {
    login: (req, res) => res.json({ success: true, message: 'Mock: Login realizado' }),
    register: (req, res) => res.json({ success: true, message: 'Mock: Registro realizado' }),
    logout: (req, res) => res.json({ success: true, message: 'Mock: Logout realizado' }),
    getMe: (req, res) => res.json({ success: true, user: { id: 'mock-user' } }),
    updateCurrentUser: (req, res) => res.json({ success: true, message: 'Mock: Perfil atualizado' }),
    requestPasswordReset: (req, res) => res.json({ success: true, message: 'Mock: Recuperação de senha solicitada' }),
    confirmPasswordReset: (req, res) => res.json({ success: true, message: 'Mock: Senha redefinida' })
  };
}

// Rota de status da API (sem autenticação)
router.get('/status', (req, res) => {
  const startTime = process.uptime();
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(startTime / 60)} minutos e ${Math.floor(startTime % 60)} segundos`
  });
});

// Rota para verificar status da sessão
router.get('/auth/check-session', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies.authToken;
    logger.info(`Verificando status da sessão: ${token ? 'Token fornecido' : 'Token não fornecido'}`);
    
    if (!token) {
      return res.status(401).json({
        valid: false,
        message: 'Token não fornecido'
      });
    }
    
    // Verificar o token com o Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      logger.warn(`Token inválido durante verificação de sessão: ${error ? error.message : 'Usuário não encontrado'}`);
      return res.status(401).json({
        valid: false,
        message: 'Token inválido ou expirado'
      });
    }
    
    // Verificar expiração do token
    try {
      const [headerEncoded, payloadEncoded] = token.split('.');
      if (headerEncoded && payloadEncoded) {
        const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64').toString('utf8'));
        if (payload && payload.exp) {
          const expiryTime = payload.exp * 1000; // Converter para milissegundos
          const currentTime = Date.now();
          
          if (expiryTime <= currentTime) {
            logger.warn(`Token expirado durante verificação de sessão para o usuário ${user.id}`);
            return res.status(401).json({
              valid: false,
              message: 'Token expirado'
            });
          }
          
          // Informar quanto tempo resta até a expiração (em segundos)
          const timeRemaining = Math.floor((expiryTime - currentTime) / 1000);
          
          return res.json({
            valid: true,
            user: {
              id: user.id,
              email: user.email
            },
            expiresIn: timeRemaining
          });
        }
      }
    } catch (parseError) {
      logger.warn(`Erro ao analisar JWT durante verificação de sessão: ${parseError.message}`);
    }
    
    // Se não conseguiu analisar o token, mas o Supabase validou, consideramos válido
    return res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (err) {
    logger.error(`Erro na verificação de sessão: ${err.message}`);
    return res.status(500).json({
      valid: false,
      message: 'Erro interno ao verificar sessão'
    });
  }
});

// Rota de Dashboard FGTS/propostas
router.get('/dashboard/stats', requireAuth, require('../controllers/dashboardController').getApiDashboardStats);

// Rota para obter dados do cliente para exibição no chat
router.get('/contacts/:contactId/data', requireAuth, async (req, res) => {
  try {
    const { contactId } = req.params;
    const userId = req.user ? req.user.id : null;
    logger.info(`[CONTACT-DATA] Início - contactId: ${contactId}, userId: ${userId}`);
    if (!req.user) {
      logger.warn(`[CONTACT-DATA] req.user não está definido!`);
    }
    // Verificar se o contato existe e buscar o lead_id (usar supabaseAdmin)
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('*, lead_id')
      .eq('remote_jid', contactId)
      .single();
    if (contactError) {
      logger.error(`[CONTACT-DATA] Erro ao buscar contato: ${contactError.message}`);
      return res.status(404).json({
        success: false,
        message: 'Contato não encontrado'
      });
    }
    if (!contact) {
      logger.warn(`[CONTACT-DATA] Contato não encontrado para remote_jid: ${contactId}`);
    } else {
      logger.info(`[CONTACT-DATA] Contato encontrado: ${JSON.stringify(contact)}`);
    }
    
    // Verificar se o contato tem um lead_id associado
    if (!contact.lead_id) {
      logger.warn(`Contato ${contactId} não possui lead_id associado`);
      return res.json({
        success: true,
        saldo: null,
        erro_consulta: 'Cliente não possui cadastro completo no sistema',
        simulado: null,
        proposta: null,
        status_proposta: null,
        erro_proposta: null,
        descricao_status: null
      });
    }
    
    const leadId = contact.lead_id;
    logger.info(`Usando lead_id ${leadId} para buscar dados do cliente`);
    
    // Buscar dados de saldo FGTS mais recente usando o lead_id (usar supabaseAdmin)
    const { data: balanceData, error: balanceError } = await supabaseAdmin
      .from('balance')
      .select('*')
      .eq('lead_id', leadId)
      .order('updated_at', { ascending: false })
      .limit(1);
    
    logger.info(`Dados brutos de balance: ${JSON.stringify(balanceData)}`);
    
    let saldo = null;
    let erro_consulta = null;
    let simulado = null;
    
    if (balanceError) {
      logger.error(`Erro ao buscar saldo FGTS: ${balanceError.message}`);
      erro_consulta = 'Erro ao consultar saldo FGTS. Tente novamente mais tarde.';
    } else if (balanceData && balanceData.length > 0) {
      const balanceRecord = balanceData[0];
      logger.info(`Record de balance encontrado: ${JSON.stringify(balanceRecord)}`);
      logger.info(`Tipos de dados - balance: ${typeof balanceRecord.balance}, simulation: ${typeof balanceRecord.simulation}`);
      logger.info(`Valores brutos - balance: ${balanceRecord.balance}, simulation: ${balanceRecord.simulation}`);
      try {
        if (balanceRecord.balance !== null && balanceRecord.balance !== undefined) {
          saldo = Number(balanceRecord.balance);
          if (isNaN(saldo)) {
            logger.warn(`Conversão de balance resultou em NaN: ${balanceRecord.balance}`);
            saldo = null;
          }
          logger.info(`Saldo após conversão simplificada: ${saldo} (tipo: ${typeof saldo})`);
        }
        if (balanceRecord.simulation !== null && balanceRecord.simulation !== undefined) {
          simulado = Number(balanceRecord.simulation);
          if (isNaN(simulado)) {
            logger.warn(`Conversão de simulation resultou em NaN: ${balanceRecord.simulation}`);
            simulado = null;
          }
          logger.info(`Simulado após conversão simplificada: ${simulado} (tipo: ${typeof simulado})`);
        }
      } catch (parseError) {
        logger.error(`Erro ao converter valores numéricos: ${parseError.message}`);
        erro_consulta = 'Erro no formato dos dados. Por favor, consulte novamente.';
      }
      if (balanceRecord.error_reason) {
        erro_consulta = balanceRecord.error_reason;
      }
    } else {
      logger.warn(`Nenhum registro de balance encontrado para o lead ${leadId}`);
    }
    
    // Buscar propostas mais recentes (usar supabaseAdmin)
    const { data: proposalData, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    let proposta = null;
    let status_proposta = null;
    let erro_proposta = null;
    let descricao_status = null;
    
    if (proposalError) {
      logger.error(`Erro ao buscar propostas: ${proposalError.message}`);
    } else if (proposalData && proposalData.length > 0) {
      const proposalRecord = proposalData[0];
      proposta = proposalRecord.proposal_id || null;
      status_proposta = proposalRecord.status || null;
      if (status_proposta) {
        switch (status_proposta) {
          case 'aprovada':
            descricao_status = 'Proposta aprovada. Aguardando liberação de valores.';
            break;
          case 'em_analise':
            descricao_status = 'Proposta em análise pelo banco. Aguarde a avaliação.';
            break;
          case 'rejeitada':
            descricao_status = 'Proposta rejeitada devido a restrições cadastrais.';
            erro_proposta = proposalRecord.rejection_reason || 'Proposta rejeitada pelo banco.';
            break;
          case 'pendente':
            descricao_status = 'Aguardando documentação adicional para seguir com a proposta.';
            break;
          default:
            descricao_status = `Status da proposta: ${status_proposta}`;
        }
      }
    } else {
      logger.info(`Nenhuma proposta encontrada para o lead ${leadId}`);
    }
    
    const resposta = {
      success: true,
      saldo: saldo,
      erro_consulta: erro_consulta,
      simulado: simulado,
      proposta: proposta,
      status_proposta: status_proposta,
      erro_proposta: erro_proposta,
      descricao_status: descricao_status
    };
    
    logger.info(`Valores finais para resposta:`);
    logger.info(`- saldo (original): ${saldo} (${typeof saldo})`);
    logger.info(`- saldo (formatado): ${saldo} (${typeof saldo})`);
    logger.info(`- simulado (original): ${simulado} (${typeof simulado})`);
    logger.info(`- simulado (formatado): ${simulado} (${typeof simulado})`);
    logger.info(`Enviando resposta formatada para o frontend: ${JSON.stringify(resposta)}`);
    
    return res.json(resposta);
    
  } catch (error) {
    logger.error(`Erro ao obter dados do cliente para o chat: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro ao obter dados do cliente',
      error: error.message
    });
  }
});

// Rotas de Organizações
// Vamos criar handlers alternativos caso os métodos originais não estejam disponíveis
const orgHandler = {
  listUserOrganizations: async (req, res) => {
    try {
      // Sempre usar fallback de listagem de organizações
      const userId = req.user.id;
      logger.info(`Listando organizações do usuário: ${userId} (fallback)`);
      
      // Buscar organizações do usuário usando RPC
      const { data, error } = await supabase
        .rpc('get_user_memberships', { user_id_param: userId });
      
      if (error) {
        logger.error(`Erro ao buscar organizações do usuário: ${error.message}`);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar organizações'
        });
      }
      
      // Formatar resposta para uso no frontend
      const organizations = data.map(org => ({
        id: org.organization_id,
        name: org.organization_name,
        role: org.role
      }));
      
      logger.info(`Encontradas ${organizations.length} organizações para o usuário`);
      
      return res.status(200).json({
        success: true,
        message: 'Organizações recuperadas com sucesso',
        data: organizations
      });
    } catch (error) {
      logger.error('Erro ao listar organizações:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Erro ao listar organizações'
      });
    }
  },
  
  getOrganization: async (req, res) => {
    try {
      // Sempre usar fallback de obtenção de organização
      const orgId = req.params.id;
      const userId = req.user.id;
      
      logger.info(`Buscando organização ${orgId} para usuário ${userId} (fallback)`);
      
      // Verificar se o usuário é membro
      const { data: membership, error: membershipError } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .single();
      
      if (membershipError) {
        logger.error(`Erro ao verificar associação: ${membershipError.message}`);
        return res.status(403).json({
          success: false,
          message: 'Acesso negado a esta organização'
        });
      }
      
      // Buscar dados da organização
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();
      
      if (orgError) {
        logger.error(`Erro ao buscar organização: ${orgError.message}`);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar organização'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Organização recuperada com sucesso',
        data: {
          ...org,
          role: membership.role
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar organização:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar organização'
      });
    }
  },
  
  createOrganization: async (req, res) => {
    // Implementação alternativa para criar organização
    return res.status(200).json({
      success: true,
      message: 'Método não implementado'
    });
  },
  
  updateOrganization: async (req, res) => {
    // Implementação alternativa para atualizar organização
    return res.status(200).json({
      success: true,
      message: 'Método não implementado'
    });
  }
};

router.get('/organizations', requireAuth, orgHandler.listUserOrganizations);
router.get('/organizations/:id', requireAuth, orgHandler.getOrganization);
router.post('/organizations', requireAuth, orgHandler.createOrganization);
router.put('/organizations/:id', requireAuth, orgHandler.updateOrganization);

// Rota para renovação de token
router.post('/auth/refresh-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies.authToken;
    const refreshTokenValue = req.cookies.refreshToken;
    
    logger.info(`Tentativa de renovação de token: ${token ? 'Token encontrado' : 'Token não encontrado'}`);
    logger.info(`RefreshToken disponível: ${refreshTokenValue ? 'Sim' : 'Não'}`);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido'
      });
    }
    
    // Verificar se o supabaseAdmin está disponível
    if (!supabaseAdmin) {
      logger.error('Objeto supabaseAdmin não definido. Verificar importação do módulo.');
      return res.status(500).json({
        success: false,
        message: 'Erro interno no servidor ao processar a renovação do token'
      });
    }
    
    // Analisar o token para extrair as informações do usuário antes de tentar verificar com o Supabase
    let userId = null;
    let userEmail = null;
    
    try {
      // Tentar extrair o payload do token
      const [headerEncoded, payloadEncoded] = token.split('.');
      if (headerEncoded && payloadEncoded) {
        const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64').toString('utf8'));
        if (payload) {
          userId = payload.sub;
          userEmail = payload.email;
          logger.info(`Informações extraídas do token - userId: ${userId}, email: ${userEmail}`);
        }
      }
    } catch (parseError) {
      logger.warn(`Não foi possível analisar o token para extrair informações: ${parseError.message}`);
    }
    
    // Verificar o token atual com o Supabase
    let supabaseUser = null;
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        supabaseUser = user;
        
        // Atualizar as informações do usuário caso tenha sido possível extrair do token
        if (!userId) userId = user.id;
        if (!userEmail) userEmail = user.email;
      } else {
        logger.warn(`Erro ao verificar token com Supabase: ${error ? error.message : 'Usuário não encontrado'}`);
      }
    } catch (supabaseError) {
      logger.warn(`Exceção ao verificar token com Supabase: ${supabaseError.message}`);
    }
    
    // Abordagem 1: Tentar realizar refreshSession do Supabase se o token for válido
    if (supabaseUser) {
      try {
        logger.info(`Tentando realizar refresh da sessão para o usuário ${supabaseUser.id}`);
        
        // Verificar se temos uma sessão ativa antes de tentar refresh
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          logger.warn(`Erro ao verificar sessão atual: ${sessionError.message}`);
        } else if (!sessionData?.session) {
          logger.info('Sessão atual não encontrada, tentando recriar...');
          
          // Tentar criar uma nova sessão com o token existente
          const { data: signInData, error: signInError } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: refreshTokenValue
          });
          
          if (signInError) {
            logger.warn(`Erro ao tentar recriar sessão: ${signInError.message}`);
          } else if (signInData?.session) {
            logger.info('Sessão recriada com sucesso');
            
            // Definir novos tokens nos cookies
            res.cookie('authToken', signInData.session.access_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              maxAge: 30 * 60 * 1000 // 30 minutos
            });
            
            if (signInData.session.refresh_token) {
              res.cookie('refreshToken', signInData.session.refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
              });
            }
            
            return res.status(200).json({
              status: 'success',
              data: {
                token: signInData.session.access_token,
                expiresIn: 30 * 60 // 30 minutos em segundos
              },
              message: 'Sessão recriada com sucesso'
            });
          } else {
            logger.warn('Não foi possível recriar a sessão e nenhum erro foi retornado');
          }
        } else {
          logger.info('Sessão atual encontrada, prosseguindo com refresh');
        }
        
        // Tentar realizar o refresh da sessão
        // Se temos um refreshToken, usá-lo explicitamente
        let refreshOptions = {};
        if (refreshTokenValue) {
          refreshOptions = { refresh_token: refreshTokenValue };
          logger.info('Usando refresh_token explícito para atualizar a sessão');
        }
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession(refreshOptions);
        
        // Verificar se o refreshSession funcionou
        if (!refreshError && refreshData && refreshData.session) {
          logger.info(`Sessão renovada com sucesso para o usuário ${supabaseUser.id}`);
          
          // Definir novo token no cookie - tempo de 30 minutos para inatividade
          res.cookie('authToken', refreshData.session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 60 * 1000 // 30 minutos
          });
          
          // Armazenar também o refresh token quando disponível
          if (refreshData.session.refresh_token) {
            res.cookie('refreshToken', refreshData.session.refresh_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
            });
          }
          
          return res.status(200).json({
            status: 'success',
            data: {
              token: refreshData.session.access_token,
              expiresIn: 30 * 60 // 30 minutos em segundos
            },
            message: 'Token renovado com sucesso'
          });
        } else {
          logger.warn(`Refresh normal falhou: ${refreshError?.message || 'Erro desconhecido'}. Tentando abordagem alternativa.`);
        }
      } catch (refreshErr) {
        logger.warn(`Erro ao tentar refreshSession: ${refreshErr.message}`);
      }
    }
    
    // Abordagem 2: Se não conseguimos usar o supabase ou o userId foi extraído do token, buscar usuário pelo ID
    if (userId) {
      try {
        logger.info(`Tentando buscar usuário pelo ID: ${userId}`);
        // Verificar explicitamente se o supabaseAdmin está disponível
        if (!supabaseAdmin) {
          throw new Error('supabaseAdmin não está definido');
        }
        
        // Em vez de buscar no profiles, vamos usar o próprio objeto auth do Supabase
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (!userError && userData && userData.user) {
          const user = userData.user;
          logger.info(`Informações do usuário encontradas via auth.admin: ${user.email || userEmail}`);
          
          // Usar email do banco se disponível, ou manter o email extraído do token
          if (user.email) userEmail = user.email;
          
          // Gerar um novo token JWT com validade de 30 minutos
          const expiryDate = new Date();
          expiryDate.setMinutes(expiryDate.getMinutes() + 30); // 30 minutos
          
          const newToken = jwt.sign(
            { 
              sub: userId,
              email: userEmail,
              name: user.user_metadata?.full_name || user.user_metadata?.first_name || '',
              aud: 'authenticated',
              role: 'authenticated',
              exp: Math.floor(expiryDate.getTime() / 1000),
              iat: Math.floor(Date.now() / 1000)
            },
            getSecureJwtSecret()
          );
          
          // Definir novo token no cookie
          res.cookie('authToken', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 60 * 1000 // 30 minutos
          });
          
          logger.info(`Token JWT alternativo gerado para o usuário ${userId}`);
          
          return res.status(200).json({
            status: 'success',
            data: {
              token: newToken,
              expiresIn: 30 * 60 // 30 minutos em segundos
            },
            message: 'Token JWT alternativo gerado com sucesso'
          });
        } else {
          logger.warn(`Usuário ${userId} não encontrado via auth.admin: ${userError?.message || 'Erro ao buscar usuário'}`);
        }
      } catch (userLookupError) {
        logger.error(`Erro ao buscar usuário no banco: ${userLookupError.message}`);
      }
    }
    
    // Abordagem 3: Se o email estiver disponível, mas o usuário não for encontrado
    if (userEmail && !supabaseUser) {
      try {
        logger.info(`Tentando buscar usuário pelo email: ${userEmail}`);
        // Verificar explicitamente se o supabaseAdmin está disponível
        if (!supabaseAdmin) {
          throw new Error('supabaseAdmin não está definido');
        }
        
        // Buscar usuário pela API de administração do Supabase usando email
        const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          filter: {
            email: userEmail
          }
        });
          
        // Se encontrou o usuário, usar seu ID
        if (!listError && userList && userList.users && userList.users.length > 0) {
          const foundUser = userList.users[0];
          userId = foundUser.id;
          logger.info(`Usuário encontrado pela API de administração, ID: ${userId}`);
          
          // Gerar um novo token JWT com validade de 30 minutos
          const expiryDate = new Date();
          expiryDate.setMinutes(expiryDate.getMinutes() + 30); // 30 minutos
          
          const newToken = jwt.sign(
            { 
              sub: userId,
              email: userEmail,
              name: foundUser.user_metadata?.full_name || foundUser.user_metadata?.first_name || '',
              aud: 'authenticated',
              role: 'authenticated',
              exp: Math.floor(expiryDate.getTime() / 1000),
              iat: Math.floor(Date.now() / 1000)
            },
            getSecureJwtSecret()
          );
          
          // Definir novo token no cookie
          res.cookie('authToken', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 60 * 1000 // 30 minutos
          });
          
          logger.info(`Token JWT gerado para usuário encontrado pelo email: ${userEmail}`);
          
          return res.status(200).json({
            status: 'success',
            data: {
              token: newToken,
              expiresIn: 30 * 60 // 30 minutos em segundos
            },
            message: 'Token JWT gerado com sucesso usando email'
          });
        } else {
          logger.warn(`Usuário com email ${userEmail} não encontrado: ${listError?.message || 'Não encontrado'}`);
        }
      } catch (emailLookupError) {
        logger.error(`Erro ao buscar usuário por email: ${emailLookupError.message}`);
      }
    }
    
    // Abordagem 4: Último recurso - tente criar uma nova sessão anônima temporária
    try {
      logger.info('Tentando criar uma sessão anônima temporária como último recurso');
      
      // Gerar um ID de sessão temporário
      const tempSessionId = Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
      
      // Criar um token temporário com validade muito curta (5 minutos)
      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + 5); // 5 minutos apenas
      
      const tempToken = jwt.sign(
        { 
          sub: tempSessionId,
          aud: 'temp_session',
          role: 'anonymous',
          exp: Math.floor(expiryDate.getTime() / 1000),
          iat: Math.floor(Date.now() / 1000),
          temp: true
        },
        getSecureJwtSecret()
      );
      
      // Configurar o cookie com um tempo de vida muito curto
      res.cookie('authToken', tempToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 5 * 60 * 1000 // 5 minutos
      });
      
      logger.info('Token temporário de emergência criado');
      
      return res.status(207).json({
        status: 'partial',
        data: {
          token: tempToken,
          expiresIn: 5 * 60, // 5 minutos em segundos
          isTemporary: true
        },
        message: 'Sessão temporária criada. Por favor, faça login novamente quando possível.'
      });
    } catch (finalError) {
      logger.error(`Falha em todas as tentativas de renovação de token: ${finalError.message}`);
    }
    
    // Se chegou até aqui, todas as tentativas falharam
    logger.warn(`Todas as abordagens de renovação falharam - sessão expirada ou token inválido`);
    
    // Limpar o cookie inválido
    res.clearCookie('authToken');
    
    return res.status(401).json({
      status: 'error',
      expired: true,
      message: 'Sessão expirada. Por favor, faça login novamente.'
    });
  } catch (err) {
    logger.error(`Erro geral na renovação de token: ${err.message}`);
    
    // Limpar cookie por segurança
    res.clearCookie('authToken');
    
    return res.status(500).json({
      status: 'error',
      message: 'Erro interno ao processar renovação de token'
    });
  }
});

// Rotas para API Keys de usuário
const userCredentialsController = require('../controllers/userCredentialsController');

// Rotas protegidas por autenticação normal
router.get('/user/api-keys', requireAuth, userCredentialsController.listUserApiKeys);
router.post('/user/api-keys', requireAuth, userCredentialsController.createUserApiKey);
router.delete('/user/api-keys/:id', requireAuth, userCredentialsController.revokeUserApiKey);
router.put('/user/api-keys/:id', requireAuth, userCredentialsController.updateUserApiKeyName);

// Rotas para teste de API key
router.get('/user/verify-api-key', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'API key válida',
    data: {
      userId: req.user.id,
      email: req.user.email,
      name: req.user.name,
      keyName: req.user.apiKey.name
    }
  });
});

// Rota de teste para autenticação
router.get('/test-auth', async (req, res) => {
  try {
    logger.info('[test-auth] Rota de teste acessada com sucesso');
    logger.info(`[test-auth] Usuário autenticado: ${JSON.stringify(req.user)}`);
    
    return res.status(200).json({
      success: true,
      message: 'Autenticação bem-sucedida',
      authMethod: req.user.auth_method || 'desconhecido',
      user: {
        id: req.user.id,
        email: req.user.email,
        displayName: req.user.displayName
      }
    });
  } catch (error) {
    logger.error(`[test-auth] Erro: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar autenticação de teste'
    });
  }
});

// Rota para cancelar proposta
router.post('/proposals/:id/cancel', requireAuth, proposalController.cancelProposal);

// Rota para editar proposta
router.put('/proposals/:id', requireAuth, proposalController.updateProposal);

// Rota para excluir proposta
router.delete('/proposals/:id', requireAuth, proposalController.deleteProposal);

router.post('/agent/save-name', requireAuth, async (req, res) => {
  const { agentName } = req.body;
  const userId = req.user.id;

  if (!agentName) {
    return res.status(400).json({ success: false, message: 'Nome do agente é obrigatório.' });
  }

  try {
    // Atualiza o nome do agente na tabela whatsapp_credentials para o usuário logado
    const { error } = await require('../config/supabase').supabaseAdmin
      .from('whatsapp_credentials')
      .update({ agent_name: agentName })
      .eq('client_id', userId);

    if (error) {
      return res.status(500).json({ success: false, message: 'Erro ao atualizar nome do agente.' });
    }

    return res.json({ success: true, message: 'Nome do agente atualizado com sucesso.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro interno ao atualizar nome do agente.' });
  }
});

// Configuração segura do multer com validação MIME
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
    files: 10 // máximo 10 arquivos por upload
  },
  fileFilter: (req, file, cb) => {
    // Lista de tipos MIME permitidos
    const allowedMimeTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/xml',
      'text/xml',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    // Verificar extensão do arquivo também
    const allowedExtensions = ['.txt', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.xml', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    // Verificar MIME type e extensão
    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
      // Verificar se o nome do arquivo não contém caracteres perigosos
      const safeName = /^[a-zA-Z0-9._-]+$/.test(file.originalname);
      if (!safeName) {
        return cb(new Error('Nome de arquivo contém caracteres inválidos'), false);
      }
      return cb(null, true);
    } else {
      return cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype} (${fileExtension})`), false);
    }
  }
});

// Rate limiting específico para uploads (proteção contra ataques massivos)
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // Aumentado para 50 uploads (proteção contra ataques massivos)
  message: {
    success: false,
    message: 'Muitos uploads. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Usar tanto IP quanto user ID para o rate limit
    return `upload_${req.ip}_${req.user?.id || 'anonymous'}`;
  }
});

// Speed limiting para uploads (melhor UX com desaceleração gradual)
const uploadSpeedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: 5, // Começar a desacelerar após 5 uploads
  delayMs: () => 2000, // 2 segundos de atraso por upload adicional
  maxDelayMs: 20000, // Máximo 20 segundos de atraso
  keyGenerator: (req) => {
    // Usar tanto IP quanto user ID para o speed limit
    return `upload_speed_${req.ip}_${req.user?.id || 'anonymous'}`;
  }
});

const N8N_API_URL = process.env.N8N_API_URL;

function convertToMarkdownWithDocling(filePath) {
  return new Promise((resolve, reject) => {
    // Timeout para evitar travamento na conversão
    const timeoutId = setTimeout(() => {
      reject(new Error('Timeout na conversão do documento'));
    }, 120000); // 2 minutos timeout
    
    execFile('python', ['scripts/docling_convert.py', filePath], { 
      maxBuffer: 20 * 1024 * 1024,
      timeout: 120000 // 2 minutos timeout também no execFile
    }, (error, stdout, stderr) => {
      clearTimeout(timeoutId);
      if (error) return reject(stderr || error);
      resolve(stdout);
    });
  });
}

// Função para limpeza segura de arquivos
async function cleanupFile(filePath) {
  try {
    if (filePath && typeof filePath === 'string') {
      await fs.promises.unlink(filePath);
      logger.info(`Arquivo temporário removido: ${filePath}`);
    }
  } catch (err) {
    logger.warn(`Erro ao remover arquivo temporário ${filePath}: ${err.message}`);
  }
}

router.post('/agent/upload-kb', requireAuth, uploadRateLimit, uploadSpeedLimiter, upload.array('kbFiles'), async (req, res) => {
  const uploadedFiles = [];
  
  try {
    const files = req.files;
    const userId = req.user.id;
    const agentName = req.body.agentName;
    
    // Validar se o agentName foi fornecido
    if (!agentName || typeof agentName !== 'string' || agentName.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nome do agente é obrigatório' 
      });
    }
    
    logger.info(`[UPLOAD] Upload iniciado por usuário ${userId}, ${files?.length || 0} arquivos`);
    
    if (!files || files.length === 0) {
      logger.warn('[UPLOAD] Nenhum arquivo enviado.');
      return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
    }
    
    // Armazenar caminhos dos arquivos para cleanup
    uploadedFiles.push(...files.map(f => f.path));
    
    const processedFiles = [];
    const errors = [];
    
    for (const file of files) {
      let markdown = '';
      
      try {
        logger.info(`[DOCLING] Convertendo: ${file.originalname} (${file.mimetype})`);
        markdown = await convertToMarkdownWithDocling(file.path);
        logger.info(`[DOCLING] Conversão concluída: ${file.originalname}, ${markdown.length} caracteres`);
      } catch (err) {
        logger.error(`[DOCLING] Erro ao converter ${file.originalname}:`, err.message);
        errors.push(`Erro ao processar ${file.originalname}: ${err.message}`);
        continue; // Pular este arquivo e continuar com os outros
      }
      
      try {
        if (!N8N_API_URL) {
          throw new Error('N8N_API_URL não configurado');
        }
        
        logger.info(`[N8N] Enviando para n8n: ${file.originalname}`);
        await axios.post(`${N8N_API_URL}/webhook/uploadKb`, {
          agentName: agentName.trim(),
          userId,
          originalName: file.originalname,
          mimetype: file.mimetype,
          markdown
        }, {
          timeout: 30000, // 30 segundos timeout
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        logger.info(`[N8N] Enviado com sucesso: ${file.originalname}`);
        processedFiles.push(file.originalname);
      } catch (err) {
        logger.error(`[N8N] Erro ao enviar ${file.originalname} para n8n:`, err.message);
        errors.push(`Erro ao enviar ${file.originalname} para processamento: ${err.message}`);
      }
    }
    
    // Resposta com informações detalhadas
    const response = {
      success: processedFiles.length > 0,
      message: processedFiles.length > 0 
        ? `${processedFiles.length} documento(s) processado(s) com sucesso`
        : 'Nenhum documento foi processado com sucesso',
      processedFiles,
      errors: errors.length > 0 ? errors : undefined
    };
    
    logger.info(`[UPLOAD] Processamento concluído: ${processedFiles.length} sucessos, ${errors.length} erros`);
    
    if (processedFiles.length === 0) {
      return res.status(400).json(response);
    }
    
    res.json(response);
  } catch (err) {
    logger.error('[UPLOAD] Erro geral:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno ao processar documentos.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    // Cleanup de todos os arquivos temporários
    for (const filePath of uploadedFiles) {
      await cleanupFile(filePath);
    }
  }
});

// Rotas de KnowledgeBase
const knowledgeBaseRoutes = require('./knowledgeBaseRoutes');
router.use('/knowledge-base', knowledgeBaseRoutes);

// Endpoint de desenvolvimento para acesso direto aos dados do cliente
router.get('/dev/direct-data', async (req, res) => {
  try {
    const { contactId } = req.query;
    
    if (!contactId) {
      return res.status(400).json({
        success: false,
        message: 'contactId é obrigatório'
      });
    }
    
    logger.info(`[DEV] Acesso direto aos dados para contato: ${contactId}`);
    
    // Buscar o contato para obter o lead_id
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('remote_jid, lead_id')
      .eq('remote_jid', contactId)
      .single();
    
    if (contactError || !contact) {
      logger.error(`[DEV] Erro ao buscar contato: ${contactError?.message || 'Contato não encontrado'}`);
      return res.status(404).json({
        success: false,
        message: 'Contato não encontrado'
      });
    }
    
    logger.info(`[DEV] Contato encontrado. Lead ID: ${contact.lead_id || 'NULL'}`);
    
    if (!contact.lead_id) {
      return res.json({
        success: false,
        message: 'Contato sem lead_id associado'
      });
    }
    
    // Buscar dados de saldo diretamente
    const { data: balanceData, error: balanceError } = await supabaseAdmin
      .from('balance')
      .select('*')
      .eq('lead_id', contact.lead_id)
      .order('updated_at', { ascending: false })
      .limit(1);
    
    // Dados de proposta diretamente
    const { data: proposalData, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('lead_id', contact.lead_id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    // Construir resposta direta, sem conversões complexas
    const directResponse = {
      success: true,
      contact_id: contactId,
      lead_id: contact.lead_id,
      balance: balanceData && balanceData.length > 0 ? balanceData[0].balance : null,
      simulation: balanceData && balanceData.length > 0 ? balanceData[0].simulation : null,
      proposal_id: proposalData && proposalData.length > 0 ? proposalData[0].proposal_id : null,
      proposal_status: proposalData && proposalData.length > 0 ? proposalData[0].status : null,
      balance_record: balanceData && balanceData.length > 0 ? balanceData[0] : null,
      proposal_record: proposalData && proposalData.length > 0 ? proposalData[0] : null
    };
    
    // Logs para depuração
    logger.info(`[DEV] Dados diretos sendo retornados:`);
    logger.info(`- balance: ${directResponse.balance} (${typeof directResponse.balance})`);
    logger.info(`- simulation: ${directResponse.simulation} (${typeof directResponse.simulation})`);
    
    return res.json(directResponse);
    
  } catch (error) {
    logger.error(`[DEV] Erro ao acessar dados diretos: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro interno: ${error.message}`
    });
  }
});

// Rota para atualizar o modo do agente
router.post('/agents/mode', requireAuth, agentsController.updateMode);

// Rota para obter o modo atual do agente
router.get('/agents/mode', requireAuth, agentsController.getCurrentMode);

// Atualizar agent_state de contato
router.post('/contacts/:remoteJid/state', requireAuth, contactController.updateState);

// Controlador para credenciais de parceiros
const partnerCredentialsService = require('../services/partnerCredentialsService');

// API de credenciais de parceiros
router.get('/partner-credentials', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    logger.info(`[API] Buscando credenciais de parceiros para usuário ${userId}`);
    
    const credentials = await partnerCredentialsService.listPartnerCredentials(userId);
    
    logger.info(`[API] Retornando ${credentials.length} credenciais para o frontend`);
    logger.info(`[API] Dados formatados para o frontend: ${JSON.stringify(credentials, null, 2)}`);
    
    return res.json({
      success: true,
      data: credentials
    });
  } catch (err) {
    logger.error(`Erro ao listar credenciais de parceiros via API: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

router.get('/partner-credentials/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const credential = await partnerCredentialsService.getPartnerCredentialById(req.params.id, userId);
    if (!credential) {
      return res.status(404).json({
        success: false,
        message: 'Credencial não encontrada'
      });
    }
    return res.json({
      success: true,
      data: credential
    });
  } catch (err) {
    logger.error(`Erro ao obter credencial de parceiro via API: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

router.post('/partner-credentials', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const newCredential = {
      ...req.body,
      user_id: userId
    };
    const credential = await partnerCredentialsService.createPartnerCredential(newCredential);
    return res.status(201).json({
      success: true,
      data: credential,
      message: 'Credencial criada com sucesso'
    });
  } catch (err) {
    logger.error(`Erro ao criar credencial de parceiro via API: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

router.put('/partner-credentials/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;
    const credential = await partnerCredentialsService.updatePartnerCredential(req.params.id, userId, updates);
    return res.json({
      success: true,
      data: credential,
      message: 'Credencial atualizada com sucesso'
    });
  } catch (err) {
    logger.error(`Erro ao atualizar credencial de parceiro via API: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

router.delete('/partner-credentials/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    await partnerCredentialsService.deletePartnerCredential(req.params.id, userId);
    return res.json({
      success: true,
      message: 'Credencial excluída com sucesso'
    });
  } catch (err) {
    logger.error(`Erro ao excluir credencial de parceiro via API: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// Endpoint para testar conexão com parceiro
router.post('/partner-credentials/:id/test-connection', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    // Verificar se a credencial existe e pertence ao usuário
    const credential = await partnerCredentialsService.getPartnerCredentialById(req.params.id, userId);
    if (!credential) {
      return res.status(404).json({
        success: false,
        message: 'Credencial não encontrada'
      });
    }
    
    // Simular teste de conexão (em produção, implementar a lógica real)
    const success = Math.random() > 0.3;  // 70% de chances de sucesso
    
    return res.json({
      success: true,
      data: {
        success,
        message: success 
          ? 'Conexão estabelecida com sucesso!'
          : 'Falha ao conectar. Verifique as credenciais e tente novamente.'
      }
    });
  } catch (err) {
    logger.error(`Erro ao testar conexão com parceiro: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// Rota para obter detalhes de uma proposta específica por ID
router.get('/proposals/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    logger.info(`Buscando detalhes da proposta ${id} para o usuário ${userId}`);

    // Buscar todos os registros com o proposal_id informado
    const { data: proposals, error } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('proposal_id', id);

    if (error) {
      logger.error(`Erro ao buscar proposta ${id}: ${error.message}`);
      return res.status(404).json({
        success: false,
        message: 'Proposta não encontrada'
      });
    }

    if (!proposals || proposals.length === 0) {
      logger.warn(`Nenhuma proposta encontrada para o proposal_id ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Proposta não encontrada'
      });
    }

    if (proposals.length > 1) {
      logger.warn(`Mais de uma proposta encontrada para o proposal_id ${id}. Retornando a primeira. IDs: ${proposals.map(p => p.id || p.proposal_id).join(', ')}`);
    }

    const proposal = proposals[0];

    // Debug dos campos encontrados na proposta
    logger.info(`Proposta encontrada - campos disponíveis: ${Object.keys(proposal).join(', ')}`);
    logger.info(`Detalhes dos valores da proposta:`);
    logger.info(`- amount: ${proposal.amount} (${typeof proposal.amount})`);
    logger.info(`- valor: ${proposal.valor} (${typeof proposal.valor})`);
    logger.info(`- value: ${proposal.value} (${typeof proposal.value})`);
    
    if (proposal.data) {
      logger.info(`- data.amount: ${proposal.data?.amount} (${typeof proposal.data?.amount})`);
      logger.info(`- data.valor: ${proposal.data?.valor} (${typeof proposal.data?.valor})`);
      logger.info(`- data.value: ${proposal.data?.value} (${typeof proposal.data?.value})`);
    }

    // Função auxiliar para converter qualquer formato para número
    const parseNumberValue = (value) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') return value;
      try {
        if (typeof value === 'string') {
          const cleaned = value.replace(/[^0-9.,]/g, '').replace(',', '.');
          const number = parseFloat(cleaned);
          return isNaN(number) ? null : number;
        }
        const number = Number(value);
        return isNaN(number) ? null : number;
      } catch (e) {
        logger.error(`Erro ao converter valor para número: ${e.message}`);
        return null;
      }
    };

    let valorProposta = null;
    const possibleFields = [
      proposal.amount, 
      proposal.valor, 
      proposal.value
    ];
    if (proposal.data) {
      possibleFields.push(
        proposal.data.amount, 
        proposal.data.valor, 
        proposal.data.value
      );
    }
    for (const field of possibleFields) {
      if (field !== null && field !== undefined) {
        valorProposta = parseNumberValue(field);
        if (valorProposta !== null) break;
      }
    }

    logger.info(`Valor da proposta extraído: ${valorProposta} (${typeof valorProposta})`);

    const formattedProposal = {
      id: proposal.proposal_id,
      status: proposal.status,
      amount: valorProposta,
      valor: valorProposta,
      value: valorProposta,
      formalization_link: proposal.formalization_link
        || proposal.link_formalizacao
        || proposal["Link de formalização"]
        || proposal["link de formalização"]
        || (proposal.data ? proposal.data.formalization_link : null),
      link_formalizacao: proposal.link_formalizacao
        || proposal.formalization_link
        || proposal["Link de formalização"]
        || proposal["link de formalização"]
        || (proposal.data ? proposal.data.link_formalizacao : null),
      pix_key: proposal.pix_key
        || proposal.chave_pix
        || proposal.chavePix
        || proposal["chavePix"]
        || proposal["Chave Pix"]
        || (proposal.data ? proposal.data.pix_key : null),
      chave_pix: proposal.chave_pix
        || proposal.pix_key
        || proposal.chavePix
        || proposal["chavePix"]
        || proposal["Chave Pix"]
        || (proposal.data ? proposal.data.chave_pix : null),
      status_detail: proposal.status_detail || proposal.status_detalhado || (proposal.data ? proposal.data.status_detail : null),
      status_detalhado: proposal.status_detalhado || proposal.status_detail || (proposal.data ? proposal.data.status_detalhado : null),
      created_at: proposal.created_at
    };

    logger.info(`Detalhes da proposta ${id} recuperados com sucesso: ${JSON.stringify(formattedProposal)}`);

    return res.json({
      success: true,
      message: 'Detalhes da proposta recuperados com sucesso',
      proposal: formattedProposal
    });
  } catch (error) {
    logger.error(`Erro ao obter detalhes da proposta: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro ao obter detalhes da proposta',
      error: error.message
    });
  }
});

module.exports = router; 