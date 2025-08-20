import { useRef, useCallback, useEffect, useMemo } from 'react';

// Hook customizado otimizado para gerenciar scroll
export const useScrollManager = (options = {}) => {
  const {
    debounceDelay = 100,
    smoothScroll = true,
    autoScrollThreshold = 100
  } = options;

  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const isScrollingRef = useRef(false);

  // Função otimizada para scroll para posição específica
  const scrollToPosition = useCallback((position, options = {}) => {
    if (!containerRef.current) return;

    const {
      immediate = false,
      smooth = smoothScroll,
      duringInitialLoad = false
    } = options;

    const container = containerRef.current;
    let targetScrollTop = 0;

    switch (position) {
      case 'top':
        targetScrollTop = 0;
        break;
      case 'bottom':
        targetScrollTop = container.scrollHeight - container.clientHeight;
        break;
      case 'center':
        targetScrollTop = (container.scrollHeight - container.clientHeight) / 2;
        break;
      default:
        if (typeof position === 'number') {
          targetScrollTop = position;
        } else {
          targetScrollTop = container.scrollHeight - container.clientHeight;
        }
    }

    // Aplicar scroll
    if (immediate || duringInitialLoad) {
      container.scrollTop = targetScrollTop;
    } else {
      container.scrollTo({
        top: targetScrollTop,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }

    // Log para debugging
    console.log('[SCROLL] 🎯 Scroll aplicado:', {
      position,
      targetScrollTop,
      immediate,
      smooth,
      duringInitialLoad
    });
  }, [smoothScroll]);

  // Função otimizada para scroll para o final
  const scrollToBottom = useCallback((options = {}) => {
    scrollToPosition('bottom', options);
  }, [scrollToPosition]);

  // Função otimizada para scroll para o topo
  const scrollToTop = useCallback((options = {}) => {
    scrollToPosition('top', options);
  }, [scrollToPosition]);

  // Função otimizada para scroll para o centro
  const scrollToCenter = useCallback((options = {}) => {
    scrollToPosition('center', options);
  }, [scrollToPosition]);

  // Função otimizada para scroll debounced
  const debouncedScroll = useCallback((position, options = {}) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      scrollToPosition(position, options);
    }, debounceDelay);
  }, [scrollToPosition, debounceDelay]);

  // Função para verificar se está no final
  const isAtBottom = useCallback((threshold = autoScrollThreshold) => {
    if (!containerRef.current) return false;

    const container = containerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    return scrollHeight - scrollTop - clientHeight <= threshold;
  }, [autoScrollThreshold]);

  // Função para verificar se está no topo
  const isAtTop = useCallback((threshold = autoScrollThreshold) => {
    if (!containerRef.current) return false;

    const container = containerRef.current;
    return container.scrollTop <= threshold;
  }, [autoScrollThreshold]);

  // Função para obter informações do scroll
  const getScrollInfo = useCallback(() => {
    if (!containerRef.current) return null;

    const container = containerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;

    return {
      scrollTop,
      scrollHeight,
      clientHeight,
      isAtTop: isAtTop(),
      isAtBottom: isAtBottom(),
      scrollPercentage: scrollHeight > 0 ? (scrollTop / (scrollHeight - clientHeight)) * 100 : 0
    };
  }, [isAtTop, isAtBottom]);

  // Função para scroll automático baseado na posição
  const autoScroll = useCallback((options = {}) => {
    const { force = false, threshold = autoScrollThreshold } = options;
    
    if (force || isAtBottom(threshold)) {
      scrollToBottom({ immediate: true });
      return true;
    }
    return false;
  }, [isAtBottom, scrollToBottom, autoScrollThreshold]);

  // Função para scroll infinito (carregar mais mensagens antigas)
  const infiniteScroll = useCallback((callback, threshold = 100) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const { scrollTop } = container;

    if (scrollTop <= threshold && !isScrollingRef.current) {
      isScrollingRef.current = true;
      
      // Executar callback para carregar mais mensagens
      if (typeof callback === 'function') {
        callback();
      }

      // Resetar flag após um delay
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 500);
    }
  }, []);

  // Função para scroll suave para elemento específico
  const scrollToElement = useCallback((elementId, options = {}) => {
    if (!containerRef.current) return;

    const element = document.getElementById(elementId);
    if (!element) return;

    const container = containerRef.current;
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    const targetScrollTop = container.scrollTop + elementRect.top - containerRect.top - 20;

    const { immediate = false, smooth = smoothScroll } = options;

    if (immediate) {
      container.scrollTop = targetScrollTop;
    } else {
      container.scrollTo({
        top: targetScrollTop,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, [smoothScroll]);

  // Função para limpar timeouts
  const cleanup = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, []);

  // Cleanup automático
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Estados derivados otimizados
  const scrollInfo = useMemo(() => getScrollInfo(), [getScrollInfo]);
  const atBottom = useMemo(() => isAtBottom(), [isAtBottom]);
  const atTop = useMemo(() => isAtTop(), [isAtTop]);

  return {
    // Refs
    containerRef,
    
    // Estados
    scrollInfo,
    atBottom,
    atTop,
    
    // Funções de scroll
    scrollToPosition,
    scrollToBottom,
    scrollToTop,
    scrollToCenter,
    debouncedScroll,
    autoScroll,
    infiniteScroll,
    scrollToElement,
    
    // Utilitários
    isAtBottom,
    isAtTop,
    getScrollInfo,
    cleanup
  };
};

export default useScrollManager;
