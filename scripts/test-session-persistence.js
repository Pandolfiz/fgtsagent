#!/usr/bin/env node

/**
 * Script automatizado para testar persistência de sessão
 * Identifica problemas de perda de sessão após login
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuração de teste
const TEST_CONFIG = {
  baseUrl: 'http://localhost:5173',
  headless: false, // false para ver o que está acontecendo
  timeout: 30000,
  testUser: {
    email: 'test@example.com', // Substitua por um usuário real
    password: 'testpassword123'
  },
  testRoutes: [
    '/dashboard',
    '/chat',
    '/profile'
  ],
  selectors: {
    emailInput: 'input[type="email"]',
    passwordInput: 'input[type="password"]',
    loginButton: 'button[type="submit"]',
    dashboardContent: '[data-testid="dashboard-content"]',
    sessionDebugPanel: '[data-testid="session-debug-panel"]'
  }
};

class SessionPersistenceTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.startTime = Date.now();
  }

  async init() {
    console.log('🚀 Iniciando teste de persistência de sessão...');
    
    try {
      this.browser = await puppeteer.launch({
        headless: TEST_CONFIG.headless,
        defaultViewport: { width: 1280, height: 720 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      this.page = await this.browser.newPage();
      
      // Interceptar requisições para debug
      await this.page.setRequestInterception(true);
      this.page.on('request', request => {
        console.log(`🌐 ${request.method()} ${request.url()}`);
        request.continue();
      });
      
      // Interceptar respostas para debug
      this.page.on('response', response => {
        if (response.status() >= 400) {
          console.log(`❌ ${response.status()} ${response.url()}`);
        }
      });
      
      console.log('✅ Browser iniciado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao iniciar browser:', error);
      return false;
    }
  }

  async testBackendHealth() {
    console.log('\n🔍 Testando saúde do backend...');
    
    try {
      const response = await this.page.goto('http://localhost:3000/api/test/health');
      const text = await response.text();
      
      if (text.includes('Backend funcionando')) {
        console.log('✅ Backend está funcionando');
        return true;
      } else {
        console.log('❌ Backend não está funcionando corretamente');
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao testar backend:', error);
      return false;
    }
  }

  async testLogin() {
    console.log('\n🔐 Testando login...');
    
    try {
      // Navegar para página de login
      await this.page.goto(`${TEST_CONFIG.baseUrl}/login`);
      await this.page.waitForSelector(TEST_CONFIG.selectors.emailInput, { timeout: 10000 });
      
      // Preencher credenciais
      await this.page.type(TEST_CONFIG.selectors.emailInput, TEST_CONFIG.testUser.email);
      await this.page.type(TEST_CONFIG.selectors.passwordInput, TEST_CONFIG.testUser.password);
      
      // Fazer login
      await this.page.click(TEST_CONFIG.selectors.loginButton);
      
      // Aguardar redirecionamento
      await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
      
      // Verificar se chegou ao dashboard
      const currentUrl = this.page.url();
      if (currentUrl.includes('/dashboard')) {
        console.log('✅ Login bem-sucedido, redirecionado para dashboard');
        return true;
      } else {
        console.log('❌ Login falhou, não foi redirecionado para dashboard');
        console.log('URL atual:', currentUrl);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro durante login:', error);
      return false;
    }
  }

  async testSessionPersistence() {
    console.log('\n🔄 Testando persistência de sessão...');
    
    try {
      // Aguardar carregamento do dashboard
      await this.page.waitForTimeout(3000);
      
      // Verificar se há painel de debug de sessão
      const hasDebugPanel = await this.page.$(TEST_CONFIG.selectors.sessionDebugPanel);
      if (hasDebugPanel) {
        console.log('✅ Painel de debug de sessão encontrado');
        
        // Capturar informações de debug
        const debugInfo = await this.page.evaluate(() => {
          const panel = document.querySelector('[data-testid="session-debug-panel"]');
          if (panel) {
            return panel.textContent;
          }
          return null;
        });
        
        if (debugInfo) {
          console.log('📊 Informações de debug:', debugInfo);
        }
      } else {
        console.log('⚠️ Painel de debug de sessão não encontrado');
      }
      
      // Verificar localStorage
      const localStorageInfo = await this.page.evaluate(() => {
        return {
          authToken: localStorage.getItem('authToken'),
          supabaseToken: localStorage.getItem('supabase.auth.token'),
          recentLogin: localStorage.getItem('recent_login_timestamp')
        };
      });
      
      console.log('💾 LocalStorage:', {
        hasAuthToken: !!localStorageInfo.authToken,
        hasSupabaseToken: !!localStorageInfo.supabaseToken,
        hasRecentLogin: !!localStorageInfo.recentLogin,
        authTokenLength: localStorageInfo.authToken?.length || 0
      });
      
      // Verificar cookies
      const cookies = await this.page.cookies();
      const authCookies = cookies.filter(cookie => 
        cookie.name.includes('auth') || cookie.name.includes('token')
      );
      
      console.log('🍪 Cookies de autenticação:', authCookies.map(c => ({
        name: c.name,
        value: c.value ? `${c.value.substring(0, 20)}...` : 'vazio',
        expires: c.expires
      })));
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao testar persistência de sessão:', error);
      return false;
    }
  }

  async testNavigation() {
    console.log('\n🧭 Testando navegação entre páginas...');
    
    try {
      for (const route of TEST_CONFIG.testRoutes) {
        console.log(`🔄 Navegando para ${route}...`);
        
        // Navegar para rota
        await this.page.goto(`${TEST_CONFIG.baseUrl}${route}`);
        await this.page.waitForTimeout(2000);
        
        // Verificar se ainda está autenticado
        const currentUrl = this.page.url();
        if (currentUrl.includes('/login')) {
          console.log(`❌ Sessão perdida ao navegar para ${route}`);
          return false;
        } else {
          console.log(`✅ Sessão mantida em ${route}`);
        }
        
        // Verificar localStorage novamente
        const hasToken = await this.page.evaluate(() => {
          return !!localStorage.getItem('authToken');
        });
        
        if (!hasToken) {
          console.log(`❌ Token perdido ao navegar para ${route}`);
          return false;
        }
      }
      
      console.log('✅ Navegação testada com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro durante teste de navegação:', error);
      return false;
    }
  }

  async testPageRefresh() {
    console.log('\n🔄 Testando refresh da página...');
    
    try {
      // Ir para dashboard
      await this.page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);
      await this.page.waitForTimeout(3000);
      
      // Capturar estado antes do refresh
      const beforeRefresh = await this.page.evaluate(() => {
        return {
          hasAuthToken: !!localStorage.getItem('authToken'),
          hasSupabaseToken: !!localStorage.getItem('supabase.auth.token'),
          url: window.location.href
        };
      });
      
      console.log('📊 Estado antes do refresh:', beforeRefresh);
      
      // Fazer refresh
      await this.page.reload({ waitUntil: 'networkidle0' });
      await this.page.waitForTimeout(5000);
      
      // Verificar estado após refresh
      const afterRefresh = await this.page.evaluate(() => {
        return {
          hasAuthToken: !!localStorage.getItem('authToken'),
          hasSupabaseToken: !!localStorage.getItem('supabase.auth.token'),
          url: window.location.href
        };
      });
      
      console.log('📊 Estado após refresh:', afterRefresh);
      
      // Verificar se ainda está no dashboard
      if (afterRefresh.url.includes('/dashboard')) {
        console.log('✅ Sessão persistiu após refresh');
        return true;
      } else {
        console.log('❌ Sessão perdida após refresh');
        return false;
      }
    } catch (error) {
      console.error('❌ Erro durante teste de refresh:', error);
      return false;
    }
  }

  async runAllTests() {
    console.log('🧪 Iniciando bateria completa de testes...\n');
    
    const tests = [
      { name: 'Backend Health', fn: () => this.testBackendHealth() },
      { name: 'Login', fn: () => this.testLogin() },
      { name: 'Session Persistence', fn: () => this.testSessionPersistence() },
      { name: 'Navigation', fn: () => this.testNavigation() },
      { name: 'Page Refresh', fn: () => this.testPageRefresh() }
    ];
    
    for (const test of tests) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🧪 Executando: ${test.name}`);
      console.log(`${'='.repeat(50)}`);
      
      const startTime = Date.now();
      const result = await test.fn();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name: test.name,
        success: result,
        duration,
        timestamp: new Date().toISOString()
      });
      
      if (result) {
        console.log(`✅ ${test.name}: SUCESSO (${duration}ms)`);
      } else {
        console.log(`❌ ${test.name}: FALHOU (${duration}ms)`);
      }
    }
    
    await this.generateReport();
  }

  async generateReport() {
    console.log('\n📊 Gerando relatório de testes...');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.success).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = Date.now() - this.startTime;
    
    const report = {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`,
        totalDuration: `${totalDuration}ms`
      },
      tests: this.testResults,
      timestamp: new Date().toISOString(),
      recommendations: []
    };
    
    // Gerar recomendações baseadas nos resultados
    if (failedTests > 0) {
      const failedTestNames = this.testResults
        .filter(t => !t.success)
        .map(t => t.name);
      
      report.recommendations.push(
        `Testes falharam: ${failedTestNames.join(', ')}`,
        'Verificar logs do console para detalhes',
        'Confirmar que o backend está rodando',
        'Verificar credenciais de teste'
      );
    } else {
      report.recommendations.push(
        'Todos os testes passaram!',
        'Sistema de persistência de sessão funcionando corretamente'
      );
    }
    
    // Salvar relatório
    const reportPath = path.join(__dirname, 'session-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Exibir resumo
    console.log('\n📋 RESUMO DOS TESTES');
    console.log('='.repeat(50));
    console.log(`Total de testes: ${totalTests}`);
    console.log(`Testes aprovados: ${passedTests}`);
    console.log(`Testes falharam: ${failedTests}`);
    console.log(`Taxa de sucesso: ${report.summary.successRate}`);
    console.log(`Duração total: ${report.summary.totalDuration}`);
    console.log(`\nRelatório salvo em: ${reportPath}`);
    
    if (failedTests > 0) {
      console.log('\n❌ RECOMENDAÇÕES:');
      report.recommendations.forEach(rec => console.log(`- ${rec}`));
    } else {
      console.log('\n🎉 SISTEMA FUNCIONANDO PERFEITAMENTE!');
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser fechado');
    }
  }
}

// Função principal
async function main() {
  const tester = new SessionPersistenceTester();
  
  try {
    // Verificar se o browser foi iniciado
    if (!(await tester.init())) {
      console.error('❌ Não foi possível iniciar o browser');
      process.exit(1);
    }
    
    // Executar todos os testes
    await tester.runAllTests();
    
  } catch (error) {
    console.error('❌ Erro durante execução dos testes:', error);
  } finally {
    await tester.cleanup();
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = SessionPersistenceTester;
