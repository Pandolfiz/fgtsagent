import React, { useState, useCallback, useMemo } from 'react';
import { FaFilter, FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import AdvancedFilters from './AdvancedFilters';
import { useAdvancedFilters } from '../hooks/useAdvancedFilters';
import LazyChat from './LazyChat';

/**
 * Componente que integra o chat otimizado com filtros avançados
 */
const ChatWithFilters = ({ 
  messages = [], 
  contacts = [], 
  availableUsers = [],
  onFiltersChange,
  className = ''
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('messages'); // 'messages' ou 'contacts'

  // Hook para filtros de mensagens
  const messageFilters = useAdvancedFilters(messages, {
    searchFields: ['content', 'sender_name'],
    dateField: 'created_at',
    userField: 'sender_id',
    messageTypeField: 'type',
    mediaField: 'has_media',
    readField: 'is_read'
  });

  // Hook para filtros de contatos
  const contactFilters = useAdvancedFilters(contacts, {
    searchFields: ['name', 'phone', 'email'],
    dateField: 'last_message_at',
    userField: 'user_id',
    messageTypeField: 'last_message_type',
    mediaField: 'has_media',
    readField: 'is_read'
  });

  // Filtros ativos baseado no tipo selecionado
  const activeFilters = filterType === 'messages' ? messageFilters : contactFilters;
  const filteredData = filterType === 'messages' ? messageFilters.filteredData : contactFilters.filteredData;

  // Estatísticas dos filtros
  const filterStats = activeFilters.getFilterStats();

  // Opções para os filtros
  const filterOptions = useMemo(() => {
    const options = activeFilters.getFilterOptions();
    return {
      ...options,
      availableUsers: availableUsers.length > 0 ? availableUsers : options.users
    };
  }, [activeFilters, availableUsers]);

  // Callback para mudanças nos filtros
  const handleFiltersChange = useCallback((newFilters) => {
    if (filterType === 'messages') {
      messageFilters.updateFilters(newFilters);
    } else {
      contactFilters.updateFilters(newFilters);
    }
    
    if (onFiltersChange) {
      onFiltersChange({
        type: filterType,
        filters: newFilters,
        filteredData,
        stats: filterStats
      });
    }
  }, [filterType, messageFilters, contactFilters, onFiltersChange, filteredData, filterStats]);

  // Limpar todos os filtros
  const clearAllFilters = useCallback(() => {
    if (filterType === 'messages') {
      messageFilters.clearFilters();
    } else {
      contactFilters.clearFilters();
    }
  }, [filterType, messageFilters, contactFilters]);

  // Alternar tipo de filtro
  const toggleFilterType = useCallback(() => {
    setFilterType(prev => prev === 'messages' ? 'contacts' : 'messages');
  }, []);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header com controles de filtro */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Chat Otimizado
            </h2>
            
            {/* Seletor de tipo de filtro */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Filtrar:</span>
              <button
                onClick={toggleFilterType}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm transition-colors"
              >
                <span className="capitalize">{filterType === 'messages' ? 'Mensagens' : 'Contatos'}</span>
                {showFilters ? <FaChevronUp className="w-3 h-3" /> : <FaChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Estatísticas dos filtros */}
            {filterStats.hasFilters && (
              <div className="text-sm text-gray-600">
                {filterStats.filtered} de {filterStats.total} ({filterStats.percentage}%)
              </div>
            )}

            {/* Botão de filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                showFilters || filterStats.hasFilters
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FaFilter className="w-4 h-4" />
              <span>Filtros</span>
              {filterStats.hasFilters && (
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {activeFilters.activeFiltersCount}
                </span>
              )}
            </button>

            {/* Botão para limpar filtros */}
            {filterStats.hasFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                <FaTimes className="w-3 h-3" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Painel de filtros */}
      {showFilters && (
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <AdvancedFilters
            onFiltersChange={handleFiltersChange}
            initialFilters={activeFilters.filters}
            availableUsers={filterOptions.availableUsers}
            messageTypes={filterOptions.messageTypes}
            className="max-w-4xl mx-auto"
          />
        </div>
      )}

      {/* Área principal do chat */}
      <div className="flex-1 overflow-hidden">
        <LazyChat
          messages={filterType === 'messages' ? filteredData : messages}
          contacts={filterType === 'contacts' ? filteredData : contacts}
          filterStats={filterStats}
          showFilterIndicator={filterStats.hasFilters}
        />
      </div>

      {/* Indicador de filtros ativos (floating) */}
      {filterStats.hasFilters && !showFilters && (
        <div className="absolute bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <FaFilter className="w-4 h-4" />
          <span className="text-sm">
            {filterStats.filtered} de {filterStats.total} {filterType === 'messages' ? 'mensagens' : 'contatos'}
          </span>
          <button
            onClick={() => setShowFilters(true)}
            className="ml-2 hover:bg-blue-700 rounded p-1"
          >
            <FaChevronUp className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatWithFilters;
