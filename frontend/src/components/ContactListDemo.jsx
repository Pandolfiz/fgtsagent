import React, { useState } from 'react';
import { FaArrowRight, FaCheck, FaTimes } from 'react-icons/fa';
import ContactList from './ContactList';
import ContactListOptimized from './ContactListOptimized';

/**
 * Componente de demonstração comparando a lista de contatos atual vs otimizada
 */
const ContactListDemo = () => {
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOptimized, setShowOptimized] = useState(false);

  // Dados de exemplo para demonstração
  const demoContacts = [
    {
      id: 1,
      name: 'João Silva',
      push_name: 'João',
      remote_jid: '5511999999999@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min atrás
      last_message: {
        content: 'Olá! Como você está?',
        type: 'text',
        status: 'read'
      },
      unread_count: 3,
      is_online: true,
      is_important: false,
      is_archived: false
    },
    {
      id: 2,
      name: 'Maria Santos',
      push_name: 'Maria',
      remote_jid: '5511888888888@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min atrás
      last_message: {
        content: 'Enviou uma imagem',
        type: 'image',
        status: 'delivered'
      },
      unread_count: 0,
      is_online: false,
      is_important: true,
      is_archived: false
    },
    {
      id: 3,
      name: 'Pedro Costa',
      push_name: 'Pedro',
      remote_jid: '5511777777777@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2h atrás
      last_message: {
        content: 'Gravou um áudio',
        type: 'audio',
        status: 'delivered'
      },
      unread_count: 1,
      is_online: true,
      is_important: false,
      is_archived: false
    },
    {
      id: 4,
      name: 'Ana Oliveira',
      push_name: 'Ana',
      remote_jid: '5511666666666@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 dia atrás
      last_message: {
        content: 'Documento.pdf',
        type: 'document',
        status: 'read'
      },
      unread_count: 0,
      is_online: false,
      is_important: false,
      is_archived: true
    },
    {
      id: 5,
      name: 'Carlos Mendes',
      push_name: 'Carlos',
      remote_jid: '5511555555555@s.whatsapp.net',
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 dias atrás
      last_message: {
        content: 'Vamos marcar um café?',
        type: 'text',
        status: 'read'
      },
      unread_count: 0,
      is_online: true,
      is_important: false,
      is_archived: false
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

  const handleArchive = (contact) => {
    console.log('Arquivar contato:', contact.name);
  };

  const handleMute = (contact) => {
    console.log('Silenciar contato:', contact.name);
  };

  const handleMarkImportant = (contact) => {
    console.log('Marcar como importante:', contact.name);
  };

  const features = [
    {
      title: 'Preview da Última Mensagem',
      current: false,
      optimized: true,
      description: 'Mostra o conteúdo da última mensagem com ícones de tipo'
    },
    {
      title: 'Timestamp Inteligente',
      current: false,
      optimized: true,
      description: 'Formato relativo (hoje: hora, ontem: dia, etc.)'
    },
    {
      title: 'Status de Entrega',
      current: false,
      optimized: true,
      description: 'Indicadores visuais de mensagem entregue/lida'
    },
    {
      title: 'Indicadores de Status',
      current: true,
      optimized: true,
      description: 'Online/offline, mensagens não lidas'
    },
    {
      title: 'Menu Contextual',
      current: false,
      optimized: true,
      description: 'Ações como arquivar, silenciar, destacar'
    },
    {
      title: 'Filtros Avançados',
      current: false,
      optimized: true,
      description: 'Filtrar por não lidas, importantes, arquivadas'
    },
    {
      title: 'Ordenação Múltipla',
      current: false,
      optimized: true,
      description: 'Ordenar por data, nome, não lidas'
    },
    {
      title: 'Hierarquia Visual',
      current: false,
      optimized: true,
      description: 'Destaque para conversas não lidas e importantes'
    },
    {
      title: 'Navegação por Teclado',
      current: false,
      optimized: true,
      description: 'Suporte completo a atalhos de teclado'
    },
    {
      title: 'Busca Inteligente',
      current: true,
      optimized: true,
      description: 'Busca por nome, número e conteúdo de mensagens'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Demonstração: Lista de Contatos Otimizada
        </h1>
        <p className="text-gray-600 mb-6">
          Compare a lista de contatos atual com a versão otimizada para melhor UX
        </p>
        
        {/* Toggle para alternar entre versões */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setShowOptimized(false)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              !showOptimized 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Versão Atual
          </button>
          <button
            onClick={() => setShowOptimized(true)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              showOptimized 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Versão Otimizada
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lista de Contatos */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">
              {showOptimized ? 'Lista Otimizada' : 'Lista Atual'}
            </h2>
            <p className="text-sm text-gray-600">
              {showOptimized 
                ? 'Versão com melhorias de UX implementadas' 
                : 'Versão atual do componente'
              }
            </p>
          </div>
          
          <div className="h-96">
            {showOptimized ? (
              <ContactListOptimized
                contacts={demoContacts}
                selectedContact={selectedContact}
                onSelectContact={handleSelectContact}
                onSearch={handleSearch}
                onSync={handleSync}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onArchive={handleArchive}
                onMute={handleMute}
                onMarkImportant={handleMarkImportant}
              />
            ) : (
              <ContactList
                contacts={demoContacts}
                selectedContact={selectedContact}
                onSelectContact={handleSelectContact}
                onSearch={handleSearch}
                onSync={handleSync}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            )}
          </div>
        </div>

        {/* Comparação de Funcionalidades */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Comparação de Funcionalidades
          </h2>
          
          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Versão Atual */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Atual:</span>
                    {feature.current ? (
                      <FaCheck className="w-4 h-4 text-green-500" />
                    ) : (
                      <FaTimes className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  
                  {/* Versão Otimizada */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Otimizada:</span>
                    {feature.optimized ? (
                      <FaCheck className="w-4 h-4 text-green-500" />
                    ) : (
                      <FaTimes className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefícios das Melhorias */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">
          Benefícios das Melhorias
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">📱 Informações Ricas</h3>
            <p className="text-sm text-gray-600">
              Preview da última mensagem, timestamps inteligentes e status de entrega
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">🎨 Hierarquia Visual</h3>
            <p className="text-sm text-gray-600">
              Destaque para conversas não lidas e importantes com cores e indicadores
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">⚡ Interações Avançadas</h3>
            <p className="text-sm text-gray-600">
              Menu contextual, filtros múltiplos e navegação por teclado
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">🔍 Busca Inteligente</h3>
            <p className="text-sm text-gray-600">
              Busca por nome, número e conteúdo das mensagens
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">♿ Acessibilidade</h3>
            <p className="text-sm text-gray-600">
              Navegação por teclado e suporte a screen readers
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">📊 Performance</h3>
            <p className="text-sm text-gray-600">
              Memoização otimizada e renderização eficiente
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
              <p className="text-sm text-gray-500 mt-2">
                Última mensagem: {selectedContact.last_message.content}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactListDemo;
