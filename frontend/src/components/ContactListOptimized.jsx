import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { 
  FaSearch, 
  FaSync, 
  FaUser, 
  FaCircle, 
  FaCheck, 
  FaCheckDouble, 
  FaStar, 
  FaArchive, 
  FaVolumeMute, 
  FaEllipsisV,
  FaImage,
  FaFile,
  FaMicrophone,
  FaVideo,
  FaPaperclip
} from 'react-icons/fa';

/**
 * Componente otimizado para item de contato individual com UX aprimorada
 */
const ContactItemOptimized = React.memo(({ 
  contact, 
  isSelected, 
  onSelect, 
  onArchive,
  onMute,
  onMarkImportant,
  unreadCount = 0 
}) => {
  const [showContextMenu, setShowContextMenu] = useState(false);

  // Função para renderizar o avatar do contato
  const renderAvatar = () => {
    const initials = contact.name 
      ? contact.name.charAt(0).toUpperCase()
      : contact.push_name 
        ? contact.push_name.charAt(0).toUpperCase() 
        : '?';
    
    return (
      <div className={`w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm relative ${
        contact.is_online ? 'ring-2 ring-green-400' : ''
      }`}>
        {initials}
        {contact.is_online && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
        )}
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
    if (!contact.last_message) return null;
    
    const { type, content, status } = contact.last_message;
    
    return (
      <div className="flex items-center gap-1 text-sm text-gray-600 truncate">
        {/* Ícone do tipo de mensagem */}
        {type === 'image' && <FaImage className="w-3 h-3 text-gray-400 flex-shrink-0" />}
        {type === 'audio' && <FaMicrophone className="w-3 h-3 text-gray-400 flex-shrink-0" />}
        {type === 'video' && <FaVideo className="w-3 h-3 text-gray-400 flex-shrink-0" />}
        {type === 'document' && <FaFile className="w-3 h-3 text-gray-400 flex-shrink-0" />}
        {type === 'attachment' && <FaPaperclip className="w-3 h-3 text-gray-400 flex-shrink-0" />}
        
        {/* Conteúdo da mensagem */}
        <span className="truncate">
          {type === 'text' ? content : 
           type === 'image' ? 'Imagem' :
           type === 'audio' ? 'Áudio' :
           type === 'video' ? 'Vídeo' :
           type === 'document' ? 'Documento' :
           type === 'attachment' ? 'Anexo' : content}
        </span>
        
        {/* Status de entrega */}
        {status === 'delivered' && <FaCheckDouble className="w-3 h-3 text-blue-500 flex-shrink-0" />}
        {status === 'read' && <FaCheckDouble className="w-3 h-3 text-green-500 flex-shrink-0" />}
      </div>
    );
  };

  // Função para renderizar informações do contato
  const renderContactInfo = () => {
    return (
      <div className="flex flex-col min-w-0 flex-1 gap-1">
        {/* Nome do contato */}
        <div className="flex items-center gap-2">
          <h4 className={`font-semibold truncate ${
            unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
          }`}>
            {contact.name || contact.push_name || 'Contato'}
          </h4>
          {contact.is_important && (
            <FaStar className="w-3 h-3 text-yellow-500 flex-shrink-0" />
          )}
        </div>
        
        {/* Preview da última mensagem */}
        {renderLastMessage()}
      </div>
    );
  };

  // Função para renderizar informações adicionais
  const renderAdditionalInfo = () => {
    return (
      <div className="flex flex-col items-end gap-1">
        {/* Timestamp */}
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
        
        {/* Status online/offline */}
        <div className="flex items-center gap-1">
          <FaCircle className={`w-2 h-2 ${
            contact.is_online ? 'text-green-500' : 'text-gray-400'
          }`} />
        </div>
      </div>
    );
  };

  // Função para renderizar menu contextual
  const renderContextMenu = () => {
    if (!showContextMenu) return null;

    return (
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
        <button
          onClick={() => onMarkImportant(contact)}
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
        >
          <FaStar className="w-3 h-3" />
          {contact.is_important ? 'Remover destaque' : 'Destacar'}
        </button>
        <button
          onClick={() => onMute(contact)}
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
        >
          <FaVolumeMute className="w-3 h-3" />
          Silenciar
        </button>
        <button
          onClick={() => onArchive(contact)}
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
        >
          <FaArchive className="w-3 h-3" />
          Arquivar
        </button>
      </div>
    );
  };

  // Handler para clique no item
  const handleClick = () => {
    onSelect(contact);
    setShowContextMenu(false);
  };

  // Handler para clique no botão de menu
  const handleMenuClick = (e) => {
    e.stopPropagation();
    setShowContextMenu(!showContextMenu);
  };

  // Handler para teclado
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleClick();
        break;
      case 'Escape':
        setShowContextMenu(false);
        break;
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={`
        relative flex items-center gap-3 p-3 cursor-pointer transition-all duration-200
        hover:bg-gray-50 active:bg-gray-100 group
        ${isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''}
        ${unreadCount > 0 ? 'bg-blue-25 border-l-4 border-l-blue-500' : ''}
        ${contact.is_important ? 'bg-yellow-25' : ''}
        ${contact.is_archived ? 'bg-gray-50 opacity-75' : ''}
      `}
    >
      {/* Avatar */}
      {renderAvatar()}
      
      {/* Informações do contato */}
      {renderContactInfo()}
      
      {/* Informações adicionais */}
      {renderAdditionalInfo()}
      
      {/* Botão de menu contextual */}
      <button
        onClick={handleMenuClick}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200"
        title="Mais opções"
      >
        <FaEllipsisV className="w-3 h-3 text-gray-500" />
      </button>
      
      {/* Menu contextual */}
      {renderContextMenu()}
    </div>
  );
}, (prevProps, nextProps) => {
  // Função de comparação personalizada para evitar re-renders desnecessários
  return (
    prevProps.contact.id === nextProps.contact.id &&
    prevProps.contact.name === nextProps.contact.name &&
    prevProps.contact.push_name === nextProps.contact.push_name &&
    prevProps.contact.last_message_time === nextProps.contact.last_message_time &&
    prevProps.contact.last_message === nextProps.contact.last_message &&
    prevProps.contact.is_online === nextProps.contact.is_online &&
    prevProps.contact.is_important === nextProps.contact.is_important &&
    prevProps.contact.is_archived === nextProps.contact.is_archived &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.unreadCount === nextProps.unreadCount
  );
});

