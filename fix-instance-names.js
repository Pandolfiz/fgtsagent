const fs = require('fs');
const path = 'frontend/src/pages/Chat.jsx';

try {
  let content = fs.readFileSync(path, 'utf8');
  
  // Contar ocorrências antes da correção
  const beforeCount = (content.match(/if \(selectedInstanceId === 'all' && instances\.length > 1\) \{/g) || []).length;
  console.log(`Ocorrências encontradas: ${beforeCount}`);
  
  // Aplicar correções
  content = content.replace(
    /if \(selectedInstanceId === 'all' && instances\.length > 1\) \{/g,
    "if (selectedInstanceId === 'all') {"
  );
  
  // Contar ocorrências após a correção
  const afterCount = (content.match(/if \(selectedInstanceId === 'all' && instances\.length > 1\) \{/g) || []).length;
  console.log(`Ocorrências restantes: ${afterCount}`);
  
  // Salvar arquivo
  fs.writeFileSync(path, content);
  console.log('✅ Correções aplicadas com sucesso!');
  
} catch (error) {
  console.error('❌ Erro ao aplicar correções:', error.message);
}
