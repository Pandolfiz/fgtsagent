const { supabase, supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Script para diagnosticar e corrigir problemas identificados nos logs do terminal
 */
async function diagnoseTerminalErrors() {
  console.log('🔍 Iniciando diagnóstico dos erros do terminal...\n');

  // 1. Verificar configuração do Supabase
  console.log('1️⃣ Verificando configuração do Supabase...');
  await checkSupabaseConfiguration();

  // 2. Verificar versões das dependências
  console.log('\n2️⃣ Verificando versões das dependências...');
  await checkDependencies();

  // 3. Verificar problemas de autenticação
  console.log('\n3️⃣ Verificando problemas de autenticação...');
  await checkAuthenticationIssues();

  // 4. Verificar excesso de requisições
  console.log('\n4️⃣ Verificando excesso de requisições...');
  await checkRequestOverload();

  // 5. Verificar logs de erro
  console.log('\n5️⃣ Analisando logs de erro...');
  await analyzeErrorLogs();

  console.log('\n✅ Diagnóstico concluído!');
}

async function checkSupabaseConfiguration() {
  try {
    if (!supabase) {
      console.log('❌ Cliente Supabase não está configurado');
      return;
    }

    if (!supabaseAdmin) {
      console.log('❌ Cliente Supabase Admin não está configurado');
      return;
    }

    // Testar conexão
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
    
    if (error) {
      console.log(`❌ Erro na conexão com Supabase: ${error.message}`);
    } else {
      console.log('✅ Conexão com Supabase funcionando');
    }

    // Verificar se createUserSession está disponível
    if (typeof supabaseAdmin.auth.admin.createUserSession === 'function') {
      console.log('✅ createUserSession está disponível');
    } else {
      console.log('❌ createUserSession não está disponível - versão do Supabase pode estar desatualizada');
    }

  } catch (error) {
    console.log(`❌ Erro ao verificar configuração: ${error.message}`);
  }
}

async function checkDependencies() {
  try {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    const supabaseVersion = packageJson.dependencies['@supabase/supabase-js'];
    console.log(`📦 Versão do Supabase: ${supabaseVersion}`);

    // Verificar se a versão é recente
    const versionNumber = supabaseVersion.replace('^', '').replace('~', '');
    const majorVersion = parseInt(versionNumber.split('.')[0]);
    const minorVersion = parseInt(versionNumber.split('.')[1]);

    if (majorVersion >= 2 && minorVersion >= 49) {
      console.log('✅ Versão do Supabase é recente (2.49+)');
    } else {
      console.log('⚠️ Versão do Supabase pode estar desatualizada');
    }

  } catch (error) {
    console.log(`❌ Erro ao verificar dependências: ${error.message}`);
  }
}

async function checkAuthenticationIssues() {
  try {
    // Verificar se há tokens expirados no cache
    const cacheDir = path.join(__dirname, '..', 'temp');
    if (fs.existsSync(cacheDir)) {
      const cacheFiles = fs.readdirSync(cacheDir).filter(file => file.includes('token'));
      if (cacheFiles.length > 0) {
        console.log(`⚠️ Encontrados ${cacheFiles.length} arquivos de cache de token`);
        
        // Limpar cache antigo
        cacheFiles.forEach(file => {
          const filePath = path.join(cacheDir, file);
          const stats = fs.statSync(filePath);
          const ageInHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
          
          if (ageInHours > 24) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Removido cache antigo: ${file}`);
          }
        });
      }
    }

    // Verificar configuração de JWT
    const config = require('../config');
    if (!config.supabase.jwtSecret && !process.env.SUPABASE_JWT_SECRET) {
      console.log('⚠️ SUPABASE_JWT_SECRET não configurado');
    } else {
      console.log('✅ JWT Secret configurado');
    }

  } catch (error) {
    console.log(`❌ Erro ao verificar autenticação: ${error.message}`);
  }
}

async function checkRequestOverload() {
  try {
    // Verificar se há muitas requisições simultâneas
    const logsPath = path.join(__dirname, '..', 'logs', 'combined.log');
    
    if (fs.existsSync(logsPath)) {
      const logContent = fs.readFileSync(logsPath, 'utf8');
      const lines = logContent.split('\n');
      
      // Contar requisições de perfil nos últimos 1000 logs
      const recentLines = lines.slice(-1000);
      const profileRequests = recentLines.filter(line => 
        line.includes('ensureUserProfile') || line.includes('requireAuth')
      ).length;
      
      console.log(`📊 Requisições de perfil nos últimos logs: ${profileRequests}`);
      
      if (profileRequests > 100) {
        console.log('⚠️ Alto volume de requisições de perfil detectado');
      } else {
        console.log('✅ Volume de requisições normal');
      }
    }

  } catch (error) {
    console.log(`❌ Erro ao verificar sobrecarga: ${error.message}`);
  }
}

async function analyzeErrorLogs() {
  try {
    const errorLogPath = path.join(__dirname, '..', 'logs', 'error.log');
    
    if (fs.existsSync(errorLogPath)) {
      const errorContent = fs.readFileSync(errorLogPath, 'utf8');
      const lines = errorContent.split('\n');
      
      // Analisar erros mais comuns
      const createSessionErrors = lines.filter(line => 
        line.includes('createSession is not a function')
      ).length;
      
      const tokenErrors = lines.filter(line => 
        line.includes('Token expirado') || line.includes('Formato de token inválido')
      ).length;
      
      const evolutionErrors = lines.filter(line => 
        line.includes('Request failed with status code 404')
      ).length;
      
      console.log(`🔴 Erros de createSession: ${createSessionErrors}`);
      console.log(`🔴 Erros de token: ${tokenErrors}`);
      console.log(`🔴 Erros de Evolution API: ${evolutionErrors}`);
      
      if (createSessionErrors > 0) {
        console.log('💡 Solução: Atualizar versão do Supabase ou usar método alternativo');
      }
      
      if (tokenErrors > 0) {
        console.log('💡 Solução: Implementar renovação automática de tokens');
      }
      
      if (evolutionErrors > 0) {
        console.log('💡 Solução: Verificar conectividade com Evolution API');
      }
    }

  } catch (error) {
    console.log(`❌ Erro ao analisar logs: ${error.message}`);
  }
}

// Executar diagnóstico
if (require.main === module) {
  diagnoseTerminalErrors().catch(console.error);
}

module.exports = { diagnoseTerminalErrors }; 
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Script para diagnosticar e corrigir problemas identificados nos logs do terminal
 */
async function diagnoseTerminalErrors() {
  console.log('🔍 Iniciando diagnóstico dos erros do terminal...\n');

  // 1. Verificar configuração do Supabase
  console.log('1️⃣ Verificando configuração do Supabase...');
  await checkSupabaseConfiguration();

  // 2. Verificar versões das dependências
  console.log('\n2️⃣ Verificando versões das dependências...');
  await checkDependencies();

  // 3. Verificar problemas de autenticação
  console.log('\n3️⃣ Verificando problemas de autenticação...');
  await checkAuthenticationIssues();

  // 4. Verificar excesso de requisições
  console.log('\n4️⃣ Verificando excesso de requisições...');
  await checkRequestOverload();

  // 5. Verificar logs de erro
  console.log('\n5️⃣ Analisando logs de erro...');
  await analyzeErrorLogs();

  console.log('\n✅ Diagnóstico concluído!');
}

async function checkSupabaseConfiguration() {
  try {
    if (!supabase) {
      console.log('❌ Cliente Supabase não está configurado');
      return;
    }

    if (!supabaseAdmin) {
      console.log('❌ Cliente Supabase Admin não está configurado');
      return;
    }

    // Testar conexão
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
    
    if (error) {
      console.log(`❌ Erro na conexão com Supabase: ${error.message}`);
    } else {
      console.log('✅ Conexão com Supabase funcionando');
    }

    // Verificar se createUserSession está disponível
    if (typeof supabaseAdmin.auth.admin.createUserSession === 'function') {
      console.log('✅ createUserSession está disponível');
    } else {
      console.log('❌ createUserSession não está disponível - versão do Supabase pode estar desatualizada');
    }

  } catch (error) {
    console.log(`❌ Erro ao verificar configuração: ${error.message}`);
  }
}

async function checkDependencies() {
  try {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    const supabaseVersion = packageJson.dependencies['@supabase/supabase-js'];
    console.log(`📦 Versão do Supabase: ${supabaseVersion}`);

    // Verificar se a versão é recente
    const versionNumber = supabaseVersion.replace('^', '').replace('~', '');
    const majorVersion = parseInt(versionNumber.split('.')[0]);
    const minorVersion = parseInt(versionNumber.split('.')[1]);

    if (majorVersion >= 2 && minorVersion >= 49) {
      console.log('✅ Versão do Supabase é recente (2.49+)');
    } else {
      console.log('⚠️ Versão do Supabase pode estar desatualizada');
    }

  } catch (error) {
    console.log(`❌ Erro ao verificar dependências: ${error.message}`);
  }
}

async function checkAuthenticationIssues() {
  try {
    // Verificar se há tokens expirados no cache
    const cacheDir = path.join(__dirname, '..', 'temp');
    if (fs.existsSync(cacheDir)) {
      const cacheFiles = fs.readdirSync(cacheDir).filter(file => file.includes('token'));
      if (cacheFiles.length > 0) {
        console.log(`⚠️ Encontrados ${cacheFiles.length} arquivos de cache de token`);
        
        // Limpar cache antigo
        cacheFiles.forEach(file => {
          const filePath = path.join(cacheDir, file);
          const stats = fs.statSync(filePath);
          const ageInHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
          
          if (ageInHours > 24) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Removido cache antigo: ${file}`);
          }
        });
      }
    }

    // Verificar configuração de JWT
    const config = require('../config');
    if (!config.supabase.jwtSecret && !process.env.SUPABASE_JWT_SECRET) {
      console.log('⚠️ SUPABASE_JWT_SECRET não configurado');
    } else {
      console.log('✅ JWT Secret configurado');
    }

  } catch (error) {
    console.log(`❌ Erro ao verificar autenticação: ${error.message}`);
  }
}

