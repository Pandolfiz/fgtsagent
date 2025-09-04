import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook customizado para gerenciar mensagens
 * Otimizado para scroll infinito e performance
 */
export const useMessages = ({ currentContact, messagesContainerRef }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState({
    messages: false,
    moreMessages: false,
    initialLoad: false,
    allowInfiniteScroll: false // ✅ ADICIONADO: Controle de scroll infinito (igual ao backup)
  });
  const [pagination, setPagination] = useState({
    messagesPage: 1,
    hasMoreMessages: true
  });
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState(null);

  const MESSAGES_PER_PAGE = 20; // ✅ CORREÇÃO: Reduzido de 50 para 20 (igual ao backup)

  // Função para sanitizar mensagens
  const sanitizeMessage = useCallback((msg) => {
    if (!msg || typeof msg !== 'object') return null;
    
    return {
      ...msg,
      content: msg.content || '',
      timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
      id: msg.id || `${msg.timestamp}_${Math.random()}`,
      from_me: msg.from_me || false,
      role: msg.role || (msg.from_me ? 'ME' : 'USER'), // Preservar role ou inferir de from_me
      message_type: msg.message_type || 'text'
    };
  }, []);

  // Função para scroll para o final
  const scrollToBottom = useCallback((immediate = true) => {
    const container = messagesContainerRef.current;
    console.log('[SCROLL] 🔍 Debug scrollToBottom:', {
      container: !!container,
      immediate,
      scrollHeight: container?.scrollHeight,
      clientHeight: container?.clientHeight,
      currentScrollTop: container?.scrollTop
    });
    
    if (!container) {
      console.log('[SCROLL] ❌ Container não encontrado');
      return;
    }
    
    const maxScroll = container.scrollHeight - container.clientHeight;
    console.log('[SCROLL] 📊 Calculando scroll:', {
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
      maxScroll,
      currentScrollTop: container.scrollTop
    });
    
    if (immediate) {
      container.scrollTop = maxScroll;
      console.log('[SCROLL] ✅ Scroll imediato aplicado:', container.scrollTop);
    } else {
      container.scrollTo({ top: maxScroll, behavior: 'smooth' });
      console.log('[SCROLL] ✅ Scroll suave iniciado');
    }
    
    setIsAtBottom(true);
    setUnreadCount(0);
  }, []);

  // Função para buscar mensagens
  const fetchMessages = useCallback(async (contactId, page = 1, reset = true) => {
    if (!contactId) return;
    
    console.log('[MESSAGES] 📨 Carregando mensagens:', { contactId, page, reset });
    
    try {
      if (reset) {
        setMessages([]);
        setPagination(prev => ({ ...prev, messagesPage: 1, hasMoreMessages: true }));
        setUnreadCount(0);
        setLoading(prev => ({ ...prev, messages: true, initialLoad: false }));
      } else {
        setLoading(prev => ({ ...prev, moreMessages: true }));
      }
      
      const response = await fetch(`/api/chat/messages/${contactId}?page=${page}&limit=${MESSAGES_PER_PAGE}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status} ao buscar mensagens`);
      }
      
      const data = await response.json();
      
      if (data.success && data.messages) {
        const newMessages = data.messages;
        const hasMore = data.hasMore || newMessages.length === MESSAGES_PER_PAGE;
        
        console.log('[MESSAGES] 📊 Debug paginação:', {
          page,
          newMessagesLength: newMessages.length,
          MESSAGES_PER_PAGE,
          dataHasMore: data.hasMore,
          calculatedHasMore: hasMore,
          currentHasMoreMessages: pagination.hasMoreMessages
        });
        
        setPagination(prev => ({
          ...prev,
          messagesPage: page, // ✅ CORRIGIDO: Usar a página atual, não a anterior
          hasMoreMessages: hasMore
        }));
        
        if (reset) {
          // Primeira carga - ordenar por timestamp (mais antigas primeiro)
          const sanitizedMessages = newMessages.map(sanitizeMessage).filter(Boolean);
          const sortedMessages = sanitizedMessages.sort((a, b) => {
            const timeA = new Date(a.timestamp || a.created_at).getTime();
            const timeB = new Date(b.timestamp || b.created_at).getTime();
            return timeA - timeB; // Ordem crescente (mais antigas primeiro)
          });
          setMessages(sortedMessages);
          setIsAtBottom(true);
          setLoading(prev => ({ ...prev, messages: false, initialLoad: true }));
          
          // ✅ SCROLL AUTOMÁTICO: Ancorar no final após carregar mensagens iniciais (igual ao backup)
          setTimeout(() => {
            console.log('[MESSAGES] 📜 Scroll automático para o final após carregamento inicial');
            scrollToBottom(true);
          }, 100);
          
          // ✅ UX: Habilitar scroll infinito rapidamente para não interferir na experiência (igual ao backup)
          setTimeout(() => {
            console.log('[MESSAGES] 🔄 Habilitando scroll infinito após carregamento inicial');
            setLoading(prev => ({ ...prev, allowInfiniteScroll: true }));
          }, 500);
        } else {
          // Carregamento adicional - inserir mensagens antigas no início
          const container = messagesContainerRef.current;
          const oldScrollHeight = container?.scrollHeight || 0;
          
          setMessages(prevMessages => {
            const sanitizedNewMessages = newMessages.map(sanitizeMessage).filter(Boolean);
            const combinedMessages = [...sanitizedNewMessages, ...prevMessages];
            const uniqueMessages = combinedMessages.filter((msg, index, self) => 
              index === self.findIndex(m => m.id === msg.id)
            );
            // Manter ordenação por timestamp
            return uniqueMessages.sort((a, b) => {
              const timeA = new Date(a.timestamp || a.created_at).getTime();
              const timeB = new Date(b.timestamp || b.created_at).getTime();
              return timeA - timeB; // Ordem crescente (mais antigas primeiro)
            });
          });
          
          // Preservar posição do scroll
          setTimeout(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight;
              const scrollDiff = newScrollHeight - oldScrollHeight;
              console.log('[SCROLL-PRESERVE] 📊 Preservando posição do scroll:', {
                oldScrollHeight,
                newScrollHeight,
                scrollDiff,
                currentScrollTop: container.scrollTop,
                newScrollTop: container.scrollTop + scrollDiff
              });
              container.scrollTop += scrollDiff;
            }
          }, 50);
        }
      } else {
        if (reset) {
          setMessages([]);
          setPagination(prev => ({ ...prev, hasMoreMessages: false }));
          setIsAtBottom(true);
          setLoading(prev => ({ ...prev, messages: false, initialLoad: false }));
        }
      }
    } catch (error) {
      console.error('[MESSAGES] ❌ Erro ao buscar mensagens:', error);
      setError(error.message);
      if (reset) {
        setLoading(prev => ({ ...prev, messages: false, initialLoad: false }));
      }
    } finally {
      setLoading(prev => ({ ...prev, moreMessages: false }));
    }
  }, [sanitizeMessage, scrollToBottom]);

  // Função para adicionar nova mensagem
  const addMessage = useCallback((newMessage) => {
    const sanitized = sanitizeMessage(newMessage);
    if (sanitized) {
      setMessages(prev => {
        // Verificar se a mensagem já existe
        const exists = prev.some(msg => msg.id === sanitized.id);
        if (exists) return prev;
        
        // Adicionar nova mensagem e manter ordenação por timestamp
        const updatedMessages = [...prev, sanitized];
        return updatedMessages.sort((a, b) => {
          const timeA = new Date(a.timestamp || a.created_at).getTime();
          const timeB = new Date(b.timestamp || b.created_at).getTime();
          return timeA - timeB; // Ordem crescente (mais antigas primeiro)
        });
      });
      
      // Se a mensagem não é do usuário atual, incrementar contador
      if (!sanitized.from_me) {
        setUnreadCount(prev => prev + 1);
      }

      // Scroll automático para nova mensagem (se estiver próximo do final)
      setTimeout(() => {
        const container = messagesContainerRef.current;
        if (container) {
          const { scrollTop, scrollHeight, clientHeight } = container;
          const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
          
          if (isNearBottom) {
            console.log('[MESSAGES] 📜 Scroll automático para nova mensagem');
            scrollToBottom(true);
          }
        }
      }, 50);
    }
  }, [sanitizeMessage, scrollToBottom]);

  // Função para atualizar mensagem
  const updateMessage = useCallback((messageId, updates) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    ));
  }, []);

  // Função para remover mensagem
  const removeMessage = useCallback((messageId) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  // Função para carregar mais mensagens (simplificada - igual ao backup)
  const loadMoreMessages = useCallback(() => {
    console.log('[SCROLL-INFINITO] 🔄 Tentativa de carregar mais mensagens:', {
      isLoadingMoreMessages: loading.moreMessages,
      hasMoreMessages: pagination.hasMoreMessages,
      currentContact: currentContact?.remote_jid,
      messagesPage: pagination.messagesPage,
      allowInfiniteScroll: loading.allowInfiniteScroll,
      isInitialLoad: loading.initialLoad
    });
    
    // ✅ SIMPLIFICADO: Apenas as condições essenciais (igual ao backup)
    if (!loading.moreMessages && 
        pagination.hasMoreMessages && 
        currentContact?.remote_jid) {
      const nextPage = pagination.messagesPage + 1;
      console.log(`[SCROLL-INFINITO] ✅ Carregando página ${nextPage} de mensagens antigas`);
      fetchMessages(currentContact.remote_jid, nextPage, false);
    } else {
      console.log('[SCROLL-INFINITO] ❌ Condições não atendidas para carregar mais mensagens:', {
        loadingMoreMessages: loading.moreMessages,
        hasMoreMessages: pagination.hasMoreMessages,
        hasContact: !!currentContact?.remote_jid
      });
    }
  }, [loading.moreMessages, pagination.hasMoreMessages, currentContact?.remote_jid, fetchMessages, loading.allowInfiniteScroll, loading.initialLoad]);

  // Função para limpar mensagens
  const clearMessages = useCallback(() => {
    setMessages([]);
    setUnreadCount(0);
    setPagination(prev => ({ ...prev, messagesPage: 1, hasMoreMessages: true }));
  }, []);

  // Função para marcar mensagens como lidas
  const markAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // ✅ REMOVIDO: useEffect que causava múltiplas chamadas
  // O carregamento de mensagens será feito diretamente na seleção de contato

  // ✅ SCROLL AUTOMÁTICO: Monitorar carregamento inicial de mensagens (igual ao backup)
  useEffect(() => {
    if (messages.length > 0 && loading.initialLoad && !loading.messages) {
      console.log('[MESSAGES] 📜 Scroll automático para o final após carregamento inicial');
      setTimeout(() => {
        scrollToBottom(true);
        
        // ✅ CORREÇÃO: Resetar isInitialLoad após scroll automático para habilitar scroll infinito
        setTimeout(() => {
          console.log('[MESSAGES] ✅ Resetando isInitialLoad para habilitar scroll infinito');
          setLoading(prev => ({ ...prev, initialLoad: false }));
        }, 200); // Delay adicional para garantir que o scroll foi completado
      }, 100); // Pequeno delay para garantir que o DOM foi atualizado
    }
  }, [messages.length, loading.initialLoad, loading.messages, scrollToBottom]);

  // Função para verificar se está no final
  const checkIfAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    console.log('[CHECK-BOTTOM] 🔍 Verificando se está no final:', {
      container: !!container,
      scrollTop: container?.scrollTop,
      scrollHeight: container?.scrollHeight,
      clientHeight: container?.clientHeight
    });
    
    if (!container) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtEnd = Math.abs(scrollTop - (scrollHeight - clientHeight)) < 5;
    
    console.log('[CHECK-BOTTOM] 📊 Resultado:', {
      isAtEnd,
      currentIsAtBottom: isAtBottom,
      willUpdate: isAtEnd !== isAtBottom
    });
    
    setIsAtBottom(isAtEnd);
    
    if (isAtEnd) {
      setUnreadCount(0);
    }
    
    return isAtEnd;
  }, [isAtBottom]);

  return {
    messages,
    setMessages, // ✅ ADICIONADO: Para o useMessagePolling
    loading,
    error,
    pagination,
    isAtBottom,
    unreadCount,
    messagesContainerRef,
    fetchMessages,
    addMessage,
    updateMessage,
    removeMessage,
    loadMoreMessages,
    clearMessages,
    markAsRead,
    scrollToBottom,
    checkIfAtBottom,
    // ✅ ADICIONADO: Estados para condições do scroll infinito
    hasMoreMessages: pagination.hasMoreMessages,
    isLoadingMoreMessages: loading.moreMessages,
    allowInfiniteScroll: loading.allowInfiniteScroll,
    isInitialLoad: loading.initialLoad
  };
};




































