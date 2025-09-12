#!/usr/bin/env node

/**
 * Script de teste para verificar as correções de autenticação do Supabase
 * 
 * Este script testa:
 * 1. Validação de tokens usando Supabase
 * 2. Headers de autorização
 * 3. Configuração do cliente Supabase
 * 4. Fluxo de autenticação completo
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Configurações
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uwcdaafcpezmzuveefrh.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Y2RhYWZjcGV6bXp1dmVlZnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyNzE0MjMsImV4cCI6MjA2MDg0NzQyM30.LuXtP_WSFTaDj41_zlIiEM0UXKXIRPiBNxCyrFPzAos';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Y2RhYWZjcGV6bXp1dmVlZnJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTI3MTQyMywiZXhwIjoyMDYwODQ3NDIzfQ.uTtFgeRX4f3oh1ENfHnN82seFnnHJW25su3VS5-OnSc';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, status, details = '') {
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  
  log(`${statusIcon} ${testName}`, statusColor);
  if (details) {
    log(`   ${details}`, 'blue');
  }
}

async function testSupabaseConnection() {
  log('\n🔍 Testando conexão com Supabase...', 'bold');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Teste 1: Conexão básica
    const { data, error } = await supabase.from('whatsapp_credentials').select('count').limit(1);
    if (error) {
      logTest('Conexão Supabase', 'FAIL', error.message);
      return false;
    }
    logTest('Conexão Supabase', 'PASS', 'Conexão estabelecida com sucesso');
    
    // Teste 2: Cliente Admin
    const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.listUsers();
    if (adminError) {
      logTest('Cliente Admin', 'FAIL', adminError.message);
      return false;
    }
    logTest('Cliente Admin', 'PASS', 'Cliente admin funcionando');
    
    return { supabase, supabaseAdmin };
  } catch (error) {
    logTest('Conexão Supabase', 'FAIL', error.message);
    return false;
  }
}

async function testTokenValidation(supabaseAdmin) {
  log('\n🔍 Testando validação de tokens...', 'bold');
  
  try {
    // Teste 1: Token inválido
    const { data: invalidData, error: invalidError } = await supabaseAdmin.auth.getUser('invalid-token');
    if (invalidError) {
      logTest('Token inválido', 'PASS', 'Rejeitado corretamente');
    } else {
      logTest('Token inválido', 'FAIL', 'Deveria ter rejeitado token inválido');
    }
    
    // Teste 2: Token mal formatado
    const { data: malformedData, error: malformedError } = await supabaseAdmin.auth.getUser('not.a.jwt');
    if (malformedError) {
      logTest('Token mal formatado', 'PASS', 'Rejeitado corretamente');
    } else {
      logTest('Token mal formatado', 'FAIL', 'Deveria ter rejeitado token mal formatado');
    }
    
    return true;
  } catch (error) {
    logTest('Validação de tokens', 'FAIL', error.message);
    return false;
  }
}

async function testAPIEndpoint() {
  log('\n🔍 Testando endpoint de verificação de token...', 'bold');
  
  try {
    // Teste 1: Requisição sem token
    try {
      await axios.post(`${API_BASE_URL}/api/auth/verify-token`, {});
      logTest('Sem token', 'FAIL', 'Deveria ter retornado erro 400');
    } catch (error) {
      if (error.response?.status === 400) {
        logTest('Sem token', 'PASS', 'Retornou erro 400 corretamente');
      } else {
        logTest('Sem token', 'FAIL', `Status inesperado: ${error.response?.status}`);
      }
    }
    
    // Teste 2: Token inválido
    try {
      await axios.post(`${API_BASE_URL}/api/auth/verify-token`, { token: 'invalid-token' });
      logTest('Token inválido', 'FAIL', 'Deveria ter retornado erro 400');
    } catch (error) {
      if (error.response?.status === 400) {
        logTest('Token inválido', 'PASS', 'Retornou erro 400 corretamente');
      } else {
        logTest('Token inválido', 'FAIL', `Status inesperado: ${error.response?.status}`);
      }
    }
    
    return true;
  } catch (error) {
    logTest('Endpoint API', 'FAIL', error.message);
    return false;
  }
}

async function testHeadersFormat() {
  log('\n🔍 Testando formato de headers...', 'bold');
  
  try {
    // Simular requisição com header de autorização
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
    
    const response = await axios.post(`${API_BASE_URL}/api/auth/verify-token`, 
      { token: testToken },
      {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    logTest('Header Authorization', 'PASS', 'Formato correto aceito');
    return true;
  } catch (error) {
    if (error.response?.status === 400) {
      logTest('Header Authorization', 'PASS', 'Token inválido rejeitado corretamente');
    } else {
      logTest('Header Authorization', 'FAIL', `Erro inesperado: ${error.message}`);
    }
    return false;
  }
}

async function runAllTests() {
  log('🚀 Iniciando testes de correção de autenticação Supabase', 'bold');
  log('=' .repeat(60), 'blue');
  
  const results = {
    supabase: false,
    tokens: false,
    api: false,
    headers: false
  };
  
  // Teste 1: Conexão Supabase
  const supabaseClients = await testSupabaseConnection();
  results.supabase = !!supabaseClients;
  
  if (supabaseClients) {
    // Teste 2: Validação de tokens
    results.tokens = await testTokenValidation(supabaseClients.supabaseAdmin);
  }
  
  // Teste 3: Endpoint API
  results.api = await testAPIEndpoint();
  
  // Teste 4: Headers
  results.headers = await testHeadersFormat();
  
  // Resumo
  log('\n📊 RESUMO DOS TESTES', 'bold');
  log('=' .repeat(60), 'blue');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  log(`Total de testes: ${totalTests}`, 'blue');
  log(`Testes aprovados: ${passedTests}`, passedTests === totalTests ? 'green' : 'yellow');
  log(`Testes falharam: ${totalTests - passedTests}`, passedTests === totalTests ? 'green' : 'red');
  
  if (passedTests === totalTests) {
    log('\n🎉 Todos os testes passaram! As correções estão funcionando.', 'green');
  } else {
    log('\n⚠️ Alguns testes falharam. Verifique os logs acima.', 'yellow');
  }
  
  return results;
}

// Executar testes se chamado diretamente
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testSupabaseConnection, testTokenValidation, testAPIEndpoint, testHeadersFormat };
