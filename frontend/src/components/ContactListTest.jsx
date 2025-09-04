import React, { useState } from 'react';
import ContactList from './ContactList';

/**
 * Componente de teste para verificar as correções na lista de contatos
 */
const ContactListTest = () => {
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Dados de teste que simulam o problema real
  const testContacts = [
    {
      id: 1,
      name: 'Luiz Fiorim',
      push_name: 'Luiz',
      remote_jid: '5511999999999@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min atrás
      last_message: {
        content: 'oi',
        type: 'text'
      },
      unread_count: 0,
      is_online: true
    },
    {
      id: 2,
      name: 'Clademir',
      push_name: 'Clademir',
      remote_jid: '5511888888888@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 dia atrás
      last_message: {
        content: 'olá clademir',
        type: 'text'
      },
      unread_count: 0,
      is_online: false
    },
    {
      id: 3,
      name: 'Pedro',
      push_name: 'Pedro',
      remote_jid: '5511777777777@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 dias atrás
      last_message: {
        content: 'estou aguardando voltar para consultar o saldo do senhor',
        type: 'text'
      },
      unread_count: 0,
      is_online: true
    },
    {
      id: 4,
      name: 'Pamela',
      push_name: 'Pamela',
      remote_jid: '5511666666666@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 48 + 1000 * 60 * 2).toISOString(), // 2 dias atrás + 2 min
      last_message: {
        content: 'ei pamela, o sistema do fgts está fora do ar no momento...',
        type: 'text'
      },
      unread_count: 0,
      is_online: false
    },
    // Contatos sem last_message (simulando o problema)
    {
      id: 5,
      name: 'Alex Sandro',
      push_name: 'Alex',
      remote_jid: '5512991291875@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 dias atrás
      // Sem last_message - deve mostrar o remote_jid
      unread_count: 0,
      is_online: false
    },
    {
      id: 6,
      name: 'santosmauricio2714',
      push_name: 'Mauricio',
      remote_jid: '554196466126@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(), // 4 dias atrás
      // Sem last_message - deve mostrar o remote_jid
      unread_count: 0,
      is_online: false
    },
    {
      id: 7,
      name: 'Anderson Cezar',
      push_name: 'Anderson',
      remote_jid: '555591726858@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(), // 5 dias atrás
      // Sem last_message - deve mostrar o remote_jid
      unread_count: 0,
      is_online: false
    },
    {
      id: 8,
      name: 'Luciano',
      push_name: 'Luciano',
      remote_jid: '555189817102@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 144).toISOString(), // 6 dias atrás
      // Sem last_message - deve mostrar o remote_jid
      unread_count: 0,
      is_online: false
    },
    {
      id: 9,
      name: 'Eder da Conceição',
      push_name: 'Eder',
      remote_jid: '5511976365657@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString(), // 7 dias atrás
      // Sem last_message - deve mostrar o remote_jid
      unread_count: 0,
      is_online: false
    },
    {
      id: 10,
      name: 'Hadrians Imperador',
      push_name: 'Hadrians',
      remote_jid: '558491520981@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 192).toISOString(), // 8 dias atrás
      // Sem last_message - deve mostrar o remote_jid
      unread_count: 0,
      is_online: false
    },
    {
      id: 11,
      name: 'Elizeu Plinio',
      push_name: 'Elizeu',
      remote_jid: '557399611026@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 216).toISOString(), // 9 dias atrás
      // Sem last_message - deve mostrar o remote_jid
      unread_count: 0,
      is_online: false
    },
    {
      id: 12,
      name: 'Silvia',
      push_name: 'Silvia',
      remote_jid: '5512996781409@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 240).toISOString(), // 10 dias atrás
      // Sem last_message - deve mostrar o remote_jid
      unread_count: 0,
      is_online: false
    },
    {
      id: 13,
      name: 'Nithalhy',
      push_name: 'Nithalhy',
      remote_jid: '5519997489845@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 264).toISOString(), // 11 dias atrás
      last_message: {
        content: '•O• ❤️ •O•',
        type: 'text'
      },
      unread_count: 0,
      is_online: false
    },
    {
      id: 14,
      name: 'Daniel Alves',
      push_name: 'Daniel',
      remote_jid: '556391184299@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 288).toISOString(), // 12 dias atrás
      // Sem last_message - deve mostrar o remote_jid
      unread_count: 0,
      is_online: false
    },
    {
      id: 15,
      name: 'Drika',
      push_name: 'Drika',
      remote_jid: '5511978459097@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 312).toISOString(), // 13 dias atrás
      // Sem last_message - deve mostrar o remote_jid
      unread_count: 0,
      is_online: false
    }
  ];

  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
    console.log('Contato selecionado:', contact);
  };

  const handleSearch = () => {
    console.log('Busca realizada:', searchQuery);
  };

  const handleSync = () => {
    console.log('Sincronização realizada');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Teste: Lista de Contatos Corrigida
        </h1>
        <p className="text-gray-600 mb-6">
          Verificando se as correções estão funcionando:
        </p>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>✅ Preview da mensagem sempre visível</li>
          <li>✅ Timestamp inteligente (hora para hoje, data para dias anteriores)</li>
          <li>✅ Ordenação por data da última mensagem (mais recente primeiro)</li>
          <li>✅ Fallback para remote_jid quando não há last_message</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Contatos */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <h2 className="text-lg font-semibold text-blue-900">
              Lista de Contatos - Teste
            </h2>
            <p className="text-sm text-blue-700">
              Verificando consistência e ordenação
            </p>
          </div>
          
          <div className="h-96">
            <ContactList
              contacts={testContacts}
              selectedContact={selectedContact}
              onSelectContact={handleSelectContact}
              onSearch={handleSearch}
              onSync={handleSync}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        </div>

        {/* Informações do Teste */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Informações do Teste
          </h2>
          
          <div className="space-y-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">✅ Correções Implementadas:</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Preview sempre visível</li>
                <li>• Timestamp inteligente</li>
                <li>• Ordenação correta</li>
                <li>• Fallback para remote_jid</li>
              </ul>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">📊 Dados de Teste:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• {testContacts.length} contatos</li>
                <li>• 4 com last_message</li>
                <li>• 11 sem last_message</li>
                <li>• Ordenação por data</li>
              </ul>
            </div>

            <div className="p-3 bg-yellow-50 rounded-lg">
              <h3 className="font-medium text-yellow-900 mb-2">⚠️ Verificar:</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Luiz Fiorim deve estar no topo</li>
                <li>• Contatos sem mensagem mostram remote_jid</li>
                <li>• Timestamps relativos corretos</li>
                <li>• Ordenação cronológica</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Contato Selecionado */}
      {selectedContact && (
        <div className="mt-8 bg-green-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-green-900 mb-2">
            Contato Selecionado
          </h2>
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-medium text-gray-900">{selectedContact.name}</h3>
            <p className="text-sm text-gray-600">{selectedContact.remote_jid}</p>
            <p className="text-sm text-gray-500">
              <strong>Última mensagem:</strong> {selectedContact.last_message ? selectedContact.last_message.content : 'Nenhuma mensagem'}
            </p>
            <p className="text-sm text-gray-500">
              <strong>Horário:</strong> {new Date(selectedContact.last_message_time).toLocaleString('pt-BR')}
            </p>
            <p className="text-sm text-gray-500">
              <strong>Timestamp relativo:</strong> {(() => {
                const now = new Date();
                const messageTime = new Date(selectedContact.last_message_time);
                const diffInHours = (now - messageTime) / (1000 * 60 * 60);
                
                if (diffInHours < 1) {
                  return messageTime.toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                } else if (diffInHours < 24) {
                  return messageTime.toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                } else if (diffInHours < 168) {
                  return messageTime.toLocaleDateString('pt-BR', { 
                    weekday: 'short' 
                  });
                } else {
                  return messageTime.toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit' 
                  });
                }
              })()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactListTest;
