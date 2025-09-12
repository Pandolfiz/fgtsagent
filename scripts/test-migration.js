#!/usr/bin/env node

/**
 * 🧪 Script de Teste de Migração de Autenticação
 * 
 * Este script testa as rotas migradas para verificar se estão usando
 * o middleware correto (unificado vs legado).
 * 
 * @author Equipe de Desenvolvimento
 * @version 1.0.0
 * @since 2024-01-XX
 */

const https = require('https');
const logger = require('../src/config/logger');

/**
 * Configuração de teste
 */
const TEST_CONFIG = {
  baseUrl: 'https://localhost:3000',
  testToken: 'test-token-123',
  timeout: 5000,
  
  // Rotas que devem usar middleware unificado (rotas que requerem auth)
  unifiedRoutes: [
    '/api/contacts',
    '/api/settings',
    '/api/credentials',
    '/api/consent',
    '/api/whatsapp-templates',
    '/api/ads',
    '/api/organization'
  ],
  
  // Rotas que devem usar middleware legado (rotas públicas)
  legacyRoutes: [
    '/api/health',
    '/api/migration/status',
    '/api/migration/routes'
  ]
};

/**
 * Classe para testar migração
 */
class MigrationTester {
  constructor() {
    this.results = {
      unified: { total: 0, success: 0, errors: [] },
      legacy: { total: 0, success: 0, errors: [] },
      overall: { total: 0, success: 0, errors: [] }
    };
  }

  /**
   * Faz requisição HTTPS
   */
  makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname,
        method: options.method || 'GET',
        headers: {
          'Authorization': `Bearer ${TEST_CONFIG.testToken}`,
          'User-Agent': 'MigrationTester/1.0',
          ...options.headers
        },
        rejectUnauthorized: false // Para certificados auto-assinados
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            url: url
          });
        });
      });

      req.on('error', reject);
      req.setTimeout(TEST_CONFIG.timeout, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * Testa uma rota específica
   */
  async testRoute(route, expectedMiddleware) {
    try {
      const url = `${TEST_CONFIG.baseUrl}${route}`;
      const response = await this.makeRequest(url);
      
      // Para rotas que requerem autenticação, esperamos 401 (não autorizado)
      // Para rotas públicas, esperamos 200
      const isAuthRoute = !route.includes('/health') && !route.includes('/migration');
      const expectedStatus = isAuthRoute ? 401 : 200;
      const isCorrectStatus = response.statusCode === expectedStatus || response.statusCode < 500;
      
      return {
        route,
        statusCode: response.statusCode,
        expectedStatus,
        isCorrectStatus,
        success: isCorrectStatus
      };
    } catch (error) {
      return {
        route,
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Testa todas as rotas unificadas
   */
  async testUnifiedRoutes() {
    console.log('\n🔵 TESTANDO ROTAS UNIFICADAS (middleware unificado)');
    console.log('=' .repeat(60));
    
    for (const route of TEST_CONFIG.unifiedRoutes) {
      const result = await this.testRoute(route, 'unified');
      this.results.unified.total++;
      
      if (result.success) {
        this.results.unified.success++;
        console.log(`✅ ${route} - Status: ${result.statusCode} (esperado: ${result.expectedStatus})`);
      } else {
        this.results.unified.errors.push(result);
        console.log(`❌ ${route} - Erro: ${result.error || `Status ${result.statusCode} (esperado: ${result.expectedStatus})`}`);
      }
    }
  }

  /**
   * Testa todas as rotas legadas
   */
  async testLegacyRoutes() {
    console.log('\n🟡 TESTANDO ROTAS LEGADAS (middleware legado)');
    console.log('=' .repeat(60));
    
    for (const route of TEST_CONFIG.legacyRoutes) {
      const result = await this.testRoute(route, 'legacy');
      this.results.legacy.total++;
      
      if (result.success) {
        this.results.legacy.success++;
        console.log(`✅ ${route} - Status: ${result.statusCode} (esperado: ${result.expectedStatus})`);
      } else {
        this.results.legacy.errors.push(result);
        console.log(`❌ ${route} - Erro: ${result.error || `Status ${result.statusCode} (esperado: ${result.expectedStatus})`}`);
      }
    }
  }

  /**
   * Executa todos os testes
   */
  async runTests() {
    console.log('🧪 INICIANDO TESTES DE MIGRAÇÃO');
    console.log('=' .repeat(60));
    console.log(`Base URL: ${TEST_CONFIG.baseUrl}`);
    console.log(`Token: ${TEST_CONFIG.testToken.substring(0, 10)}...`);
    console.log('');

    try {
      await this.testUnifiedRoutes();
      await this.testLegacyRoutes();
      
      this.calculateOverallResults();
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Erro durante os testes:', error.message);
    }
  }

  /**
   * Calcula resultados gerais
   */
  calculateOverallResults() {
    this.results.overall.total = this.results.unified.total + this.results.legacy.total;
    this.results.overall.success = this.results.unified.success + this.results.legacy.success;
    this.results.overall.errors = [...this.results.unified.errors, ...this.results.legacy.errors];
  }

  /**
   * Imprime resumo dos testes
   */
  printSummary() {
    console.log('\n📊 RESUMO DOS TESTES');
    console.log('=' .repeat(60));
    
    console.log(`🔵 Rotas Unificadas: ${this.results.unified.success}/${this.results.unified.total} (${this.getPercentage(this.results.unified)}%)`);
    console.log(`🟡 Rotas Legadas: ${this.results.legacy.success}/${this.results.legacy.total} (${this.getPercentage(this.results.legacy)}%)`);
    console.log(`📈 Total Geral: ${this.results.overall.success}/${this.results.overall.total} (${this.getPercentage(this.results.overall)}%)`);
    
    if (this.results.overall.errors.length > 0) {
      console.log('\n❌ ERROS ENCONTRADOS:');
      this.results.overall.errors.forEach(error => {
        console.log(`   - ${error.route}: ${error.error || 'Middleware incorreto'}`);
      });
    }
    
    console.log('\n' + '=' .repeat(60));
    
    if (this.results.overall.success === this.results.overall.total) {
      console.log('🎉 TODOS OS TESTES PASSARAM! Migração funcionando perfeitamente.');
    } else {
      console.log('⚠️  Alguns testes falharam. Verifique os erros acima.');
    }
  }

  /**
   * Calcula porcentagem
   */
  getPercentage(result) {
    if (result.total === 0) return 0;
    return Math.round((result.success / result.total) * 100);
  }
}

/**
 * Função principal
 */
async function main() {
  const tester = new MigrationTester();
  await tester.runTests();
}

// Executa se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = { MigrationTester, TEST_CONFIG };
