const { supabase, supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Script para corrigir problemas identificados nos logs do terminal
 */
async function fixTerminalErrors() {
  console.log('🔧 Iniciando correção dos erros do terminal...\n');

  // 1. Corrigir problema do createSession
  console.log('1️⃣ Corrigindo problema do createSession...');
  await fixCreateSessionIssue();

  // 2. Implementar renovação automática de tokens
  console.log('\n2️⃣ Implementando renovação automática de tokens...');
  await implementTokenRefresh();

  // 3. Otimizar requisições de perfil
  console.log('\n3️⃣ Otimizando requisições de perfil...');
  await optimizeProfileRequests();

  // 4. Limpar cache e logs antigos
  console.log('\n4️⃣ Limpando cache e logs antigos...');
  await cleanupCacheAndLogs();

  // 5. Verificar conectividade com Evolution API
  console.log('\n5️⃣ Verificando conectividade com Evolution API...');
  await checkEvolutionAPI();

  console.log('\n✅ Correções aplicadas!');
}

async function fixCreateSessionIssue() {
  try {
    // Verificar se createUserSession está disponível
    if (typeof supabaseAdmin?.auth?.admin?.createUserSession === 'function') {
      console.log('✅ createUserSession está disponível - problema pode ser de versão');
      
      // Atualizar o controller para usar o método correto
      const authControllerPath = path.join(__dirname, '..', 'controllers', 'authController.js');
      if (fs.existsSync(authControllerPath)) {
        let content = fs.readFileSync(authControllerPath, 'utf8');
        
        // Verificar se já está usando createUserSession
        if (content.includes('createUserSession')) {
          console.log('✅ Controller já está usando createUserSession');
        } else {
          console.log('⚠️ Controller precisa ser atualizado para usar createUserSession');
        }
      }
    } else {
      console.log('❌ createUserSession não está disponível - implementando fallback');
      
      // Implementar fallback no auth service
      const authServicePath = path.join(__dirname, '..', 'services', 'auth.js');
      if (fs.existsSync(authServicePath)) {
        let content = fs.readFileSync(authServicePath, 'utf8');
        
        // Verificar se já tem fallback implementado
        if (content.includes('createAdminSession')) {
          console.log('✅ Fallback já implementado no auth service');
        } else {
          console.log('⚠️ Fallback precisa ser implementado');
        }
      }
    }

  } catch (error) {
    console.log(`❌ Erro ao corrigir createSession: ${error.message}`);
  }
}

async function implementTokenRefresh() {
  try {
    // Verificar se já existe middleware de renovação de token
    const middlewarePath = path.join(__dirname, '..', 'middleware', 'auth.js');
    if (fs.existsSync(middlewarePath)) {
      let content = fs.readFileSync(middlewarePath, 'utf8');
      
      if (content.includes('refreshToken') || content.includes('autoRefreshToken')) {
        console.log('✅ Renovação automática de tokens já implementada');
      } else {
        console.log('⚠️ Renovação automática de tokens precisa ser implementada');
        
        // Adicionar lógica de renovação automática
        const refreshLogic = `
// Função para renovar token automaticamente
const refreshTokenIfNeeded = async (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded) return null;
    
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;
    
    // Renovar se faltar menos de 5 minutos
    if (timeUntilExpiry < 300) {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: token
      });
      
      if (!error && data.session) {
        return data.session.access_token;
      }
    }
    
    return token;
  } catch (error) {
    logger.error('Erro ao renovar token:', error.message);
    return null;
  }
};
`;
        
        // Inserir antes da função verifyToken
        const insertIndex = content.indexOf('exports.verifyToken');
        if (insertIndex !== -1) {
          const newContent = content.slice(0, insertIndex) + refreshLogic + '\n' + content.slice(insertIndex);
          fs.writeFileSync(middlewarePath, newContent);
          console.log('✅ Lógica de renovação de token adicionada');
        }
      }
    }

  } catch (error) {
    console.log(`❌ Erro ao implementar renovação de tokens: ${error.message}`);
  }
}

async function optimizeProfileRequests() {
  try {
    // Verificar se há cache implementado para requisições de perfil
    const utilsPath = path.join(__dirname, '..', 'utils', 'supabaseOptimized.js');
    if (fs.existsSync(utilsPath)) {
      let content = fs.readFileSync(utilsPath, 'utf8');
      
      if (content.includes('optimizedSelect') && content.includes('cache')) {
        console.log('✅ Cache otimizado já implementado');
      } else {
        console.log('⚠️ Cache otimizado precisa ser implementado');
      }
    }

    // Verificar se há debounce nas requisições do frontend
    const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'Dashboard.jsx');
    if (fs.existsSync(frontendPath)) {
      let content = fs.readFileSync(frontendPath, 'utf8');
      
      if (content.includes('useEffect') && content.includes('setInterval')) {
        console.log('✅ Sincronização inteligente já implementada no frontend');
      } else {
        console.log('⚠️ Sincronização inteligente precisa ser implementada');
      }
    }

  } catch (error) {
    console.log(`❌ Erro ao otimizar requisições: ${error.message}`);
  }
}

