# 🧪 Testes de Persistência de Sessão

Este diretório contém ferramentas para testar a persistência da sessão após a limpeza dos conflitos de autenticação.

## 📋 **O que é Testado**

### **1. 🔐 Fluxo de Login**
- Carregamento da página de login
- Preenchimento do formulário
- Submissão e autenticação
- Redirecionamento após sucesso
- Tratamento de erros

### **2. 💾 Armazenamento de Tokens**
- Token no localStorage
- Cookies de autenticação
- Storage do Supabase
- Sincronização entre storages
- Estrutura JWT válida

### **3. 🔄 Persistência de Sessão**
- Navegação entre páginas
- Manutenção da autenticação
- Consistência dos tokens
- Acesso ao backend

### **4. 🚪 Fluxo de Logout**
- Execução do logout
- Limpeza de tokens
- Limpeza de cookies
- Redirecionamento para login

## 🚀 **Como Executar os Testes**

### **Opção 1: Interface Gráfica (Recomendado para Desenvolvimento)**

1. **Importar o componente** no seu projeto:
```jsx
import SessionTestPanel from './components/SessionTestPanel';

// Usar em qualquer página
<SessionTestPanel />
```

2. **Executar testes**:
   - Clique em "🚀 Executar Testes de Sessão"
   - Verifique os resultados na interface
   - Analise logs detalhados se necessário

### **Opção 2: Console do Navegador**

1. **Abrir console** (F12)
2. **Executar comando**:
```javascript
window.testSessionPersistence()
```

3. **Ver resultados** no console

### **Opção 3: Script Automatizado (CI/CD)**

1. **Instalar dependências**:
```bash
npm install puppeteer
```

2. **Executar script**:
```bash
# Teste local
node scripts/test-session-persistence.js

# Teste com configuração customizada
TEST_BASE_URL=http://localhost:3000 HEADLESS=false node scripts/test-session-persistence.js
```

## ⚙️ **Configuração**

### **Variáveis de Ambiente**
```bash
# URL base para testes
TEST_BASE_URL=http://localhost:3000

# Modo headless (true/false)
HEADLESS=true

# Timeout em milissegundos
TIMEOUT=30000
```

### **Arquivo de Configuração**
Edite `test-session-config.json` para personalizar:
- Usuários de teste
- Seletores CSS
- Rotas de teste
- Tempos de espera

## 📊 **Interpretando os Resultados**

### **✅ Teste Passou**
- Todos os checks retornaram `true`
- Funcionalidade está funcionando corretamente
- Sessão está persistindo como esperado

### **❌ Teste Falhou**
- Um ou mais checks retornaram `false`
- Verifique os logs detalhados
- Identifique qual parte específica falhou

### **⚠️ Teste Parcial**
- Alguns checks passaram, outros falharam
- Sistema funciona parcialmente
- Requer investigação adicional

## 🔍 **Debugging de Problemas**

### **Problema: Login não redireciona**
```javascript
// Verificar se há erro no console
console.log('Erro de login:', error);

// Verificar se o formulário foi submetido
console.log('Formulário submetido:', formData);

// Verificar resposta do Supabase
console.log('Resposta Supabase:', data, error);
```

### **Problema: Token não persiste**
```javascript
// Verificar localStorage
console.log('localStorage:', localStorage.getItem('authToken'));

// Verificar cookies
console.log('Cookies:', document.cookie);

// Verificar Supabase storage
console.log('Supabase storage:', localStorage.getItem('supabase.auth.token'));
```

### **Problema: Sessão perde ao navegar**
```javascript
// Verificar se o middleware está funcionando
// Verificar se as rotas estão protegidas
// Verificar se o token está sendo enviado nas requisições
```

## 🧪 **Cenários de Teste**

### **Cenário 1: Usuário Novo**
1. Acessar `/login`
2. Preencher credenciais válidas
3. Submeter formulário
4. Verificar redirecionamento
5. Verificar armazenamento de token

### **Cenário 2: Usuário Existente**
1. Acessar `/login`
2. Preencher credenciais existentes
3. Submeter formulário
4. Verificar redirecionamento
5. Verificar persistência de sessão

### **Cenário 3: Navegação**
1. Fazer login
2. Navegar para `/dashboard`
3. Navegar para `/chat`
4. Verificar se ainda está autenticado
5. Verificar se token persiste

### **Cenário 4: Logout**
1. Estar logado
2. Clicar em logout
3. Verificar limpeza de tokens
4. Verificar redirecionamento
5. Verificar se não consegue acessar rotas protegidas

## 📝 **Logs e Screenshots**

### **Logs do Console**
- Todos os testes geram logs detalhados
- Use `console.log` para debug adicional
- Logs são capturados e exibidos na interface

### **Screenshots Automáticos**
- Capturados em cada etapa dos testes
- Salvos em `./test-screenshots/`
- Úteis para debug visual

## 🔧 **Personalização**

### **Adicionar Novos Testes**
```javascript
// No SessionTester
async testCustomFunctionality() {
  this.currentTest = 'Funcionalidade Customizada';
  
  try {
    // Seu teste aqui
    const result = { success: true, customData: 'valor' };
    this.testResults.push({ test: this.currentTest, results: result, success: true });
    return result;
  } catch (error) {
    // Tratamento de erro
  }
}
```

### **Modificar Configurações**
```json
{
  "testConfig": {
    "customSetting": "valor",
    "newSelector": ".custom-element"
  }
}
```

## 🚨 **Troubleshooting Comum**

### **Erro: "Browser não consegue conectar"**
- Verifique se a aplicação está rodando
- Confirme a URL em `TEST_BASE_URL`
- Verifique se não há firewall bloqueando

### **Erro: "Elemento não encontrado"**
- Verifique se os seletores CSS estão corretos
- Confirme se a página carregou completamente
- Ajuste os tempos de espera se necessário

### **Erro: "Timeout"**
- Aumente o valor de `TIMEOUT`
- Verifique se a aplicação não está lenta
- Considere usar `HEADLESS=false` para debug

## 📚 **Recursos Adicionais**

### **Documentação da Limpeza**
- `AUTH_CLEANUP_REPORT.md` - Relatório completo da limpeza
- `unifiedAuthMiddleware.js` - Middleware unificado
- `tokenManager.js` - Gerenciador de tokens

### **Ferramentas de Debug**
- Console do navegador
- DevTools > Application > Storage
- DevTools > Network > XHR

### **Comandos Úteis**
```javascript
// Verificar estado da sessão
window.supabase.auth.getSession()

// Verificar tokens armazenados
localStorage.getItem('authToken')

// Verificar cookies
document.cookie

// Executar testes manualmente
window.testSessionPersistence()
```

## ✅ **Conclusão**

Os testes de persistência de sessão garantem que:
- ✅ A limpeza dos conflitos foi bem-sucedida
- ✅ A autenticação está funcionando corretamente
- ✅ A sessão persiste entre navegações
- ✅ O logout limpa adequadamente os dados

Execute os testes regularmente para manter a qualidade da autenticação!

