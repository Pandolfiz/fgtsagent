import { useCallback, useRef, useEffect } from 'react';
import { debounce } from '../utils/debounce';

/**
 * Hook customizado para gerenciar scroll
 * Unifica todas as funções de scroll em uma interface limpa
 */
export const useScroll = ({ 
  messagesContainerRef, 
  loadMoreMessages, 
  checkIfAtBottom,
  // ✅ ADICIONADO: Parâmetros para condições do scroll infinito (igual ao backup)
  hasMoreMessages,
  isLoadingMoreMessages,
  allowInfiniteScroll,
  isInitialLoad,
  currentContact
}) => {
  const scrollTimeoutRef = useRef(null);
  // ✅ CORREÇÃO: Removido isScrollingRef que estava bloqueando chamadas múltiplas

  // Função unificada para scroll
  const scrollToPosition = useCallback((position = 'bottom', options = {}) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const { immediate = false, smooth = false, duringInitialLoad = false } = options;
    
    if (position === 'bottom') {
      const maxScroll = container.scrollHeight - container.clientHeight;
      
      if (immediate) {
        container.scrollTop = maxScroll;
      } else if (smooth) {
        container.scrollTo({ top: maxScroll, behavior: 'smooth' });
      } else {
        // Comportamento padrão - scroll suave
        container.scrollTo({ top: maxScroll, behavior: 'smooth' });
      }
    }
  }, [messagesContainerRef]);

  // Função para scroll instantâneo para o final
  const scrollToBottom = useCallback(() => {
    scrollToPosition('bottom', { immediate: true });
  }, [scrollToPosition]);

  // Função para scroll suave para o final
  const scrollToBottomSmooth = useCallback(() => {
    scrollToPosition('bottom', { smooth: true });
  }, [scrollToPosition]);

  // Função para scroll com debounce
  const debouncedScrollToBottom = useCallback(
    debounce(() => {
      scrollToPosition('bottom', { immediate: true });
    }, 100),
    [scrollToPosition]
  );

  // Função para forçar scroll para o final
  const forceScrollToEnd = useCallback(() => {
    scrollToPosition('bottom', { immediate: true });
    return () => scrollToPosition('bottom', { immediate: true });
  }, [scrollToPosition]);

  // Handler de scroll imediato
  const handleScrollImmediate = useCallback((e) => {
    const container = e.target;
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    // Verificar se está próximo do final
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    if (isNearBottom) {
      checkIfAtBottom();
    }
  }, [checkIfAtBottom]);

  // Handler de scroll com debounce (igual ao backup)
  const handleScrollDebounced = useCallback((e) => {
    const container = e.target;
    const { scrollTop } = container;
    
    // ✅ CORREÇÃO: Log de debug para scroll infinito (igual ao backup)
    console.log('[SCROLL-DEBUG] 🎯 Scroll debounced:', {
      scrollTop,
      hasMoreMessages,
      isLoadingMoreMessages,
      allowInfiniteScroll,
      isInitialLoad,
      currentContactId: currentContact?.remote_jid
    });
    
    // ✅ MÚLTIPLAS PROTEÇÕES: Evitar conflitos com ancoragem (igual ao backup)
    if (scrollTop < 100 && 
        hasMoreMessages && 
        !isLoadingMoreMessages && 
        allowInfiniteScroll && 
        !isInitialLoad &&
        currentContact?.remote_jid) {
      
      console.log('[SCROLL-DEBUG] ✅ Todas as condições atendidas - chamando loadMoreMessages');
      loadMoreMessages();
    } else {
      console.log('[SCROLL-DEBUG] ❌ Condições não atendidas para scroll infinito');
    }
  }, [loadMoreMessages, hasMoreMessages, isLoadingMoreMessages, allowInfiniteScroll, isInitialLoad, currentContact]);

  // Handler principal de scroll
  const handleScroll = useCallback((e) => {
    // Executar ações imediatas
    handleScrollImmediate(e);
    
    // Debounce para ações pesadas
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      handleScrollDebounced(e);
    }, 10); // ✅ OTIMIZAÇÃO: Debounce mínimo apenas para scroll infinito (10ms - igual ao backup)
  }, [handleScrollImmediate, handleScrollDebounced]);

  // Função para verificar se deve mostrar separador de data
  const shouldShowDateSeparator = useCallback((currentMsg, previousMsg) => {
    if (!previousMsg) return true;
    
    const currentDate = new Date(currentMsg.timestamp || currentMsg.created_at).toDateString();
    const previousDate = new Date(previousMsg.timestamp || previousMsg.created_at).toDateString();
    return currentDate !== previousDate;
  }, []);

  // Função para formatar data do separador
  const formatDateSeparator = useCallback((dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  }, []);

  // Cleanup de timeouts
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    scrollToPosition,
    scrollToBottom,
    scrollToBottomSmooth,
    debouncedScrollToBottom,
    forceScrollToEnd,
    handleScroll,
    shouldShowDateSeparator,
    formatDateSeparator
  };
};
























