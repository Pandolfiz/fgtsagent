#!/usr/bin/env node

const { diagnoseTerminalErrors } = require('./diagnose_terminal_errors');
const { fixTerminalErrors } = require('./fix_terminal_errors');
const logger = require('../utils/logger');

/**
 * Script principal para diagnosticar e corrigir erros do terminal
 */
async function runTerminalFixes() {
  console.log('🚀 Iniciando diagnóstico e correção dos erros do terminal...\n');

  try {
    // 1. Executar diagnóstico
    console.log('📋 === DIAGNÓSTICO ===');
    await diagnoseTerminalErrors();

    console.log('\n' + '='.repeat(50) + '\n');

    // 2. Aplicar correções
    console.log('🔧 === APLICANDO CORREÇÕES ===');
    await fixTerminalErrors();

    console.log('\n' + '='.repeat(50) + '\n');

    // 3. Verificar se o servidor está rodando
    console.log('🔍 === VERIFICANDO SERVIDOR ===');
    await checkServerStatus();

    console.log('\n' + '='.repeat(50) + '\n');

    // 4. Executar diagnóstico final
    console.log('✅ === DIAGNÓSTICO FINAL ===');
    await diagnoseTerminalErrors();

    console.log('\n🎉 Processo concluído!');
    console.log('\n📝 Resumo das ações:');
    console.log('   ✅ Diagnóstico executado');
    console.log('   ✅ Correções aplicadas');
    console.log('   ✅ Middleware de renovação de tokens implementado');
    console.log('   ✅ Cache e logs limpos');
    console.log('   ✅ Verificações de conectividade realizadas');

  } catch (error) {
    console.error('❌ Erro durante o processo:', error.message);
    logger.error('Erro no script de correção:', error);
    process.exit(1);
  }
}

async function checkServerStatus() {
  try {
    const axios = require('axios');
    
    // Verificar se o servidor está respondendo
    try {
      const response = await axios.get('http://localhost:3000/api/health', {
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log('✅ Servidor está respondendo na porta 3000');
      } else {
        console.log('⚠️ Servidor respondeu com status inesperado:', response.status);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Servidor não está rodando na porta 3000');
        console.log('💡 Execute: npm run dev:all');
      } else {
        console.log('⚠️ Erro ao conectar com servidor:', error.message);
      }
    }

    // Verificar se o frontend está respondendo
    try {
      const response = await axios.get('http://localhost:5173', {
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log('✅ Frontend está respondendo na porta 5173');
      } else {
        console.log('⚠️ Frontend respondeu com status inesperado:', response.status);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Frontend não está rodando na porta 5173');
        console.log('💡 Execute: npm run dev:all');
      } else {
        console.log('⚠️ Erro ao conectar com frontend:', error.message);
      }
    }

  } catch (error) {
    console.log('❌ Erro ao verificar status do servidor:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runTerminalFixes().catch(console.error);
}

module.exports = { runTerminalFixes }; 

const { diagnoseTerminalErrors } = require('./diagnose_terminal_errors');
const { fixTerminalErrors } = require('./fix_terminal_errors');
const logger = require('../utils/logger');

/**
 * Script principal para diagnosticar e corrigir erros do terminal
 */
async function runTerminalFixes() {
  console.log('🚀 Iniciando diagnóstico e correção dos erros do terminal...\n');

  try {
    // 1. Executar diagnóstico
    console.log('📋 === DIAGNÓSTICO ===');
    await diagnoseTerminalErrors();

    console.log('\n' + '='.repeat(50) + '\n');

    // 2. Aplicar correções
    console.log('🔧 === APLICANDO CORREÇÕES ===');
    await fixTerminalErrors();

    console.log('\n' + '='.repeat(50) + '\n');

    // 3. Verificar se o servidor está rodando
    console.log('🔍 === VERIFICANDO SERVIDOR ===');
    await checkServerStatus();

    console.log('\n' + '='.repeat(50) + '\n');

    // 4. Executar diagnóstico final
    console.log('✅ === DIAGNÓSTICO FINAL ===');
    await diagnoseTerminalErrors();

    console.log('\n🎉 Processo concluído!');
    console.log('\n📝 Resumo das ações:');
    console.log('   ✅ Diagnóstico executado');
    console.log('   ✅ Correções aplicadas');
    console.log('   ✅ Middleware de renovação de tokens implementado');
    console.log('   ✅ Cache e logs limpos');
    console.log('   ✅ Verificações de conectividade realizadas');

  } catch (error) {
    console.error('❌ Erro durante o processo:', error.message);
    logger.error('Erro no script de correção:', error);
    process.exit(1);
  }
}

async function checkServerStatus() {
  try {
    const axios = require('axios');
    
    // Verificar se o servidor está respondendo
    try {
      const response = await axios.get('http://localhost:3000/api/health', {
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log('✅ Servidor está respondendo na porta 3000');
      } else {
        console.log('⚠️ Servidor respondeu com status inesperado:', response.status);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Servidor não está rodando na porta 3000');
        console.log('💡 Execute: npm run dev:all');
      } else {
        console.log('⚠️ Erro ao conectar com servidor:', error.message);
      }
    }

    // Verificar se o frontend está respondendo
    try {
      const response = await axios.get('http://localhost:5173', {
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log('✅ Frontend está respondendo na porta 5173');
      } else {
        console.log('⚠️ Frontend respondeu com status inesperado:', response.status);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Frontend não está rodando na porta 5173');
        console.log('💡 Execute: npm run dev:all');
      } else {
        console.log('⚠️ Erro ao conectar com frontend:', error.message);
      }
    }

  } catch (error) {
    console.log('❌ Erro ao verificar status do servidor:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runTerminalFixes().catch(console.error);
}

module.exports = { runTerminalFixes }; 