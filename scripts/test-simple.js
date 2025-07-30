/**
 * Script de teste simples para verificar se as otimizações estão funcionando
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testHealth() {
  console.log('🏥 Testando health check...');
  
  try {
    const start = Date.now();
    const response = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
    const duration = Date.now() - start;
    
    console.log(`  ✅ Health check: ${duration}ms`);
    console.log(`  📊 Status: ${response.data.status}`);
    console.log(`  🕒 Timestamp: ${response.data.timestamp}`);
    
    return { success: true, duration };
  } catch (error) {
    console.log(`  ❌ Health check falhou: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testCache() {
  console.log('\n💾 Testando cache...');
  
  try {
    const start = Date.now();
    const response = await axios.get(`${BASE_URL}/api/health/cache`, { timeout: 5000 });
    const duration = Date.now() - start;
    
    console.log(`  ✅ Cache stats: ${duration}ms`);
    console.log(`  📊 Tamanho: ${response.data.cache.size} itens`);
    console.log(`  🔑 Total de chaves: ${response.data.cache.totalKeys}`);
    
    if (response.data.cache.keys.length > 0) {
      console.log(`  📝 Primeiras chaves: ${response.data.cache.keys.slice(0, 3).join(', ')}`);
    }
    
    return { success: true, duration, stats: response.data.cache };
  } catch (error) {
    console.log(`  ❌ Cache stats falhou: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testCacheClear() {
  console.log('\n🧹 Testando limpeza de cache...');
  
  try {
    const start = Date.now();
    const response = await axios.post(`${BASE_URL}/api/health/cache/clear`, {}, { timeout: 5000 });
    const duration = Date.now() - start;
    
    console.log(`  ✅ Cache clear: ${duration}ms`);
    console.log(`  📊 Mensagem: ${response.data.message}`);
    
    return { success: true, duration };
  } catch (error) {
    console.log(`  ❌ Cache clear falhou: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runSimpleTests() {
  console.log('🚀 Iniciando testes simples...');
  console.log(`📍 URL base: ${BASE_URL}`);
  
  const results = {};
  
  // Teste 1: Health check
  results.health = await testHealth();
  
  // Teste 2: Cache stats
  results.cache = await testCache();
  
  // Teste 3: Cache clear
  results.clear = await testCacheClear();
  
  // Teste 4: Cache stats novamente (deve estar vazio)
  results.cacheAfter = await testCache();
  
  console.log('\n📈 Resumo dos testes:');
  console.log('='.repeat(50));
  
  for (const [test, result] of Object.entries(results)) {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration ? `${result.duration}ms` : 'N/A';
    console.log(`${status} ${test}: ${duration}`);
  }
  
  // Verificar se o cache foi limpo
  if (results.cacheAfter.success && results.cacheAfter.stats.size === 0) {
    console.log('\n🎉 Cache foi limpo com sucesso!');
  }
  
  console.log('\n✅ Testes simples concluídos!');
  
  return results;
}

// Executar se chamado diretamente
if (require.main === module) {
  runSimpleTests().catch(console.error);
}

module.exports = { 
  runSimpleTests, 
  testHealth, 
  testCache, 
  testCacheClear 
}; 