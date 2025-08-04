const fs = require('fs');
const path = 'frontend/src/pages/Chat.jsx';

try {
  let content = fs.readFileSync(path, 'utf8');
  
  // Melhorar a função fetchContactInstances para lidar com contatos duplicados
  const improvedFunction = `  // Função para buscar instâncias dos contatos (SEMPRE executar)
  const fetchContactInstances = async (contacts) => {
    try {
      console.log('[INSTANCES] ��� Iniciando busca de instâncias para', contacts.length, 'contatos');
      const instanceMap = {};
      
      // Buscar instância para cada contato baseado na última mensagem
      const promises = contacts.map(async (contact) => {
        try {
          console.log(\`[INSTANCES] ��� Buscando instância para contato: \${contact.name || contact.push_name} (\${contact.remote_jid})\`);
          
          // ✅ MELHORIA: Priorizar instance_id do contato quando disponível
          if (contact.instance_id) {
            instanceMap[contact.remote_jid] = contact.instance_id;
            console.log(\`[INSTANCES] ✅ Contato \${contact.name || contact.push_name} -> Instância do contato: \${contact.instance_id} (prioritário)\`);
            return; // Pular busca na API se já temos instance_id
          }
          
          console.log(\`[INSTANCES] ��� URL da API: /api/chat/messages/\${contact.remote_jid}/last\`);
          const messagesResponse = await fetch(\`/api/chat/messages/\${contact.remote_jid}/last\`, {
            credentials: 'include'
          });
          
          if (messagesResponse.ok) {
            const messageData = await messagesResponse.json();
            console.log(\`[INSTANCES] ��� Resposta da API para \${contact.name || contact.push_name}:\`, messageData);
            
            if (messageData.success && messageData.message?.instance_id) {
              instanceMap[contact.remote_jid] = messageData.message.instance_id;
              console.log(\`[INSTANCES] ✅ Contato \${contact.name || contact.push_name} -> Instância: \${messageData.message.instance_id}\`);
            } else {
              console.log(\`[INSTANCES] ⚠️ Contato \${contact.name || contact.push_name} -> Sem instância na última mensagem\`);
              console.log(\`[INSTANCES] �� messageData:\`, messageData);
            }
          } else {
            console.log(\`[INSTANCES] ❌ Erro ao buscar mensagem para \${contact.name || contact.push_name}: \${messagesResponse.status}\`);
            const errorData = await messagesResponse.text();
            console.log(\`[INSTANCES] ❌ Detalhes do erro:\`, errorData);
          }
        } catch (error) {
          console.log(\`[INSTANCES] ❌ Erro ao buscar instância para \${contact.name || contact.push_name}:\`, error.message);
        }
      });
      
      await Promise.all(promises);
      
      console.log('[INSTANCES] ��� Mapa de instâncias:', instanceMap);
      
      // Verificar se há instâncias diferentes
      const uniqueInstances = [...new Set(Object.values(instanceMap))];
      
      if (uniqueInstances.length > 1) {
        console.log(\`[INSTANCES] ✅ \${Object.keys(instanceMap).length} contatos em \${uniqueInstances.length} instâncias\`);
        // Se ainda não estava em "all", mudar automaticamente
        if (selectedInstanceId !== 'all') {
          setSelectedInstanceId('all');
        }
      } else {
        console.log(\`[INSTANCES] ℹ️ Todos os contatos estão na mesma instância ou sem instância mapeada\`);
      }
      
      setContactInstances(instanceMap);
      
    } catch (error) {
      console.error('[INSTANCES] Erro ao buscar instâncias dos contatos:', error);
    }
  };`;
  
  // Substituir a função existente
  const functionRegex = /\/\/ Função para buscar instâncias dos contatos \(SEMPRE executar\)\s+const fetchContactInstances = async \(contacts\) => \{[\s\S]*?\};/;
  
  if (functionRegex.test(content)) {
    content = content.replace(functionRegex, improvedFunction);
    console.log('✅ Função fetchContactInstances melhorada!');
  } else {
    console.log('⚠️ Função fetchContactInstances não encontrada para substituição');
  }
  
  // Salvar arquivo
  fs.writeFileSync(path, content);
  console.log('✅ Melhorias aplicadas com sucesso!');
  
} catch (error) {
  console.error('❌ Erro ao aplicar melhorias:', error.message);
}
