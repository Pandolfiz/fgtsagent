const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'Chat.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Substituir a auto-seleção do contato para incluir carregamento de mensagens
const oldCode = `          // ✅ PROTEÇÃO CRÍTICA: Não sobrescrever contato durante carregamento inicial
          if (!isMobileView && sortedContacts.length > 0 && !isInitialLoad && !currentContact) {
            setCurrentContact(sortedContacts[0]);
            console.log('[CONTACTS] ✅ Contato auto-selecionado:', sortedContacts[0].push_name || sortedContacts[0].name);
          } else if (isInitialLoad) {
            console.log('[CONTACTS] ⚠️ Bloqueada auto-seleção durante carregamento inicial');
          } else if (currentContact) {
            console.log('[CONTACTS] ⚠️ Bloqueada auto-seleção - contato já selecionado:', currentContact.push_name || currentContact.name);
          }`;

const newCode = `          // ✅ PROTEÇÃO CRÍTICA: Não sobrescrever contato durante carregamento inicial
          if (!isMobileView && sortedContacts.length > 0 && !isInitialLoad && !currentContact) {
            const firstContact = sortedContacts[0];
            setCurrentContact(firstContact);
            console.log('[CONTACTS] ✅ Contato auto-selecionado:', firstContact.push_name || firstContact.name);
            
            // ✅ CORREÇÃO: Carregar mensagens do contato auto-selecionado
            if (firstContact?.remote_jid) {
              console.log('[CONTACTS] ��� Carregando mensagens do contato auto-selecionado:', firstContact.remote_jid);
              fetchMessages(firstContact.remote_jid, 1, true);
            }
          } else if (isInitialLoad) {
            console.log('[CONTACTS] ⚠️ Bloqueada auto-seleção durante carregamento inicial');
          } else if (currentContact) {
            console.log('[CONTACTS] ⚠️ Bloqueada auto-seleção - contato já selecionado:', currentContact.push_name || currentContact.name);
          }`;

content = content.replace(oldCode, newCode);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Bug de carregamento inicial corrigido com sucesso!');
