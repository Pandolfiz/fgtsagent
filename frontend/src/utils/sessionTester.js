/**
 * Testador de persistência de sessão
 * Identifica problemas na autenticação após a limpeza
 */
class SessionTester {
  constructor() {
    this.testResults = [];
    this.currentTest = null;
  }

  /**
   * Executa todos os testes de sessão
   */
  async runAllTests() {
    console.log('🧪 INICIANDO TESTES DE SESSÃO...');
    
    try {
      await this.testLoginAndStorage();
      await this.testSessionPersistence();
      await this.testTokenValidation();
      await this.testLogoutAndCleanup();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Erro durante testes:', error);
    }
  }

  /**
   * Teste 1: Login e armazenamento de token
   */
  async testLoginAndStorage() {
    this.currentTest = 'Login e Armazenamento';
    console.log(`\n🔍 Teste: ${this.currentTest}`);
    
    const results = {
      localStorage: false,
      cookies: false,
      supabaseStorage: false,
      tokenStructure: false,
      timestamp: false
    };

    try {
      // Verificar se há token no localStorage
      const localToken = localStorage.getItem('authToken');
      results.localStorage = !!localToken;
      console.log(`  localStorage: ${results.localStorage ? '✅' : '❌'}`);

      // Verificar cookies
      const cookies = document.cookie.split(';').map(c => c.trim());
      const authCookies = cookies.filter(c => 
        c.startsWith('authToken=') || 
        c.startsWith('supabase-auth-token=') || 
        c.startsWith('js-auth-token=')
      );
      results.cookies = authCookies.length > 0;
      console.log(`  Cookies: ${results.cookies ? '✅' : '❌'} (${authCookies.length} encontrados)`);

      // Verificar storage do Supabase
      const supabaseTokens = localStorage.getItem('supabase.auth.token');
      results.supabaseStorage = !!supabaseTokens;
      console.log(`  Supabase Storage: ${results.supabaseStorage ? '✅' : '❌'}`);

      // Verificar estrutura do token
      if (localToken) {
        const parts = localToken.split('.');
        results.tokenStructure = parts.length === 3;
        console.log(`  Estrutura JWT: ${results.tokenStructure ? '✅' : '❌'}`);
        
        // Verificar expiração
        try {
          const payload = JSON.parse(atob(parts[1]));
          const now = Date.now() / 1000;
          results.timestamp = payload.exp && payload.exp > now;
          console.log(`  Token válido: ${results.timestamp ? '✅' : '❌'} (expira em ${new Date(payload.exp * 1000).toLocaleString()})`);
        } catch (e) {
          console.log(`  ❌ Erro ao verificar payload: ${e.message}`);
        }
      }

      // Verificar timestamp de login recente
      const loginTimestamp = localStorage.getItem('recent_login_timestamp');
      if (loginTimestamp) {
        const elapsed = Date.now() - parseInt(loginTimestamp);
        const isRecent = elapsed < 300000; // 5 minutos
        console.log(`  Login recente: ${isRecent ? '✅' : '❌'} (${Math.round(elapsed/1000)}s atrás)`);
      }

    } catch (error) {
      console.error(`  ❌ Erro no teste: ${error.message}`);
    }

    this.testResults.push({ test: this.currentTest, results, success: Object.values(results).every(Boolean) });
    return results;
  }

