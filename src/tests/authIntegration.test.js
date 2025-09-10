/**
 * ==============================================
 * TESTES DE INTEGRAÇÃO - AUTENTICAÇÃO
 * ==============================================
 * 
 * Este arquivo contém testes de integração para o sistema de autenticação,
 * testando o fluxo completo desde o login até o logout.
 * 
 * Funcionalidades testadas:
 * - Login com credenciais válidas
 * - Login com credenciais inválidas
 * - Refresh de tokens
 * - Logout
 * - Middleware de autenticação
 * - Rate limiting
 * - CORS
 * 
 * @author Equipe de Desenvolvimento
 * @version 1.0.0
 * @since 2024-01-XX
 */

const request = require('supertest');
const app = require('../app');
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

describe('🔐 Testes de Integração - Autenticação', () => {
  let testUser = null;
  let testEmail = `test-${Date.now()}@example.com`;
  let testPassword = 'TestPassword123!';
  let authToken = null;
  let refreshToken = null;

  beforeAll(async () => {
    // Criar usuário de teste
    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true
      });

      if (error) {
        throw error;
      }

      testUser = data.user;
      logger.info('✅ Usuário de teste criado:', testUser.id);
    } catch (error) {
      logger.error('❌ Erro ao criar usuário de teste:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Limpar usuário de teste
    if (testUser) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(testUser.id);
        logger.info('✅ Usuário de teste removido');
      } catch (error) {
        logger.warn('⚠️ Erro ao remover usuário de teste:', error);
      }
    }
  });

  describe('📝 Login e Autenticação', () => {
    test('Deve fazer login com credenciais válidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.tokens).toBeDefined();
      expect(response.body.tokens.access_token).toBeDefined();
      expect(response.body.tokens.refresh_token).toBeDefined();

      // Salvar tokens para testes posteriores
      authToken = response.body.tokens.access_token;
      refreshToken = response.body.tokens.refresh_token;

      // Verificar se cookies foram definidos
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(cookie => cookie.includes('authToken'))).toBe(true);
      expect(cookies.some(cookie => cookie.includes('refreshToken'))).toBe(true);
    });

    test('Deve rejeitar login com credenciais inválidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('credenciais');
    });

    test('Deve rejeitar login com email inexistente', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('credenciais');
    });

    test('Deve validar campos obrigatórios', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail
          // password ausente
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('obrigatório');
    });
  });

  describe('🔄 Refresh de Tokens', () => {
    test('Deve renovar token com refresh token válido', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refresh_token: refreshToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tokens).toBeDefined();
      expect(response.body.tokens.access_token).toBeDefined();
      expect(response.body.tokens.refresh_token).toBeDefined();

      // Atualizar tokens
      authToken = response.body.tokens.access_token;
      refreshToken = response.body.tokens.refresh_token;
    });

    test('Deve rejeitar refresh com token inválido', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refresh_token: 'invalid-refresh-token'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('inválido');
    });
  });

  describe('🛡️ Middleware de Autenticação', () => {
    test('Deve permitir acesso a rota protegida com token válido', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testEmail);
    });

    test('Deve rejeitar acesso a rota protegida sem token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token');
    });

    test('Deve rejeitar acesso a rota protegida com token inválido', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('inválido');
    });

    test('Deve permitir acesso via cookie httpOnly', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `authToken=${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });
  });

  describe('🚪 Logout', () => {
    test('Deve fazer logout com sucesso', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('sucesso');

      // Verificar se cookies foram limpos
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        expect(cookies.some(cookie => cookie.includes('authToken=;'))).toBe(true);
        expect(cookies.some(cookie => cookie.includes('refreshToken=;'))).toBe(true);
      }
    });

    test('Deve rejeitar acesso após logout', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token');
    });
  });

  describe('🌐 CORS', () => {
    test('Deve permitir requisições de origem permitida', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://fgtsagent.com.br')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://fgtsagent.com.br');
    });

    test('Deve rejeitar requisições de origem não permitida', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://malicious-site.com')
        .expect(403);

      expect(response.body.message).toContain('CORS');
    });

    test('Deve incluir headers CORS necessários', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'https://fgtsagent.com.br')
        .expect(200);

      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-headers']).toContain('Authorization');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('⚡ Rate Limiting', () => {
    test('Deve aplicar rate limiting em rotas de autenticação', async () => {
      // Fazer múltiplas requisições para testar rate limiting
      const promises = [];
      for (let i = 0; i < 25; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // Pelo menos uma resposta deve ser 429 (Too Many Requests)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('Deve aplicar speed limiting em rotas de API', async () => {
      // Fazer múltiplas requisições para testar speed limiting
      const promises = [];
      for (let i = 0; i < 30; i++) {
        promises.push(
          request(app)
            .get('/api/health')
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // Verificar se houve desaceleração (tempo total deve ser maior que o esperado)
      const totalTime = endTime - startTime;
      expect(totalTime).toBeGreaterThan(1000); // Pelo menos 1 segundo de desaceleração
    });
  });

  describe('🔒 Segurança', () => {
    test('Deve incluir headers de segurança', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    test('Deve sanitizar entrada para prevenir XSS', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: maliciousInput,
          password: testPassword
        })
        .expect(400);

      // Verificar se a entrada foi sanitizada
      expect(response.body.message).not.toContain('<script>');
    });

    test('Deve validar formato de email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: testPassword
        })
        .expect(400);

      expect(response.body.message).toContain('formato');
    });
  });

  describe('📊 Monitoramento', () => {
    test('Deve incluir headers de monitoramento', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['x-auth-middleware']).toBeDefined();
    });

    test('Deve incluir headers de rate limiting', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });
});