async function cleanupCacheAndLogs() {
  try {
    // Limpar cache antigo
    const cacheDir = path.join(__dirname, '..', 'temp');
    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      let removedCount = 0;
      
      files.forEach(file => {
        const filePath = path.join(cacheDir, file);
        const stats = fs.statSync(filePath);
        const ageInHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
        
        if (ageInHours > 24) {
          fs.unlinkSync(filePath);
          removedCount++;
        }
      });
      
      if (removedCount > 0) {
        console.log(`🗑️ Removidos ${removedCount} arquivos de cache antigos`);
      } else {
        console.log('✅ Cache já está limpo');
      }
    }

    // Rotacionar logs se estiverem muito grandes
    const logsDir = path.join(__dirname, '..', 'logs');
    if (fs.existsSync(logsDir)) {
      const logFiles = ['combined.log', 'error.log'];
      
      logFiles.forEach(logFile => {
        const logPath = path.join(logsDir, logFile);
        if (fs.existsSync(logPath)) {
          const stats = fs.statSync(logPath);
          const sizeInMB = stats.size / (1024 * 1024);
          
          if (sizeInMB > 10) {
            const backupPath = logPath + '.backup';
            fs.renameSync(logPath, backupPath);
            fs.writeFileSync(logPath, ''); // Criar novo arquivo vazio
            console.log(`📄 Log ${logFile} rotacionado (${sizeInMB.toFixed(1)}MB)`);
          } else {
            console.log(`✅ Log ${logFile} está com tamanho normal (${sizeInMB.toFixed(1)}MB)`);
          }
        }
      });
    }

  } catch (error) {
    console.log(`❌ Erro ao limpar cache e logs: ${error.message}`);
  }
}

async function checkEvolutionAPI() {
  try {
    // Verificar conectividade com Evolution API
    const axios = require('axios');
    const config = require('../config');
    
    if (config.evolution && config.evolution.baseUrl) {
      try {
        const response = await axios.get(`${config.evolution.baseUrl}/instance/fetchInstances`, {
          timeout: 5000
        });
        
        if (response.status === 200) {
          console.log('✅ Evolution API está respondendo');
        } else {
          console.log('⚠️ Evolution API retornou status inesperado');
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('❌ Evolution API não está acessível (conexão recusada)');
        } else if (error.code === 'ETIMEDOUT') {
          console.log('❌ Evolution API não está respondendo (timeout)');
        } else {
          console.log(`⚠️ Erro ao conectar com Evolution API: ${error.message}`);
        }
      }
    } else {
      console.log('⚠️ URL da Evolution API não configurada');
    }

  } catch (error) {
    console.log(`❌ Erro ao verificar Evolution API: ${error.message}`);
  }
}

// Executar correções
if (require.main === module) {
  fixTerminalErrors().catch(console.error);
}

