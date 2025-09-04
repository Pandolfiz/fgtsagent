import { useState, useCallback, useMemo, useRef } from 'react';

/**
 * Hook para busca avançada de mensagens
 */
const useMessageSearch = (messages = [], options = {}) => {
  const {
    enabled = true,
    caseSensitive = false,
    wholeWord = false,
    regex = false,
    maxResults = 100,
    debounceMs = 300
  } = options;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [searchFilters, setSearchFilters] = useState({
    dateFrom: null,
    dateTo: null,
    messageType: 'all', // 'text', 'media', 'all'
    sender: 'all', // 'me', 'others', 'all'
    hasReactions: false,
    hasMedia: false
  });

  const searchTimeoutRef = useRef(null);
  const searchIndexRef = useRef(new Map());

  // Função para criar índice de busca
  const createSearchIndex = useCallback((messages) => {
    const index = new Map();
    
    messages.forEach((message, index) => {
      const searchableText = [
        message.content || message.text || '',
        message.sender_name || '',
        message.media?.fileName || '',
        message.media?.caption || ''
      ].join(' ').toLowerCase();
      
      index.set(message.id, {
        message,
        searchableText,
        originalIndex: index
      });
    });
    
    return index;
  }, []);

  // Função para criar regex de busca
  const createSearchRegex = useCallback((query) => {
    if (!query) return null;
    
    let pattern = query;
    
    if (!regex) {
      // Escapar caracteres especiais se não for regex
      pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    if (wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }
    
    const flags = caseSensitive ? 'g' : 'gi';
    
    try {
      return new RegExp(pattern, flags);
    } catch (error) {
      console.warn('Erro ao criar regex de busca:', error);
      return null;
    }
  }, [caseSensitive, wholeWord, regex]);

  // Função para filtrar mensagens por critérios
  const filterMessages = useCallback((messages, filters) => {
    return messages.filter(message => {
      // Filtro por data
      if (filters.dateFrom || filters.dateTo) {
        const messageDate = new Date(message.timestamp || message.created_at);
        
        if (filters.dateFrom && messageDate < filters.dateFrom) {
          return false;
        }
        
        if (filters.dateTo && messageDate > filters.dateTo) {
          return false;
        }
      }
      
      // Filtro por tipo de mensagem
      if (filters.messageType !== 'all') {
        if (filters.messageType === 'text' && message.media) {
          return false;
        }
        if (filters.messageType === 'media' && !message.media) {
          return false;
        }
      }
      
      // Filtro por remetente
      if (filters.sender !== 'all') {
        const isFromMe = message.role === 'ME' || message.sender_id === 'me';
        
        if (filters.sender === 'me' && !isFromMe) {
          return false;
        }
        if (filters.sender === 'others' && isFromMe) {
          return false;
        }
      }
      
      // Filtro por reações
      if (filters.hasReactions && (!message.reactions || Object.keys(message.reactions).length === 0)) {
        return false;
      }
      
      // Filtro por mídia
      if (filters.hasMedia && !message.media) {
        return false;
      }
      
      return true;
    });
  }, []);

  // Função para buscar mensagens
  const searchMessages = useCallback((query, filters = searchFilters) => {
    if (!enabled || !query.trim()) {
      setSearchResults([]);
      setCurrentResultIndex(-1);
      return;
    }

    setIsSearching(true);
    
    try {
      // Filtrar mensagens por critérios
      const filteredMessages = filterMessages(messages, filters);
      
      // Criar índice de busca
      const searchIndex = createSearchIndex(filteredMessages);
      
      // Criar regex de busca
      const searchRegex = createSearchRegex(query);
      if (!searchRegex) {
        setSearchResults([]);
        setCurrentResultIndex(-1);
        return;
      }
      
      // Buscar mensagens
      const results = [];
      
      for (const [messageId, indexData] of searchIndex) {
        const { message, searchableText } = indexData;
        
        if (searchRegex.test(searchableText)) {
          // Encontrar posições das correspondências
          const matches = [];
          let match;
          searchRegex.lastIndex = 0; // Reset regex
          
          while ((match = searchRegex.exec(searchableText)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              text: match[0]
            });
          }
          
          results.push({
            message,
            matches,
            relevanceScore: matches.length
          });
        }
      }
      
      // Ordenar por relevância
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      // Limitar resultados
      const limitedResults = results.slice(0, maxResults);
      
      setSearchResults(limitedResults);
      setCurrentResultIndex(limitedResults.length > 0 ? 0 : -1);
      
    } catch (error) {
      console.error('Erro na busca:', error);
      setSearchResults([]);
      setCurrentResultIndex(-1);
    } finally {
      setIsSearching(false);
    }
  }, [enabled, messages, searchFilters, filterMessages, createSearchIndex, createSearchRegex, maxResults]);

  // Função para buscar com debounce
  const searchWithDebounce = useCallback((query, filters = searchFilters) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchMessages(query, filters);
    }, debounceMs);
  }, [searchMessages, searchFilters, debounceMs]);

  // Função para navegar entre resultados
  const navigateResults = useCallback((direction) => {
    if (searchResults.length === 0) return;
    
    const newIndex = direction === 'next' 
      ? (currentResultIndex + 1) % searchResults.length
      : (currentResultIndex - 1 + searchResults.length) % searchResults.length;
    
    setCurrentResultIndex(newIndex);
  }, [searchResults.length, currentResultIndex]);

  // Função para ir para resultado específico
  const goToResult = useCallback((index) => {
    if (index >= 0 && index < searchResults.length) {
      setCurrentResultIndex(index);
    }
  }, [searchResults.length]);

  // Função para limpar busca
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setCurrentResultIndex(-1);
    setIsSearching(false);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  // Função para atualizar filtros
  const updateFilters = useCallback((newFilters) => {
    setSearchFilters(prev => ({ ...prev, ...newFilters }));
    
    // Refazer busca com novos filtros
    if (searchQuery.trim()) {
      searchMessages(searchQuery, { ...searchFilters, ...newFilters });
    }
  }, [searchQuery, searchFilters, searchMessages]);

  // Resultado atual
  const currentResult = useMemo(() => {
    if (currentResultIndex >= 0 && currentResultIndex < searchResults.length) {
      return searchResults[currentResultIndex];
    }
    return null;
  }, [currentResultIndex, searchResults]);

  // Estatísticas da busca
  const searchStats = useMemo(() => {
    return {
      totalResults: searchResults.length,
      currentIndex: currentResultIndex + 1,
      hasResults: searchResults.length > 0,
      isSearching,
      query: searchQuery
    };
  }, [searchResults.length, currentResultIndex, isSearching, searchQuery]);

  return {
    // Estado
    searchQuery,
    setSearchQuery,
    searchResults,
    currentResult,
    currentResultIndex,
    isSearching,
    searchFilters,
    searchStats,
    
    // Funções
    searchMessages,
    searchWithDebounce,
    navigateResults,
    goToResult,
    clearSearch,
    updateFilters,
    
    // Utilitários
    hasResults: searchResults.length > 0,
    canNavigateNext: searchResults.length > 0 && currentResultIndex < searchResults.length - 1,
    canNavigatePrev: searchResults.length > 0 && currentResultIndex > 0
  };
};

export default useMessageSearch;
