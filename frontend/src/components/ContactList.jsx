import React, { useMemo, useCallback } from 'react';
import { FaSearch, FaSync, FaUser, FaCircle } from 'react-icons/fa';

// Componente otimizado para item de contato individual
const ContactItem = React.memo(({ 
  contact, 
  isSelected, 
  onSelect, 
  unreadCount = 0 
}) => {
  // Função para renderizar o avatar do contato
  const renderAvatar = () => {
    const initials = contact.name 
      ? contact.name.charAt(0).toUpperCase()
      : contact.push_name 
        ? contact.push_name.charAt(0).toUpperCase() 
        : '?';
    
    return (
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
        {initials}
      </div>
    );
  };

  // Função para renderizar o nome do contato
  const renderName = () => {
    return (
      <div className="flex flex-col min-w-0 flex-1 gap-1">
        <h4 className={`font-semibold truncate ${
          unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
        }`}>
          {contact.name || contact.push_name || 'Contato'}
        </h4>
        
        {/* Preview da última mensagem */}
        {renderLastMessage()}
      </div>
    );
  };

  // Função para formatar timestamp de forma inteligente
  const formatTimestamp = useCallback((timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const messageTime = new Date(timestamp);
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
    } else if (diffInHours < 168) { // 7 dias
      return messageTime.toLocaleDateString('pt-BR', { 
        weekday: 'short' 
      });
    } else {
      return messageTime.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  }, []);

  // Função para renderizar preview da última mensagem
  const renderLastMessage = () => {
    // Se não há last_message, mostrar o remote_jid como fallback
    if (!contact.last_message) {
      return (
        <div className="text-sm text-gray-500 truncate">
          {contact.remote_jid || 'Sem mensagens'}
        </div>
      );
    }
    
    const { type, content } = contact.last_message;
    
    return (
      <div className="text-sm text-gray-600 truncate">
        {type === 'text' ? content : 
         type === 'image' ? '📷 Imagem' :
         type === 'audio' ? '🎵 Áudio' :
         type === 'video' ? '🎥 Vídeo' :
         type === 'document' ? '📄 Documento' :
         type === 'attachment' ? '📎 Anexo' : content}
      </div>
    );
  };

  // Função para renderizar informações adicionais
  const renderInfo = () => {
    return (
      <div className="flex flex-col items-end gap-1">
        {/* Timestamp da última mensagem */}
        {contact.last_message_time && (
          <span className={`text-xs ${
            unreadCount > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'
          }`}>
            {formatTimestamp(contact.last_message_time)}
          </span>
        )}
        
        {/* Contador de mensagens não lidas */}
        {unreadCount > 0 && (
          <div className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[1.25rem] h-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
        
        {/* Indicador de status */}
        <div className="flex items-center gap-1">
          <FaCircle className={`w-2 h-2 ${
            contact.is_online ? 'text-green-500' : 'text-gray-400'
          }`} />
        </div>
      </div>
    );
  };

  return (
    <div
      onClick={() => onSelect(contact)}
      className={`
        flex items-center gap-3 p-3 cursor-pointer transition-all duration-200
        hover:bg-gray-50 active:bg-gray-100
        ${isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''}
      `}
    >
      {/* Avatar */}
      {renderAvatar()}
      
      {/* Informações do contato */}
      {renderName()}
      
      {/* Informações adicionais */}
      {renderInfo()}
    </div>
  );
}, (prevProps, nextProps) => {
  // Função de comparação personalizada para evitar re-renders desnecessários
  return (
    prevProps.contact.id === nextProps.contact.id &&
    prevProps.contact.name === nextProps.contact.name &&
    prevProps.contact.push_name === nextProps.contact.push_name &&
    prevProps.contact.last_message_time === nextProps.contact.last_message_time &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.unreadCount === nextProps.unreadCount
  );
});

// Componente principal da lista de contatos
const ContactList = React.memo(({ 
  contacts = [], 
  selectedContact, 
  onSelectContact, 
  onSearch, 
  onSync, 
  isLoading = false,
  searchQuery = '',
  onSearchChange
}) => {
  // Memoizar contatos filtrados e ordenados para evitar recálculos desnecessários
  const filteredContacts = useMemo(() => {
    let filtered = contacts;
    
    // Aplicar filtro de busca se houver query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = contacts.filter(contact => 
        (contact.name && contact.name.toLowerCase().includes(query)) ||
        (contact.push_name && contact.push_name.toLowerCase().includes(query)) ||
        (contact.remote_jid && contact.remote_jid.includes(query))
      );
    }
    
    // Ordenar por data da última mensagem (mais recente primeiro)
    return filtered.sort((a, b) => {
      // Usar last_message_time, updated_at ou created_at como fallback
      const dateA = new Date(a.last_message_time || a.updated_at || a.created_at || 0);
      const dateB = new Date(b.last_message_time || b.updated_at || b.created_at || 0);
      
      // Se as datas são iguais, ordenar por nome
      if (dateA.getTime() === dateB.getTime()) {
        const nameA = (a.name || a.push_name || a.remote_jid || '').toLowerCase();
        const nameB = (b.name || b.push_name || b.remote_jid || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      
      return dateB - dateA; // Mais recente primeiro
    });
  }, [contacts, searchQuery]);

  // Função otimizada para seleção de contato
  const handleContactSelect = useCallback((contact) => {
    onSelectContact(contact);
  }, [onSelectContact]);

  // Função otimizada para mudança na busca
  const handleSearchChange = useCallback((e) => {
    onSearchChange(e.target.value);
  }, [onSearchChange]);

  // Função otimizada para sincronização
  const handleSync = useCallback(() => {
    onSync();
  }, [onSync]);

  // Renderizar lista vazia
  if (contacts.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <FaUser className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhum contato encontrado</p>
        <p className="text-sm">Sincronize seus contatos para começar</p>
      </div>
    );
  }

  // Renderizar loading
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-500">Carregando contatos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho com busca e sincronização */}
      <div className="p-4 border-b border-gray-200 bg-white">
        {/* Barra de busca */}
        <div className="relative mb-3">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar contatos..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* Botão de sincronização */}
        <button
          onClick={handleSync}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <FaSync className="w-4 h-4" />
          Sincronizar Contatos
        </button>
      </div>
      
      {/* Lista de contatos */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <FaSearch className="w-8 h-8 mb-2 opacity-50" />
            <p>Nenhum contato encontrado para "{searchQuery}"</p>
          </div>
        ) : (
          filteredContacts.map(contact => (
            <ContactItem
              key={contact.id || contact.remote_jid}
              contact={contact}
              isSelected={selectedContact?.id === contact.id || selectedContact?.remote_jid === contact.remote_jid}
              onSelect={handleContactSelect}
              unreadCount={contact.unread_count || 0}
            />
          ))
        )}
      </div>
      
      {/* Contador de contatos */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 text-center text-sm text-gray-500">
        {filteredContacts.length} contato{filteredContacts.length !== 1 ? 's' : ''}
        {searchQuery && ` encontrado${filteredContacts.length !== 1 ? 's' : ''} para "${searchQuery}"`}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Função de comparação personalizada para evitar re-renders desnecessários
  return (
    prevProps.contacts.length === nextProps.contacts.length &&
    prevProps.selectedContact?.id === nextProps.selectedContact?.id &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.searchQuery === nextProps.searchQuery
  );
});

// Adicionar displayName para debugging
ContactList.displayName = 'ContactList';
ContactItem.displayName = 'ContactItem';

export default ContactList;
