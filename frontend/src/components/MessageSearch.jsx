import React, { memo, useState, useCallback, useMemo } from 'react';
import { FaSearch, FaTimes, FaChevronUp, FaChevronDown, FaFilter, FaCalendar, FaUser, FaImage, FaHeart } from 'react-icons/fa';
import { useMessageSearch } from '../hooks/useMessageSearch';

/**
 * Componente de busca avançada de mensagens
 */
const MessageSearch = memo(({
  messages = [],
  onResultClick,
  onResultNavigate,
  className = '',
  placeholder = "Buscar mensagens...",
  showFilters = true,
  showNavigation = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Hook de busca
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    currentResult,
    currentResultIndex,
    isSearching,
    searchFilters,
    searchStats,
    searchWithDebounce,
    navigateResults,
    goToResult,
    clearSearch,
    updateFilters
  } = useMessageSearch(messages, {
    enabled: true,
    caseSensitive: false,
    wholeWord: false,
    regex: false,
    maxResults: 100,
    debounceMs: 300
  });

  // Função para lidar com mudança na busca
  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchWithDebounce(query);
  }, [setSearchQuery, searchWithDebounce]);

  // Função para lidar com clique no resultado
  const handleResultClick = useCallback((result, index) => {
    goToResult(index);
    if (onResultClick) {
      onResultClick(result, index);
    }
  }, [goToResult, onResultClick]);

  // Função para lidar com navegação
  const handleNavigate = useCallback((direction) => {
    navigateResults(direction);
    if (onResultNavigate) {
      onResultNavigate(currentResult, currentResultIndex, direction);
    }
  }, [navigateResults, onResultNavigate, currentResult, currentResultIndex]);

  // Função para alternar filtros avançados
  const toggleAdvancedFilters = useCallback(() => {
    setShowAdvancedFilters(!showAdvancedFilters);
  }, [showAdvancedFilters]);

  // Função para atualizar filtro
  const handleFilterChange = useCallback((filterName, value) => {
    updateFilters({ [filterName]: value });
  }, [updateFilters]);

  // Renderizar controles de navegação
  const renderNavigationControls = () => {
    if (!showNavigation || !searchStats.hasResults) return null;

    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleNavigate('prev')}
          disabled={currentResultIndex <= 0}
          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          title="Resultado anterior"
        >
          <FaChevronUp className="w-3 h-3" />
        </button>
        
        <span className="text-xs text-gray-500">
          {searchStats.currentIndex} de {searchStats.totalResults}
        </span>
        
        <button
          onClick={() => handleNavigate('next')}
          disabled={currentResultIndex >= searchStats.totalResults - 1}
          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          title="Próximo resultado"
        >
          <FaChevronDown className="w-3 h-3" />
        </button>
      </div>
    );
  };

  // Renderizar filtros avançados
  const renderAdvancedFilters = () => {
    if (!showAdvancedFilters) return null;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Filtro por data */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaCalendar className="inline w-4 h-4 mr-1" />
              Período
            </label>
            <div className="space-y-2">
              <input
                type="date"
                value={searchFilters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value ? new Date(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Data inicial"
              />
              <input
                type="date"
                value={searchFilters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value ? new Date(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Data final"
              />
            </div>
          </div>

          {/* Filtro por tipo de mensagem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaImage className="inline w-4 h-4 mr-1" />
              Tipo de mensagem
            </label>
            <select
              value={searchFilters.messageType}
              onChange={(e) => handleFilterChange('messageType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Todas</option>
              <option value="text">Apenas texto</option>
              <option value="media">Apenas mídia</option>
            </select>
          </div>

          {/* Filtro por remetente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaUser className="inline w-4 h-4 mr-1" />
              Remetente
            </label>
            <select
              value={searchFilters.sender}
              onChange={(e) => handleFilterChange('sender', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Todos</option>
              <option value="me">Apenas eu</option>
              <option value="others">Outros</option>
            </select>
          </div>

          {/* Filtros especiais */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaHeart className="inline w-4 h-4 mr-1" />
              Especiais
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={searchFilters.hasReactions}
                  onChange={(e) => handleFilterChange('hasReactions', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Com reações</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={searchFilters.hasMedia}
                  onChange={(e) => handleFilterChange('hasMedia', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Com mídia</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar resultados da busca
  const renderSearchResults = () => {
    if (!searchQuery.trim()) return null;

    if (isSearching) {
      return (
        <div className="mt-2 p-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Buscando...</p>
        </div>
      );
    }

    if (searchResults.length === 0) {
      return (
        <div className="mt-2 p-4 text-center text-gray-500">
          <p className="text-sm">Nenhum resultado encontrado</p>
        </div>
      );
    }

    return (
      <div className="mt-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
        {searchResults.map((result, index) => (
          <div
            key={result.message.id || index}
            onClick={() => handleResultClick(result, index)}
            className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
              index === currentResultIndex ? 'bg-blue-50 border-blue-200' : ''
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">
                    {result.message.role === 'ME' ? 'V' : 'U'}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {result.message.role === 'ME' ? 'Você' : result.message.sender_name || 'Usuário'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(result.message.timestamp || result.message.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                  {result.message.content || result.message.text || 'Mensagem de mídia'}
                </p>
                {result.matches && result.matches.length > 0 && (
                  <div className="mt-1">
                    <span className="text-xs text-blue-600">
                      {result.matches.length} correspondência{result.matches.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`message-search ${className}`}>
      {/* Barra de busca */}
      <div className="relative">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={placeholder}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Botão de filtros */}
          {showFilters && (
            <button
              onClick={toggleAdvancedFilters}
              className={`p-2 rounded-lg border transition-colors ${
                showAdvancedFilters 
                  ? 'bg-blue-100 border-blue-300 text-blue-600' 
                  : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
              }`}
              title="Filtros avançados"
            >
              <FaFilter className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Controles de navegação */}
        {renderNavigationControls()}
      </div>
      
      {/* Filtros avançados */}
      {renderAdvancedFilters()}
      
      {/* Resultados da busca */}
      {renderSearchResults()}
    </div>
  );
});

MessageSearch.displayName = 'MessageSearch';

export default MessageSearch;
