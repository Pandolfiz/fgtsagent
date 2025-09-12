/**
 * ==============================================
 * SCRIPT DE EXECUÇÃO DOS TESTES DE AUTENTICAÇÃO
 * ==============================================
 * 
 * Este script executa os testes de integração de autenticação
 * e gera um relatório detalhado dos resultados.
 * 
 * @author Equipe de Desenvolvimento
 * @version 1.0.0
 * @since 2024-01-XX
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class AuthTestRunner {
  constructor() {
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: []
    };
  }

  /**
   * Executa os testes de autenticação
   */
  async runTests() {
    try {
      logger.info('🚀 Iniciando testes de integração de autenticação...');
      
      // Verificar se o Jest está instalado
      try {
        require.resolve('jest');
      } catch (error) {
        logger.error('❌ Jest não está instalado. Instalando...');
        execSync('npm install --save-dev jest supertest', { stdio: 'inherit' });
      }

      // Configurar variáveis de ambiente para testes
      process.env.NODE_ENV = 'test';
      process.env.JEST_WORKER_ID = '1';

      // Executar testes
      const startTime = Date.now();
      
      try {
        execSync('npx jest src/tests/authIntegration.test.js --verbose --detectOpenHandles --forceExit', {
          stdio: 'pipe',
          encoding: 'utf8'
        });
        
        this.testResults.passed = this.testResults.total;
        logger.info('✅ Todos os testes passaram!');
        
      } catch (error) {
        // Jest retorna código de saída 1 quando há falhas
        if (error.status === 1) {
          logger.warn('⚠️ Alguns testes falharam');
          this.testResults.failed = 1; // Jest não fornece contagem detalhada via execSync
        } else {
          throw error;
        }
      }

      this.testResults.duration = Date.now() - startTime;
      
      // Gerar relatório
      this.generateReport();
      
    } catch (error) {
      logger.error('❌ Erro ao executar testes:', error);
      this.testResults.errors.push(error.message);
      this.generateReport();
    }
  }

  /**
   * Gera relatório detalhado dos testes
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      results: this.testResults,
      summary: {
        status: this.testResults.failed === 0 ? 'PASSED' : 'FAILED',
        successRate: this.testResults.total > 0 ? 
          (this.testResults.passed / this.testResults.total * 100).toFixed(2) : 0
      }
    };

    // Salvar relatório
    const reportPath = path.join(__dirname, 'auth-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Exibir resumo
    console.log('\n📊 RELATÓRIO DE TESTES DE AUTENTICAÇÃO');
    console.log('=====================================');
    console.log(`⏱️  Duração: ${this.testResults.duration}ms`);
    console.log(`✅ Passou: ${this.testResults.passed}`);
    console.log(`❌ Falhou: ${this.testResults.failed}`);
    console.log(`⏭️  Pulou: ${this.testResults.skipped}`);
    console.log(`📈 Taxa de sucesso: ${report.summary.successRate}%`);
    console.log(`📄 Relatório salvo em: ${reportPath}`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ ERROS ENCONTRADOS:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    // Retornar código de saída apropriado
    process.exit(this.testResults.failed > 0 ? 1 : 0);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const runner = new AuthTestRunner();
  runner.runTests();
}

module.exports = AuthTestRunner;