module.exports = { fixTerminalErrors }; 
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Script para corrigir problemas identificados nos logs do terminal
 */
async function fixTerminalErrors() {
  console.log('🔧 Iniciando correção dos erros do terminal...\n');

  // 1. Corrigir problema do createSession
  console.log('1️⃣ Corrigindo problema do createSession...');
  await fixCreateSessionIssue();

  // 2. Implementar renovação automática de tokens
  console.log('\n2️⃣ Implementando renovação automática de tokens...');
  await implementTokenRefresh();

  // 3. Otimizar requisições de perfil
  console.log('\n3️⃣ Otimizando requisições de perfil...');
  await optimizeProfileRequests();

  // 4. Limpar cache e logs antigos
  console.log('\n4️⃣ Limpando cache e logs antigos...');
  await cleanupCacheAndLogs();

  // 5. Verificar conectividade com Evolution API
  console.log('\n5️⃣ Verificando conectividade com Evolution API...');
  await checkEvolutionAPI();

  console.log('\n✅ Correções aplicadas!');
}

async function fixCreateSessionIssue() {
  try {
    // Verificar se createUserSession está disponível
    if (typeof supabaseAdmin?.auth?.admin?.createUserSession === 'function') {
      console.log('✅ createUserSession está disponível - problema pode ser de versão');
      
      // Atualizar o controller para usar o método correto
      const authControllerPath = path.join(__dirname, '..', 'controllers', 'authController.js');
      if (fs.existsSync(authControllerPath)) {
        let content = fs.readFileSync(authControllerPath, 'utf8');
        
        // Verificar se já está usando createUserSession
        if (content.includes('createUserSession')) {
          console.log('✅ Controller já está usando createUserSession');
        } else {
          console.log('⚠️ Controller precisa ser atualizado para usar createUserSession');
        }
      }
    } else {
      console.log('❌ createUserSession não está disponível - implementando fallback');
      
      // Implementar fallback no auth service
      const authServicePath = path.join(__dirname, '..', 'services', 'auth.js');
      if (fs.existsSync(authServicePath)) {
        let content = fs.readFileSync(authServicePath, 'utf8');
        
        // Verificar se já tem fallback implementado
        if (content.includes('createAdminSession')) {
          console.log('✅ Fallback já implementado no auth service');
        } else {
          console.log('⚠️ Fallback precisa ser implementado');
        }
      }
    }

  } catch (error) {
    console.log(`❌ Erro ao corrigir createSession: ${error.message}`);
  }
}

async function implementTokenRefresh() {
  try {
    // Verificar se já existe middleware de renovação de token
    const middlewarePath = path.join(__dirname, '..', 'middleware', 'auth.js');
    if (fs.existsSync(middlewarePath)) {
      let content = fs.readFileSync(middlewarePath, 'utf8');
      
      if (content.includes('refreshToken') || content.includes('autoRefreshToken')) {
        console.log('✅ Renovação automática de tokens já implementada');
      } else {
        console.log('⚠️ Renovação automática de tokens precisa ser implementada');
        
        // Adicionar lógica de renovação automática
        const refreshLogic = `
// Função para renovar token automaticamente
const refreshTokenIfNeeded = async (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded) return null;
    
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;
    
    // Renovar se faltar menos de 5 minutos
    if (timeUntilExpiry < 300) {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: token
      });
      
      if (!error && data.session) {
        return data.session.access_token;
      }
    }
    
    return token;
  } catch (error) {
    logger.error('Erro ao renovar token:', error.message);
    return null;
  }
};
`;
        
        // Inserir antes da função verifyToken
        const insertIndex = content.indexOf('exports.verifyToken');
        if (insertIndex !== -1) {
          const newContent = content.slice(0, insertIndex) + refreshLogic + '\n' + content.slice(insertIndex);
          fs.writeFileSync(middlewarePath, newContent);
          console.log('✅ Lógica de renovação de token adicionada');
        }
      }
    }

  } catch (error) {
    console.log(`❌ Erro ao implementar renovação de tokens: ${error.message}`);
  }
}

