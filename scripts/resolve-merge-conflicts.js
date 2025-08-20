#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Resolvendo conflitos de merge automaticamente...\n');

// Função para resolver conflitos em um arquivo
function resolveConflicts(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Padrões comuns de conflitos
    const patterns = [
      // Remover marcadores de conflito e manter a versão HEAD (nossa versão)
      /<<<<<<< HEAD\n([\s\S]*?)\n=======\n[\s\S]*?\n>>>>>>> [^\n]*\n/g,
      // Remover marcadores de conflito e manter a versão HEAD (sem quebra de linha)
      /<<<<<<< HEAD\n([\s\S]*?)\n=======\n[\s\S]*?\n>>>>>>> [^\n]*/g,
      // Remover marcadores de conflito restantes
      /<<<<<<< HEAD\n/g,
      /=======\n/g,
      />>>>>>> [^\n]*\n/g
    ];
    
    // Aplicar cada padrão
    patterns.forEach((pattern, index) => {
      if (index === 0 || index === 1) {
        // Para os primeiros padrões, manter o conteúdo HEAD
        content = content.replace(pattern, '$1');
      } else {
        // Para os outros, apenas remover os marcadores
        content = content.replace(pattern, '');
      }
    });
    
    // Se o conteúdo mudou, salvar o arquivo
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Resolvido: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

// Lista de arquivos com conflitos conhecidos
const conflictedFiles = [
  'package.json',
  'package-lock.json',
  'src/services/stripeService.js',
  'frontend/src/pages/Chat.jsx',
  'src/controllers/chatController.js',
  'src/routes/stripeRoutes.js'
];

let resolvedCount = 0;

// Resolver conflitos em cada arquivo
conflictedFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    if (resolveConflicts(filePath)) {
      resolvedCount++;
    }
  } else {
    console.log(`⚠️  Arquivo não encontrado: ${file}`);
  }
});

// Verificar se ainda há conflitos
console.log('\n🔍 Verificando se ainda há conflitos...');
const remainingConflicts = [];

function checkForConflicts(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      checkForConflicts(filePath);
    } else if (stat.isFile() && /\.(js|jsx|ts|tsx|json)$/.test(file)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('<<<<<<< HEAD')) {
          remainingConflicts.push(filePath);
        }
      } catch (error) {
        // Ignorar erros de leitura
      }
    }
  });
}

checkForConflicts(process.cwd());

if (remainingConflicts.length > 0) {
  console.log('\n⚠️  Ainda há conflitos nos seguintes arquivos:');
  remainingConflicts.forEach(file => {
    console.log(`   - ${file}`);
  });
  console.log('\n💡 Execute este script novamente ou resolva manualmente os conflitos restantes.');
} else {
  console.log('\n🎉 Todos os conflitos foram resolvidos automaticamente!');
}

console.log(`\n📊 Resumo: ${resolvedCount} arquivos processados`);
console.log('\n💡 Próximos passos:');
console.log('   1. Verifique se os arquivos estão corretos');
console.log('   2. Execute: git add .');
console.log('   3. Execute: git commit -m "Resolve merge conflicts"');
console.log('   4. Ou execute: git merge --continue');
