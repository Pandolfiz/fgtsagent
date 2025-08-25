const express = require('express');
const router = express.Router();

/**
 * Rota de teste para verificar se o backend está funcionando
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend funcionando',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Rota de teste para verificar configuração do Supabase
 */
router.get('/supabase-test', async (req, res) => {
  try {
    const { supabase, supabaseAdmin } = require('../config/supabase');
    
    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Cliente Supabase não configurado',
        error: 'supabase_client_null'
      });
    }
    
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        message: 'Cliente Supabase Admin não configurado',
        error: 'supabase_admin_null'
      });
    }
    
    // Teste simples de conexão
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
    
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Erro na conexão com Supabase',
        error: error.message
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Supabase funcionando',
      data: data
    });
    
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Erro ao testar Supabase',
      error: err.message
    });
  }
});

/**
 * Rota de teste para verificar variáveis de ambiente
 */
router.get('/env-test', (req, res) => {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_URL: process.env.SUPABASE_URL ? 'configurada' : 'não configurada',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'configurada' : 'não configurada',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'configurada' : 'não configurada',
    PORT: process.env.PORT,
    APP_URL: process.env.APP_URL
  };
  
  res.status(200).json({
    success: true,
    message: 'Variáveis de ambiente',
    data: envVars
  });
});

/**
 * Rota de teste para verificar se a autenticação está funcionando
 */
router.get('/auth-test', async (req, res) => {
  try {
    const { supabase } = require('../config/supabase');
    
    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Cliente Supabase não configurado'
      });
    }
    
    // Teste de autenticação sem token
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      return res.status(200).json({
        success: true,
        message: 'Teste de autenticação funcionando (usuário não autenticado)',
        data: {
          hasError: true,
          error: error.message,
          expected: 'JWT token is missing'
        }
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Teste de autenticação funcionando (usuário autenticado)',
      data: {
        hasError: false,
        user: data.user ? 'presente' : 'ausente'
      }
    });
    
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Erro ao testar autenticação',
      error: err.message
    });
  }
});

/**
 * Rota de teste para simular o fluxo completo de login
 */
router.post('/simulate-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }
    
    const { supabase } = require('../config/supabase');
    
    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Cliente Supabase não configurado'
      });
    }
    
    // Simular login
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas',
        error: error.message
      });
    }
    
    // Simular resposta de login bem-sucedido
    const response = {
      success: true,
      message: 'Login simulado com sucesso',
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in
        }
      }
    };
    
    // Definir cookies como no login real
    const accessToken = data.session.access_token;
    const expiresIn = 60 * 60 * 24; // 24 horas
    
    res.cookie('authToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expiresIn * 1000
    });
    
    res.cookie('supabase-auth-token', accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expiresIn * 1000,
      sameSite: 'lax'
    });
    
    res.cookie('js-auth-token', accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expiresIn * 1000,
      sameSite: 'lax'
    });
    
    // Header para indicar login recente
    res.setHeader('X-Recent-Login', 'true');
    
    res.status(200).json(response);
    
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Erro ao simular login',
      error: err.message
    });
  }
});

/**
 * Rota de teste para verificar se a sessão persiste após login
 */
router.get('/check-session-persistence', async (req, res) => {
  try {
    // Verificar cookies
    const cookies = req.cookies;
    const headers = req.headers;
    
    // Verificar se há tokens
    const hasAuthToken = !!cookies.authToken;
    const hasSupabaseToken = !!cookies['supabase-auth-token'];
    const hasJsToken = !!cookies['js-auth-token'];
    const hasAuthHeader = !!headers.authorization;
    
    // Verificar se há login recente
    const hasRecentLogin = headers['x-recent-login'] === 'true';
    
    const sessionInfo = {
      cookies: {
        authToken: hasAuthToken ? 'presente' : 'ausente',
        supabaseAuthToken: hasSupabaseToken ? 'presente' : 'ausente',
        jsAuthToken: hasJsToken ? 'presente' : 'ausente'
      },
      headers: {
        authorization: hasAuthHeader ? 'presente' : 'ausente',
        recentLogin: hasRecentLogin ? 'sim' : 'não'
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(200).json({
      success: true,
      message: 'Verificação de persistência de sessão',
      data: sessionInfo
    });
    
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar persistência de sessão',
      error: err.message
    });
  }
});

module.exports = router; 