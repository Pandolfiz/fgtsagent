#!/usr/bin/env node
/**
 * Script de Teste de Integração do Sistema de Autenticação
 * 
 * Este script testa todas as funcionalidades do sistema de autenticação
 * migrado, incluindo middlewares unificados e legados.
 * 
 * @author Equipe de Desenvolvimento
 * @version 1.0.0
 * @since 2024-01-XX
 */

const https = require('https');
const http = require('http');

// Configurações
const CONFIG = {
  baseUrl: 'https://localhost:3000',
  timeout: 10000,
  testUser: {
    email: 'test@example.com',
    password: 'testpassword123'
  }
};

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Estatísticas dos testes
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Utilitário para fazer requisições HTTPS
 */
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(CONFIG.timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * Executa um teste individual
 */
async function runTest(name, testFn) {
  stats.total++;
  process.stdout.write(`\n${colors.blue}[TEST]${colors.reset} ${name}... `);
  
  try {
    const result = await testFn();
    if (result.success) {
      console.log(`${colors.green}✓ PASSED${colors.reset}`);
      stats.passed++;
    } else {
      console.log(`${colors.red}✗ FAILED${colors.reset} - ${result.error}`);
      stats.failed++;
      stats.errors.push({ name, error: result.error });
    }
  } catch (error) {
    console.log(`${colors.red}✗ ERROR${colors.reset} - ${error.message}`);
    stats.failed++;
    stats.errors.push({ name, error: error.message });
  }
}

/**
 * Teste 1: Health Check Básico
 */
async function testHealthCheck() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET',
      rejectUnauthorized: false
    });

    return {
      success: response.statusCode === 200 && (response.body.status === 'ok' || response.body.status === 'healthy'),
      error: response.statusCode !== 200 ? `Status ${response.statusCode}` : `Health check failed - got status: ${response.body.status}`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Teste 2: Status da Migração
 */
async function testMigrationStatus() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/migration/status',
      method: 'GET',
      rejectUnauthorized: false
    });

    const isValid = response.statusCode === 200 && 
                   response.body.success && 
                   response.body.data.migration;

    return {
      success: isValid,
      error: !isValid ? `Status ${response.statusCode} or invalid response` : null
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Teste 3: Rota Pública (sem autenticação)
 */
async function testPublicRoute() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET',
      rejectUnauthorized: false
    });

    return {
      success: response.statusCode === 200,
      error: response.statusCode !== 200 ? `Status ${response.statusCode}` : null
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Teste 4: Rota Protegida (sem token)
 */
async function testProtectedRouteWithoutToken() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/contacts',
      method: 'GET',
      rejectUnauthorized: false
    });

    // Deve retornar 401 (Unauthorized)
    return {
      success: response.statusCode === 401,
      error: response.statusCode !== 401 ? `Expected 401, got ${response.statusCode}` : null
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Teste 5: Rota Protegida (com token inválido)
 */
async function testProtectedRouteWithInvalidToken() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/contacts',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid-token-12345'
      },
      rejectUnauthorized: false
    });

    // Deve retornar 401 (Unauthorized)
    return {
      success: response.statusCode === 401,
      error: response.statusCode !== 401 ? `Expected 401, got ${response.statusCode}` : null
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Teste 6: Rate Limiting
 */
async function testRateLimiting() {
  try {
    const promises = [];
    
    // Fazer 15 requisições rapidamente (limite é 10 para auth)
    for (let i = 0; i < 15; i++) {
      promises.push(makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        rejectUnauthorized: false
      }));
    }

    const responses = await Promise.all(promises);
    const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
    
    return {
      success: rateLimitedResponses.length > 0,
      error: rateLimitedResponses.length === 0 ? 'Rate limiting not working' : null
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Teste 7: Headers de Segurança
 */
async function testSecurityHeaders() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET',
      rejectUnauthorized: false
    });

    const hasSecurityHeaders = response.headers['x-content-type-options'] && 
                              response.headers['x-frame-options'];

    return {
      success: hasSecurityHeaders,
      error: !hasSecurityHeaders ? 'Security headers missing' : null
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Teste 8: CORS Headers
 */
async function testCORSHeaders() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://localhost:5173',
        'Access-Control-Request-Method': 'GET'
      },
      rejectUnauthorized: false
    });

    const hasCORSHeaders = response.headers['access-control-allow-origin'] && 
                          response.headers['access-control-allow-methods'];

    return {
      success: hasCORSHeaders,
      error: !hasCORSHeaders ? 'CORS headers missing' : null
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Teste 9: Middleware de Migração
 */
async function testMigrationMiddleware() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/contacts',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token'
      },
      rejectUnauthorized: false
    });

    // Deve ter header X-Auth-Middleware indicando qual middleware foi usado
    const hasMiddlewareHeader = response.headers['x-auth-middleware'];

    return {
      success: hasMiddlewareHeader !== undefined,
      error: !hasMiddlewareHeader ? 'Migration middleware header missing' : null
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Teste 10: Logs de Migração
 */
async function testMigrationLogs() {
  try {
    // Fazer uma requisição para gerar logs
    await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/migration/routes',
      method: 'GET',
      rejectUnauthorized: false
    });

    // Verificar se a rota existe e retorna dados
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/migration/routes',
      method: 'GET',
      rejectUnauthorized: false
    });

    return {
      success: response.statusCode === 200 && response.body.success,
      error: response.statusCode !== 200 ? `Status ${response.statusCode}` : 'Invalid response'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Executa todos os testes
 */
async function runAllTests() {
  console.log(`${colors.bold}${colors.blue}🚀 INICIANDO TESTES DE INTEGRAÇÃO DO SISTEMA DE AUTENTICAÇÃO${colors.reset}\n`);
  console.log(`Base URL: ${CONFIG.baseUrl}`);
  console.log(`Timeout: ${CONFIG.timeout}ms\n`);

  // Executar todos os testes
  await runTest('Health Check Básico', testHealthCheck);
  await runTest('Status da Migração', testMigrationStatus);
  await runTest('Rota Pública (sem auth)', testPublicRoute);
  await runTest('Rota Protegida (sem token)', testProtectedRouteWithoutToken);
  await runTest('Rota Protegida (token inválido)', testProtectedRouteWithInvalidToken);
  await runTest('Rate Limiting', testRateLimiting);
  await runTest('Headers de Segurança', testSecurityHeaders);
  await runTest('CORS Headers', testCORSHeaders);
  await runTest('Middleware de Migração', testMigrationMiddleware);
  await runTest('Logs de Migração', testMigrationLogs);

  // Relatório final
  console.log(`\n${colors.bold}📊 RELATÓRIO FINAL${colors.reset}`);
  console.log(`${colors.green}✓ Passou: ${stats.passed}${colors.reset}`);
  console.log(`${colors.red}✗ Falhou: ${stats.failed}${colors.reset}`);
  console.log(`📈 Taxa de Sucesso: ${((stats.passed / stats.total) * 100).toFixed(1)}%`);

  if (stats.errors.length > 0) {
    console.log(`\n${colors.red}❌ ERROS DETALHADOS:${colors.reset}`);
    stats.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.name}: ${error.error}`);
    });
  }

  // Status de saída
  process.exit(stats.failed > 0 ? 1 : 0);
}

// Executar se chamado diretamente
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  runTest,
  makeRequest,
  CONFIG
};