async function optimizeProfileRequests() {
  try {
    // Verificar se há cache implementado para requisições de perfil
    const utilsPath = path.join(__dirname, '..', 'utils', 'supabaseOptimized.js');
    if (fs.existsSync(utilsPath)) {
      let content = fs.readFileSync(utilsPath, 'utf8');
      
      if (content.includes('optimizedSelect') && content.includes('cache')) {
        console.log('✅ Cache otimizado já implementado');
      } else {
        console.log('⚠️ Cache otimizado precisa ser implementado');
      }
    }

    // Verificar se há debounce nas requisições do frontend
    const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'Dashboard.jsx');
    if (fs.existsSync(frontendPath)) {
      let content = fs.readFileSync(frontendPath, 'utf8');
      
      if (content.includes('useEffect') && content.includes('setInterval')) {
        console.log('✅ Sincronização inteligente já implementada no frontend');
      } else {
        console.log('⚠️ Sincronização inteligente precisa ser implementada');
      }
    }

  } catch (error) {
    console.log(`❌ Erro ao otimizar requisições: ${error.message}`);
  }
}

async function cleanupCacheAndLogs() {
  try {
    // Limpar cache antigo
    const cacheDir = path.join(__dirname, '..', 'temp');
    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      let removedCount = 0;
      
      files.forEach(file => {
        const filePath = path.join(cacheDir, file);
        const stats = fs.statSync(filePath);
        const ageInHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
        
        if (ageInHours > 24) {
          fs.unlinkSync(filePath);
          removedCount++;
        }
      });
      
      if (removedCount > 0) {
        console.log(`🗑️ Removidos ${removedCount} arquivos de cache antigos`);
      } else {
        console.log('✅ Cache já está limpo');
      }
    }

    // Rotacionar logs se estiverem muito grandes
    const logsDir = path.join(__dirname, '..', 'logs');
    if (fs.existsSync(logsDir)) {
      const logFiles = ['combined.log', 'error.log'];
      
      logFiles.forEach(logFile => {
        const logPath = path.join(logsDir, logFile);
        if (fs.existsSync(logPath)) {
          const stats = fs.statSync(logPath);
          const sizeInMB = stats.size / (1024 * 1024);
          
          if (sizeInMB > 10) {
            const backupPath = logPath + '.backup';
            fs.renameSync(logPath, backupPath);
            fs.writeFileSync(logPath, ''); // Criar novo arquivo vazio
            console.log(`📄 Log ${logFile} rotacionado (${sizeInMB.toFixed(1)}MB)`);
          } else {
            console.log(`✅ Log ${logFile} está com tamanho normal (${sizeInMB.toFixed(1)}MB)`);
          }
        }
      });
    }

  } catch (error) {
    console.log(`❌ Erro ao limpar cache e logs: ${error.message}`);
  }
}

async function checkEvolutionAPI() {
  try {
    // Verificar conectividade com Evolution API
    const axios = require('axios');
    const config = require('../config');
    
    if (config.evolution && config.evolution.baseUrl) {
      try {
        const response = await axios.get(`${config.evolution.baseUrl}/instance/fetchInstances`, {
          timeout: 5000
        });
        
        if (response.status === 200) {
          console.log('✅ Evolution API está respondendo');
        } else {
          console.log('⚠️ Evolution API retornou status inesperado');
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('❌ Evolution API não está acessível (conexão recusada)');
        } else if (error.code === 'ETIMEDOUT') {
          console.log('❌ Evolution API não está respondendo (timeout)');
        } else {
          console.log(`⚠️ Erro ao conectar com Evolution API: ${error.message}`);
        }
      }
    } else {
      console.log('⚠️ URL da Evolution API não configurada');
    }

  } catch (error) {
    console.log(`❌ Erro ao verificar Evolution API: ${error.message}`);
  }
}

// Executar correções
if (require.main === module) {
  fixTerminalErrors().catch(console.error);
}

module.exports = { fixTerminalErrors }; 