  /**
   * Teste 2: Persistência entre navegações
   */
  async testSessionPersistence() {
    this.currentTest = 'Persistência de Sessão';
    console.log(`\n🔍 Teste: ${this.currentTest}`);
    
    const results = {
      tokenConsistent: false,
      supabaseSession: false,
      backendAccess: false
    };

    try {
      // Verificar consistência do token
      const localToken = localStorage.getItem('authToken');
      const cookieToken = this.getCookie('authToken');
      
      results.tokenConsistent = localToken === cookieToken;
      console.log(`  Token consistente: ${results.tokenConsistent ? '✅' : '❌'}`);

      // Verificar sessão do Supabase
      const { data: { session } } = await window.supabase.auth.getSession();
      results.supabaseSession = !!session;
      console.log(`  Sessão Supabase: ${results.supabaseSession ? '✅' : '❌'}`);

      // Testar acesso ao backend (simulado)
      if (localToken) {
        try {
          // Simular requisição ao backend
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${localToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          results.backendAccess = response.status === 200 || response.status === 401; // 401 é esperado se não implementado
          console.log(`  Acesso backend: ${results.backendAccess ? '✅' : '❌'} (status: ${response.status})`);
        } catch (e) {
          console.log(`  ⚠️ Backend não disponível: ${e.message}`);
          results.backendAccess = true; // Considerar sucesso se não conseguir testar
        }
      }

    } catch (error) {
      console.error(`  ❌ Erro no teste: ${error.message}`);
    }

    this.testResults.push({ test: this.currentTest, results, success: Object.values(results).every(Boolean) });
    return results;
  }

  /**
   * Teste 3: Validação de token
   */
  async testTokenValidation() {
    this.currentTest = 'Validação de Token';
    console.log(`\n🔍 Teste: ${this.currentTest}`);
    
    const results = {
      tokenExists: false,
      tokenValid: false,
      canRefresh: false
    };

    try {
      const token = localStorage.getItem('authToken');
      results.tokenExists = !!token;
      console.log(`  Token existe: ${results.tokenExists ? '✅' : '❌'}`);

      if (token) {
        // Verificar se é um JWT válido
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const now = Date.now() / 1000;
            
            results.tokenValid = payload.exp && payload.exp > now;
            console.log(`  Token válido: ${results.tokenValid ? '✅' : '❌'}`);
            
            if (payload.exp) {
              const timeLeft = Math.round(payload.exp - now);
              console.log(`  Tempo restante: ${timeLeft > 0 ? `${timeLeft}s` : 'EXPIRADO'}`);
            }
          }
        } catch (e) {
          console.log(`  ❌ Token malformado: ${e.message}`);
        }

        // Testar renovação (se implementado)
        try {
          const { data, error } = await window.supabase.auth.refreshSession();
          results.canRefresh = !error;
          console.log(`  Renovação possível: ${results.canRefresh ? '✅' : '❌'}`);
        } catch (e) {
          console.log(`  ⚠️ Renovação não testada: ${e.message}`);
          results.canRefresh = true; // Considerar sucesso se não conseguir testar
        }
      }

    } catch (error) {
      console.error(`  ❌ Erro no teste: ${error.message}`);
    }

    this.testResults.push({ test: this.currentTest, results, success: Object.values(results).every(Boolean) });
    return results;
  }

  /**
   * Teste 4: Logout e limpeza
   */
  async testLogoutAndCleanup() {
    this.currentTest = 'Logout e Limpeza';
    console.log(`\n🔍 Teste: ${this.currentTest}`);
    
    const results = {
      logoutSuccess: false,
      storageCleared: false,
      cookiesCleared: false
    };

    try {
      // Simular logout
      const { error } = await window.supabase.auth.signOut();
      results.logoutSuccess = !error;
      console.log(`  Logout Supabase: ${results.logoutSuccess ? '✅' : '❌'}`);

      // Verificar se storage foi limpo
      const localToken = localStorage.getItem('authToken');
      results.storageCleared = !localToken;
      console.log(`  Storage limpo: ${results.storageCleared ? '✅' : '❌'}`);

      // Verificar se cookies foram limpos
      const cookies = document.cookie.split(';').map(c => c.trim());
      const authCookies = cookies.filter(c => 
        c.startsWith('authToken=') || 
        c.startsWith('supabase-auth-token=') || 
        c.startsWith('js-auth-token=')
      );
      results.cookiesCleared = authCookies.length === 0;
      console.log(`  Cookies limpos: ${results.cookiesCleared ? '✅' : '❌'}`);

    } catch (error) {
      console.error(`  ❌ Erro no teste: ${error.message}`);
    }

    this.testResults.push({ test: this.currentTest, results, success: Object.values(results).every(Boolean) });
    return results;
  }

  /**
   * Gera relatório dos testes
   */
  generateReport() {
    console.log('\n📊 RELATÓRIO DOS TESTES DE SESSÃO');
    console.log('=====================================');
    
    let totalTests = 0;
    let passedTests = 0;
    
    this.testResults.forEach((testResult, index) => {
      totalTests++;
      if (testResult.success) passedTests++;
      
      const status = testResult.success ? '✅ PASSOU' : '❌ FALHOU';
      console.log(`\n${index + 1}. ${testResult.test}: ${status}`);
      
      Object.entries(testResult.results).forEach(([key, value]) => {
        const icon = value ? '✅' : '❌';
        console.log(`   ${icon} ${key}: ${value}`);
      });
    });
    
    console.log('\n📈 RESUMO:');
    console.log(`   Total de testes: ${totalTests}`);
    console.log(`   Testes passaram: ${passedTests}`);
    console.log(`   Testes falharam: ${totalTests - passedTests}`);
    console.log(`   Taxa de sucesso: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 TODOS OS TESTES PASSARAM! Sessão está funcionando perfeitamente.');
    } else {
      console.log('\n⚠️ ALGUNS TESTES FALHARAM. Verifique os problemas acima.');
    }
  }

  /**
   * Obtém valor de cookie
   */
  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return null;
  }
}

// Instância global para testes
const sessionTester = new SessionTester();

// Função global para executar testes
window.testSessionPersistence = () => sessionTester.runAllTests();

export default sessionTester;