/**
 * Componente principal da lista de contatos otimizada
 */
const ContactListOptimized = React.memo(({ 
  contacts = [], 
  selectedContact, 
  onSelectContact, 
  onSearch, 
  onSync, 
  isLoading = false,
  searchQuery = '',
  onSearchChange,
  onArchive,
  onMute,
  onMarkImportant
}) => {
  const [filter, setFilter] = useState('all'); // all, unread, important, archived
  const [sortBy, setSortBy] = useState('last_message'); // last_message, name, unread_count

  // Memoizar contatos filtrados, ordenados e agrupados
  const processedContacts = useMemo(() => {
    let filtered = contacts;
    
    // Aplicar filtro de busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = contacts.filter(contact => 
        (contact.name && contact.name.toLowerCase().includes(query)) ||
        (contact.push_name && contact.push_name.toLowerCase().includes(query)) ||
        (contact.remote_jid && contact.remote_jid.includes(query)) ||
        (contact.last_message?.content && contact.last_message.content.toLowerCase().includes(query))
      );
    }
    
    // Aplicar filtro de status
    switch (filter) {
      case 'unread':
        filtered = filtered.filter(contact => contact.unread_count > 0);
        break;
      case 'important':
        filtered = filtered.filter(contact => contact.is_important);
        break;
      case 'archived':
        filtered = filtered.filter(contact => contact.is_archived);
        break;
      default:
        filtered = filtered.filter(contact => !contact.is_archived);
    }
    
    // Aplicar ordenação
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || a.push_name || '').localeCompare(b.name || b.push_name || '');
        case 'unread_count':
          return (b.unread_count || 0) - (a.unread_count || 0);
        default: // last_message
          const dateA = new Date(a.last_message_time || a.updated_at || 0);
          const dateB = new Date(b.last_message_time || b.updated_at || 0);
          return dateB - dateA; // Mais recente primeiro
      }
    });
  }, [contacts, searchQuery, filter, sortBy]);

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

  // Função para arquivar contato
  const handleArchive = useCallback((contact) => {
    if (onArchive) {
      onArchive(contact);
    }
  }, [onArchive]);

  // Função para silenciar contato
  const handleMute = useCallback((contact) => {
    if (onMute) {
      onMute(contact);
    }
  }, [onMute]);

  // Função para marcar como importante
  const handleMarkImportant = useCallback((contact) => {
    if (onMarkImportant) {
      onMarkImportant(contact);
    }
  }, [onMarkImportant]);

  // Renderizar filtros
  const renderFilters = () => {
    return (
      <div className="flex gap-2 p-2 bg-gray-50 border-b border-gray-200">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
        >
          <option value="all">Todas</option>
          <option value="unread">Não lidas</option>
          <option value="important">Importantes</option>
          <option value="archived">Arquivadas</option>
        </select>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
        >
          <option value="last_message">Última mensagem</option>
          <option value="name">Nome</option>
          <option value="unread_count">Não lidas</option>
        </select>
      </div>
    );
  };

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
            placeholder="Buscar contatos ou mensagens..."
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
      
      {/* Filtros */}
      {renderFilters()}
      
      {/* Lista de contatos */}
      <div className="flex-1 overflow-y-auto">
        {processedContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <FaSearch className="w-8 h-8 mb-2 opacity-50" />
            <p>Nenhum contato encontrado</p>
            {searchQuery && <p className="text-sm">para "{searchQuery}"</p>}
          </div>
        ) : (
          processedContacts.map(contact => (
            <ContactItemOptimized
              key={contact.id || contact.remote_jid}
              contact={contact}
              isSelected={selectedContact?.id === contact.id || selectedContact?.remote_jid === contact.remote_jid}
              onSelect={handleContactSelect}
              onArchive={handleArchive}
              onMute={handleMute}
              onMarkImportant={handleMarkImportant}
              unreadCount={contact.unread_count || 0}
            />
          ))
        )}
      </div>
      
      {/* Contador de contatos */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 text-center text-sm text-gray-500">
        {processedContacts.length} contato{processedContacts.length !== 1 ? 's' : ''}
        {searchQuery && ` encontrado${processedContacts.length !== 1 ? 's' : ''} para "${searchQuery}"`}
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
ContactListOptimized.displayName = 'ContactListOptimized';
ContactItemOptimized.displayName = 'ContactItemOptimized';

export default ContactListOptimized;