async function checkRequestOverload() {
  try {
    // Verificar se há muitas requisições simultâneas
    const logsPath = path.join(__dirname, '..', 'logs', 'combined.log');
    
    if (fs.existsSync(logsPath)) {
      const logContent = fs.readFileSync(logsPath, 'utf8');
      const lines = logContent.split('\n');
      
      // Contar requisições de perfil nos últimos 1000 logs
      const recentLines = lines.slice(-1000);
      const profileRequests = recentLines.filter(line => 
        line.includes('ensureUserProfile') || line.includes('requireAuth')
      ).length;
      
      console.log(`📊 Requisições de perfil nos últimos logs: ${profileRequests}`);
      
      if (profileRequests > 100) {
        console.log('⚠️ Alto volume de requisições de perfil detectado');
      } else {
        console.log('✅ Volume de requisições normal');
      }
    }

  } catch (error) {
    console.log(`❌ Erro ao verificar sobrecarga: ${error.message}`);
  }
}

async function analyzeErrorLogs() {
  try {
    const errorLogPath = path.join(__dirname, '..', 'logs', 'error.log');
    
    if (fs.existsSync(errorLogPath)) {
      const errorContent = fs.readFileSync(errorLogPath, 'utf8');
      const lines = errorContent.split('\n');
      
      // Analisar erros mais comuns
      const createSessionErrors = lines.filter(line => 
        line.includes('createSession is not a function')
      ).length;
      
      const tokenErrors = lines.filter(line => 
        line.includes('Token expirado') || line.includes('Formato de token inválido')
      ).length;
      
      const evolutionErrors = lines.filter(line => 
        line.includes('Request failed with status code 404')
      ).length;
      
      console.log(`🔴 Erros de createSession: ${createSessionErrors}`);
      console.log(`🔴 Erros de token: ${tokenErrors}`);
      console.log(`🔴 Erros de Evolution API: ${evolutionErrors}`);
      
      if (createSessionErrors > 0) {
        console.log('💡 Solução: Atualizar versão do Supabase ou usar método alternativo');
      }
      
      if (tokenErrors > 0) {
        console.log('💡 Solução: Implementar renovação automática de tokens');
      }
      
      if (evolutionErrors > 0) {
        console.log('💡 Solução: Verificar conectividade com Evolution API');
      }
    }

  } catch (error) {
    console.log(`❌ Erro ao analisar logs: ${error.message}`);
  }
}

// Executar diagnóstico
if (require.main === module) {
  diagnoseTerminalErrors().catch(console.error);
}

module.exports = { diagnoseTerminalErrors }; 