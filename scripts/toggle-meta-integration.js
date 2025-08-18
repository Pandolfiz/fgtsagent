#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const COMPONENT_PATH = '../frontend/src/components/whatsapp-credentials/WhatsappCredentialsPage.tsx';

function toggleMetaIntegration() {
  console.log('🔄 Alternando integração com a Meta...\n');

  const componentPath = path.resolve(__dirname, COMPONENT_PATH);
  
  if (!fs.existsSync(componentPath)) {
    console.log('❌ Arquivo do componente não encontrado:', componentPath);
    return;
  }

  try {
    let content = fs.readFileSync(componentPath, 'utf8');
    
    // Verificar status atual
    const currentStatus = content.includes('const META_INTEGRATION_ENABLED = true');
    const newStatus = !currentStatus;
    
    console.log(`📊 Status atual: ${currentStatus ? 'ATIVO' : 'DESABILITADO'}`);
    console.log(`🎯 Alterando para: ${newStatus ? 'ATIVO' : 'DESABILITADO'}\n`);
    
    // Fazer backup
    const backupPath = componentPath + `.backup.${Date.now()}`;
    fs.writeFileSync(backupPath, content);
    console.log(`💾 Backup criado: ${path.basename(backupPath)}`);

    // Alterar o valor
    if (newStatus) {
      // Ativar
      content = content.replace(
        'const META_INTEGRATION_ENABLED = false; // false = desabilitado, true = ativo',
        'const META_INTEGRATION_ENABLED = true; // false = desabilitado, true = ativo'
      );
      console.log('✅ Integração Meta ATIVADA');
    } else {
      // Desativar
      content = content.replace(
        'const META_INTEGRATION_ENABLED = true; // false = desabilitado, true = ativo',
        'const META_INTEGRATION_ENABLED = false; // false = desabilitado, true = ativo'
      );
      console.log('✅ Integração Meta DESABILITADA');
    }
    
    // Salvar alterações
    fs.writeFileSync(componentPath, content);

    console.log('\n📋 Resumo das alterações:');
    console.log(`   - Botão "Conectar Meta": ${newStatus ? 'ATIVO' : 'DESABILITADO (visível com aviso)'}`);
    console.log(`   - Opção "API Oficial para Anúncios": ${newStatus ? 'ATIVA' : 'DESABILITADA (visível com aviso)'}`);
    console.log(`   - Toda funcionalidade: PRESERVADA`);
    console.log(`   - UI: ${newStatus ? 'FUNCIONAL' : 'VISÍVEL MAS DESABILITADA'}`);

    if (newStatus) {
      console.log('\n🚀 Para testar:');
      console.log('   1. Reiniciar o frontend: npm run dev');
      console.log('   2. Verificar se os botões estão funcionais');
      console.log('   3. Testar funcionalidade da Meta');
    } else {
      console.log('\n🔒 Para reativar posteriormente:');
      console.log('   1. Executar: node scripts/toggle-meta-integration.js');
      console.log('   2. Ou alterar manualmente: META_INTEGRATION_ENABLED = true');
      console.log('\n💡 Os botões permanecerão visíveis mas desabilitados');
      console.log('   com avisos sobre o desenvolvimento em andamento');
    }
    
    console.log('\n📖 Documentação: frontend/src/components/whatsapp-credentials/META_INTEGRATION_README.md');
    
  } catch (error) {
    console.log('❌ Erro ao alterar arquivo:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  toggleMetaIntegration();
}

module.exports = { toggleMetaIntegration };
