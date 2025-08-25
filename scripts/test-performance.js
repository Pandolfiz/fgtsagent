/**
 * Script para testar performance das otimizações
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Endpoints para teste (alguns podem não precisar de autenticação)
const TEST_ENDPOINTS = [
  '/api/health', // Endpoint público
  '/api/health/cache', // Endpoint público
  '/api/dashboard/stats?period=daily', // Precisa auth
  '/api/leads/complete', // Precisa auth
  '/api/messages/5527997186150_5527996115344', // Precisa auth
  '/api/leads/842c16a8-0ef2-4cfd-98de-6b7bc348564b/cpf' // Precisa auth
];

// Token válido (você pode substituir por um token real)
const VALID_TOKEN = process.env.TEST_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdG5wdmJqY2NqY2NqY2NqY2MiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzNjQ0NjQwMCwiZXhwIjoxOTUyMDIyNDAwfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function testEndpoint(endpoint, iterations = 3, useAuth = false) {
  console.log(`\n🧪 Testando: ${endpoint} ${useAuth ? '(com auth)' : '(sem auth)'}`);
  
  const times = [];
  const headers = useAuth ? { 'Authorization': `Bearer ${VALID_TOKEN}` } : {};
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        timeout: 10000,
        headers
      });
      
      const duration = Date.now() - start;
      times.push(duration);
      
      console.log(`  ✅ Tentativa ${i + 1}: ${duration}ms (${response.status})`);
      
    } catch (error) {
      const duration = Date.now() - start;
      times.push(duration);
      
      const status = error.response?.status || 'timeout';
      const message = error.response?.data?.message || error.message;
      
      console.log(`  ❌ Tentativa ${i + 1}: ${duration}ms (${status}) - ${message}`);
    }
    
    // Aguardar 500ms entre tentativas
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  console.log(`  📊 Média: ${avg.toFixed(0)}ms | Min: ${min}ms | Max: ${max}ms`);
  
  return { avg, min, max, times };
}

async function testCache() {
  console.log('\n🔍 Testando cache...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/health/cache`);
    console.log('  📊 Estatísticas do cache:', response.data);
    return response.data;
  } catch (error) {
    console.log('  ❌ Erro ao obter estatísticas do cache:', error.message);
    return null;
  }
}

async function testHealthEndpoint() {
  console.log('\n🏥 Testando health check...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    console.log('  ✅ Health check:', response.data);
    return response.data;
  } catch (error) {
    console.log('  ❌ Health check falhou:', error.message);
    return null;
  }
}

async function runPerformanceTests() {
  console.log('🚀 Iniciando testes de performance...');
  console.log(`📍 URL base: ${BASE_URL}`);
  
  const results = {};
  
  // Testar endpoints públicos primeiro
  console.log('\n📋 Testando endpoints públicos...');
  results['/api/health'] = await testEndpoint('/api/health', 3, false);
  results['/api/health/cache'] = await testEndpoint('/api/health/cache', 3, false);
  
  // Testar endpoints que precisam de autenticação
  console.log('\n🔐 Testando endpoints protegidos...');
  const protectedEndpoints = [
    '/api/dashboard/stats?period=daily',
    '/api/leads/complete',
    '/api/messages/5527997186150_5527996115344',
    '/api/leads/842c16a8-0ef2-4cfd-98de-6b7bc348564b/cpf'
  ];
  
  for (const endpoint of protectedEndpoints) {
    results[endpoint] = await testEndpoint(endpoint, 3, true);
  }
  
  // Testar cache
  const cacheStats = await testCache();
  
  console.log('\n📈 Resumo dos resultados:');
  console.log('='.repeat(60));
  
  for (const [endpoint, result] of Object.entries(results)) {
    const status = result.avg < 1000 ? '🟢' : result.avg < 3000 ? '🟡' : '🔴';
    const auth = endpoint.includes('/health') ? '(público)' : '(protegido)';
    console.log(`${status} ${endpoint} ${auth}: ${result.avg.toFixed(0)}ms`);
  }
  
  if (cacheStats) {
    console.log(`\n💾 Cache: ${cacheStats.cache?.size || 0} itens armazenados`);
  }
  
  console.log('\n✅ Testes concluídos!');
  
  // Análise de performance
  const publicAvg = Object.entries(results)
    .filter(([endpoint]) => endpoint.includes('/health'))
    .reduce((sum, [, result]) => sum + result.avg, 0) / 2;
    
  const protectedAvg = Object.entries(results)
    .filter(([endpoint]) => !endpoint.includes('/health'))
    .reduce((sum, [, result]) => sum + result.avg, 0) / 4;
    
  console.log(`\n📊 Análise:`);
  console.log(`   Endpoints públicos: ${publicAvg.toFixed(0)}ms (média)`);
  console.log(`   Endpoints protegidos: ${protectedAvg.toFixed(0)}ms (média)`);
  
  return results;
}

// Função para testar com token real
async function testWithRealToken(token) {
  console.log('🔑 Testando com token real...');
  process.env.TEST_TOKEN = token;
  return runPerformanceTests();
}

// Executar se chamado diretamente
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === '--token' && args[1]) {
    testWithRealToken(args[1]).catch(console.error);
  } else {
    runPerformanceTests().catch(console.error);
  }
}

module.exports = { 
  runPerformanceTests, 
  testEndpoint, 
  testWithRealToken,
  testCache,
  testHealthEndpoint
}; 