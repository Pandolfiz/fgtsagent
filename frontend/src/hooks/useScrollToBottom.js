import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * Hook customizado para gerenciar scroll automático para o final
 * Elimina complexidade e bugs do sistema de scroll atual
 */
export const useScrollToBottom = (dependencies = []) => {
  const containerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);

  // Função para verificar se está no final
  const checkIfAtBottom = useCallback(() => {
    if (!containerRef.current) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const threshold = 5; // Margem de erro em pixels
    const atBottom = Math.abs(scrollTop + clientHeight - scrollHeight) <= threshold;
    
    setIsAtBottom(atBottom);
    return atBottom;
  }, []);

  // Função para scroll suave para o final
  const scrollToBottom = useCallback((options = {}) => {
    if (!containerRef.current) return;
    
    const { 
      behavior = 'smooth', 
      immediate = false,
      force = false 
    } = options;
    
    // Se não está no final ou se forçado, fazer scroll
    if (force || !isAtBottom) {
      setIsScrolling(true);
      
      if (immediate) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
        setIsScrolling(false);
        setIsAtBottom(true);
      } else {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior
        });
        
        // Verificar se chegou ao final após scroll
        setTimeout(() => {
          checkIfAtBottom();
          setIsScrolling(false);
        }, 300);
      }
    }
  }, [isAtBottom, checkIfAtBottom]);

  // Função para scroll para posição específica
  const scrollToPosition = useCallback((position, options = {}) => {
    if (!containerRef.current) return;
    
    const { behavior = 'smooth', immediate = false } = options;
    
    let targetPosition;
    switch (position) {
      case 'top':
        targetPosition = 0;
        break;
      case 'bottom':
        targetPosition = containerRef.current.scrollHeight;
        break;
      default:
        targetPosition = position;
    }
    
    if (immediate) {
      containerRef.current.scrollTop = targetPosition;
    } else {
      containerRef.current.scrollTo({
        top: targetPosition,
        behavior
      });
    }
    
    // Verificar posição após scroll
    setTimeout(() => {
      checkIfAtBottom();
    }, 300);
  }, [checkIfAtBottom]);

  // Handler para eventos de scroll
  const handleScroll = useCallback(() => {
    // Debounce para evitar muitas verificações
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      checkIfAtBottom();
    }, 100);
  }, [checkIfAtBottom]);

  // Auto-scroll quando dependências mudam
  useEffect(() => {
    if (dependencies.length > 0 && isAtBottom) {
      // Pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        scrollToBottom({ immediate: true });
      }, 50);
    }
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  // Adicionar listener de scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Função para obter informações do scroll
  const getScrollInfo = useCallback(() => {
    if (!containerRef.current) return null;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return {
      scrollTop,
      scrollHeight,
      clientHeight,
      isAtBottom: isAtBottom,
      isScrolling: isScrolling,
      canScrollUp: scrollTop > 0,
      canScrollDown: scrollTop < scrollHeight - clientHeight
    };
  }, [isAtBottom, isScrolling]);

  return {
    containerRef,
    isAtBottom,
    isScrolling,
    scrollToBottom,
    scrollToPosition,
    checkIfAtBottom,
    getScrollInfo
  };
};

export default useScrollToBottom;
