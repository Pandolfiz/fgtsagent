import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook para lazy loading de mensagens antigas
 * Carrega mensagens sob demanda quando o usuário faz scroll para cima
 */
const useLazyLoading = (initialMessages = [], loadMoreMessages, options = {}) => {
  const {
    threshold = 100, // pixels do topo para começar a carregar
    pageSize = 20, // número de mensagens por página
    enabled = true,
    onLoadStart = () => {},
    onLoadComplete = () => {},
    onLoadError = () => {}
  } = options;

  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState(null);

  const containerRef = useRef(null);
  const isLoadingRef = useRef(false);

  // Função para carregar mais mensagens
  const loadMore = useCallback(async () => {
    if (!enabled || isLoadingRef.current || !hasMore) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);
    onLoadStart();

    try {
      const newMessages = await loadMoreMessages(currentPage + 1, pageSize);
      
      if (newMessages && newMessages.length > 0) {
        setMessages(prevMessages => [...newMessages, ...prevMessages]);
        setCurrentPage(prev => prev + 1);
        
        // Se retornou menos mensagens que o pageSize, não há mais mensagens
        if (newMessages.length < pageSize) {
          setHasMore(false);
        }
        
        onLoadComplete(newMessages);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError(err);
      onLoadError(err);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [enabled, hasMore, currentPage, pageSize, loadMoreMessages, onLoadStart, onLoadComplete, onLoadError]);

  // Função para detectar quando o usuário está próximo do topo
  const handleScroll = useCallback((event) => {
    if (!enabled || !containerRef.current) return;

    const { scrollTop } = event.target;
    
    // Se está próximo do topo (dentro do threshold)
    if (scrollTop <= threshold && hasMore && !isLoadingRef.current) {
      loadMore();
    }
  }, [enabled, threshold, hasMore, loadMore]);

  // Função para resetar o estado
  const reset = useCallback(() => {
    setMessages(initialMessages);
    setCurrentPage(0);
    setHasMore(true);
    setError(null);
    setIsLoading(false);
    isLoadingRef.current = false;
  }, [initialMessages]);

  // Função para adicionar novas mensagens (mensagens mais recentes)
  const addNewMessage = useCallback((newMessage) => {
    setMessages(prevMessages => {
      const updatedMessages = [...prevMessages, newMessage];
      return sortMessagesByDate(updatedMessages);
    });
  }, [sortMessagesByDate]);

  // Função para adicionar múltiplas mensagens novas
  const addNewMessages = useCallback((newMessages) => {
    setMessages(prevMessages => {
      const updatedMessages = [...prevMessages, ...newMessages];
      return sortMessagesByDate(updatedMessages);
    });
  }, [sortMessagesByDate]);

  // Função para atualizar uma mensagem específica
  const updateMessage = useCallback((messageId, updates) => {
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  // Função para remover uma mensagem
  const removeMessage = useCallback((messageId) => {
    setMessages(prevMessages => 
      prevMessages.filter(msg => msg.id !== messageId)
    );
  }, []);

  // Função para ordenar mensagens por data (mais antigas primeiro, mais recentes por último)
  const sortMessagesByDate = useCallback((messages) => {
    return [...messages].sort((a, b) => {
      const dateA = new Date(a.created_at || a.timestamp || 0);
      const dateB = new Date(b.created_at || b.timestamp || 0);
      return dateA - dateB; // Mais antigas primeiro
    });
  }, []);

  // Efeito para atualizar mensagens quando initialMessages muda
  useEffect(() => {
    if (initialMessages.length > 0) {
      // Ordenar mensagens iniciais por data
      const sortedMessages = sortMessagesByDate(initialMessages);
      setMessages(sortedMessages);
    }
  }, [initialMessages, sortMessagesByDate]);

  return {
    // Estado
    messages,
    isLoading,
    hasMore,
    error,
    currentPage,
    
    // Refs
    containerRef,
    
    // Funções
    loadMore,
    reset,
    addNewMessage,
    addNewMessages,
    updateMessage,
    removeMessage,
    handleScroll,
    
    // Utilitários
    canLoadMore: hasMore && !isLoading,
    totalMessages: messages.length
  };
};

export default useLazyLoading;
