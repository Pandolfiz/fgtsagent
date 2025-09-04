import React, { useState } from 'react';
import { FaCheck, FaTimes, FaArrowRight } from 'react-icons/fa';
import ContactList from './ContactList';

/**
 * Componente de demonstração para mostrar a correção da inconsistência
 * na exibição de informações das conversas
 */
const ContactListConsistencyDemo = () => {
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Dados de exemplo para demonstrar a consistência
  const demoContacts = [
    {
      id: 1,
      name: 'João Silva',
      push_name: 'João',
      remote_jid: '5511999999999@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min atrás
      last_message: {
        content: 'Olá! Como você está?',
        type: 'text'
      },
      unread_count: 3,
      is_online: true
    },
    {
      id: 2,
      name: 'Maria Santos',
      push_name: 'Maria',
      remote_jid: '5511888888888@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min atrás
      last_message: {
        content: 'Enviou uma imagem',
        type: 'image'
      },
      unread_count: 0,
      is_online: false
    },
    {
      id: 3,
      name: 'Pedro Costa',
      push_name: 'Pedro',
      remote_jid: '5511777777777@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2h atrás
      last_message: {
        content: 'Gravou um áudio',
        type: 'audio'
      },
      unread_count: 1,
      is_online: true
    },
    {
      id: 4,
      name: 'Ana Oliveira',
      push_name: 'Ana',
      remote_jid: '5511666666666@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 dia atrás
      last_message: {
        content: 'Documento.pdf',
        type: 'document'
      },
      unread_count: 0,
      is_online: false
    },
    {
      id: 5,
      name: 'Carlos Mendes',
      push_name: 'Carlos',
      remote_jid: '5511555555555@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 dias atrás
      last_message: {
        content: 'Vamos marcar um café?',
        type: 'text'
      },
      unread_count: 0,
      is_online: true
    },
    {
      id: 6,
      name: 'Fernanda Lima',
      push_name: 'Fernanda',
      remote_jid: '5511444444444@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 dias atrás
      last_message: {
        content: 'Vídeo da reunião',
        type: 'video'
      },
      unread_count: 2,
      is_online: false
    }
  ];

  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
  };

  const handleSearch = () => {
    console.log('Busca realizada:', searchQuery);
  };

  const handleSync = () => {
    console.log('Sincronização realizada');
  };

  const improvements = [
    {
      title: 'Timestamp Inteligente',
      description: 'Formato relativo baseado no tempo (hoje: hora, ontem: dia, etc.)',
      before: 'Sempre mostrava apenas data (ex: "15 dez")',
      after: 'Mostra hora para mensagens do dia, dia da semana para mensagens recentes'
    },
    {
      title: 'Preview da Última Mensagem',
      description: 'Mostra o conteúdo da última mensagem com ícones de tipo',
      before: 'Não mostrava preview da mensagem',
      after: 'Mostra texto da mensagem ou ícone do tipo (📷 Imagem, 🎵 Áudio, etc.)'
    },
    {
      title: 'Consistência Visual',
      description: 'Todas as conversas seguem o mesmo padrão de exibição',
      before: 'Algumas mostravam número, outras horário, sem padrão',
      after: 'Todas mostram preview + timestamp de forma consistente'
    },
    {
      title: 'Hierarquia Visual',
      description: 'Destaque para conversas não lidas',
      before: 'Sem diferenciação visual para não lidas',
      after: 'Nome em negrito e timestamp em azul para não lidas'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Correção: Consistência na Lista de Conversas
        </h1>
        <p className="text-gray-600 mb-6">
          Problema identificado e corrigido: inconsistência na exibição de informações das conversas
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lista de Contatos Corrigida */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-green-50">
            <h2 className="text-lg font-semibold text-green-900">
              Lista Corrigida - Padrão Consistente
            </h2>
            <p className="text-sm text-green-700">
              Todas as conversas agora seguem o mesmo padrão: preview da mensagem + timestamp inteligente
            </p>
          </div>
          
          <div className="h-96">
            <ContactList
              contacts={demoContacts}
              selectedContact={selectedContact}
              onSelectContact={handleSelectContact}
              onSearch={handleSearch}
              onSync={handleSync}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        </div>

        {/* Melhorias Implementadas */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Melhorias Implementadas
          </h2>
          
          <div className="space-y-4">
            {improvements.map((improvement, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">{improvement.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{improvement.description}</p>
                
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-start gap-2">
                    <FaTimes className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-red-600 font-medium">Antes:</span>
                      <p className="text-xs text-gray-600">{improvement.before}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <FaCheck className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-green-600 font-medium">Depois:</span>
                      <p className="text-xs text-gray-600">{improvement.after}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Explicação do Problema */}
      <div className="mt-8 bg-red-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-red-900 mb-4">
          Problema Identificado
        </h2>
        
        <div className="bg-white p-4 rounded-lg mb-4">
          <h3 className="font-medium text-gray-900 mb-2">❌ Inconsistência Anterior:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Algumas conversas mostravam apenas o número de mensagens não lidas</li>
            <li>• Outras mostravam apenas a data (ex: "15 dez")</li>
            <li>• Não havia preview da última mensagem</li>
            <li>• Timestamp não era inteligente (sempre data, nunca hora)</li>
            <li>• Sem padrão visual consistente entre as conversas</li>
          </ul>
        </div>

        <div className="bg-white p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">✅ Solução Implementada:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• <strong>Timestamp inteligente:</strong> Hora para mensagens do dia, dia da semana para recentes</li>
            <li>• <strong>Preview da mensagem:</strong> Conteúdo da última mensagem com ícones de tipo</li>
            <li>• <strong>Padrão consistente:</strong> Todas as conversas seguem o mesmo layout</li>
            <li>• <strong>Hierarquia visual:</strong> Destaque para conversas não lidas</li>
            <li>• <strong>Informações completas:</strong> Nome, preview, timestamp e contador</li>
          </ul>
        </div>
      </div>

      {/* Benefícios */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">
          Benefícios da Correção
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">🎯 Consistência</h3>
            <p className="text-sm text-gray-600">
              Todas as conversas seguem o mesmo padrão visual e informacional
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">📱 Contexto</h3>
            <p className="text-sm text-gray-600">
              Usuário sempre vê o conteúdo da última mensagem e quando foi enviada
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">⏰ Timestamp Inteligente</h3>
            <p className="text-sm text-gray-600">
              Formato relativo que faz sentido (hora hoje, dia da semana ontem)
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">👁️ Hierarquia Visual</h3>
            <p className="text-sm text-gray-600">
              Conversas não lidas se destacam com cores e tipografia diferenciadas
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">🔍 Informações Ricas</h3>
            <p className="text-sm text-gray-600">
              Preview com ícones de tipo de mensagem (imagem, áudio, vídeo, etc.)
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">✨ UX Melhorada</h3>
            <p className="text-sm text-gray-600">
              Experiência mais intuitiva e alinhada com aplicativos populares
            </p>
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
            {selectedContact.last_message && (
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  <strong>Última mensagem:</strong> {selectedContact.last_message.content}
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Tipo:</strong> {selectedContact.last_message.type}
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Horário:</strong> {new Date(selectedContact.last_message_time).toLocaleString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactListConsistencyDemo;
