import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

/**
 * Hook para virtual scrolling otimizado
 * Renderiza apenas os itens visíveis na viewport para melhor performance
 */
const useVirtualScrolling = (items = [], options = {}) => {
  const {
    itemHeight = 60, // altura fixa de cada item
    containerHeight = 400, // altura do container
    overscan = 5, // número de itens extras para renderizar fora da viewport
    enabled = true
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeightState, setContainerHeightState] = useState(containerHeight);
  const containerRef = useRef(null);

  // Calcular índices visíveis
  const visibleRange = useMemo(() => {
    if (!enabled || items.length === 0) {
      return { start: 0, end: items.length - 1 };
    }

    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeightState / itemHeight),
      items.length - 1
    );

    // Adicionar overscan
    const startWithOverscan = Math.max(0, start - overscan);
    const endWithOverscan = Math.min(items.length - 1, end + overscan);

    return {
      start: startWithOverscan,
      end: endWithOverscan,
      originalStart: start,
      originalEnd: end
    };
  }, [scrollTop, itemHeight, containerHeightState, items.length, overscan, enabled]);

  // Itens visíveis
  const visibleItems = useMemo(() => {
    if (!enabled) return items;
    
    return items.slice(visibleRange.start, visibleRange.end + 1).map((item, index) => ({
      ...item,
      index: visibleRange.start + index,
      top: (visibleRange.start + index) * itemHeight
    }));
  }, [items, visibleRange, itemHeight, enabled]);

  // Altura total da lista
  const totalHeight = useMemo(() => {
    return items.length * itemHeight;
  }, [items.length, itemHeight]);

  // Função para lidar com scroll
  const handleScroll = useCallback((event) => {
    const newScrollTop = event.target.scrollTop;
    setScrollTop(newScrollTop);
  }, []);

  // Função para scroll para um item específico
  const scrollToItem = useCallback((index) => {
    if (!containerRef.current) return;
    
    const targetScrollTop = index * itemHeight;
    containerRef.current.scrollTop = targetScrollTop;
  }, [itemHeight]);

  // Função para scroll para o topo
  const scrollToTop = useCallback(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = 0;
  }, []);

  // Função para scroll para o final
  const scrollToBottom = useCallback(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = totalHeight;
  }, [totalHeight]);

  // Função para obter item no centro da viewport
  const getCenterItem = useCallback(() => {
    const centerIndex = Math.floor((scrollTop + containerHeightState / 2) / itemHeight);
    return Math.min(centerIndex, items.length - 1);
  }, [scrollTop, containerHeightState, itemHeight, items.length]);

  // Função para obter item no topo da viewport
  const getTopItem = useCallback(() => {
    return Math.floor(scrollTop / itemHeight);
  }, [scrollTop, itemHeight]);

  // Função para obter item no final da viewport
  const getBottomItem = useCallback(() => {
    return Math.min(
      Math.floor((scrollTop + containerHeightState) / itemHeight),
      items.length - 1
    );
  }, [scrollTop, containerHeightState, itemHeight, items.length]);

  // Efeito para atualizar altura do container
  useEffect(() => {
    const updateContainerHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeightState(rect.height);
      }
    };

    updateContainerHeight();
    
    const resizeObserver = new ResizeObserver(updateContainerHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Função para estimar altura total (útil para itens com altura variável)
  const estimateTotalHeight = useCallback((estimatedItemHeight) => {
    return items.length * estimatedItemHeight;
  }, [items.length]);

  // Função para obter informações de scroll
  const getScrollInfo = useCallback(() => {
    const scrollPercentage = totalHeight > 0 ? (scrollTop / totalHeight) * 100 : 0;
    const itemsPerViewport = Math.ceil(containerHeightState / itemHeight);
    
    return {
      scrollTop,
      scrollPercentage,
      totalHeight,
      containerHeight: containerHeightState,
      itemsPerViewport,
      visibleItemsCount: visibleItems.length,
      totalItemsCount: items.length,
      isAtTop: scrollTop <= 0,
      isAtBottom: scrollTop >= totalHeight - containerHeightState
    };
  }, [scrollTop, totalHeight, containerHeightState, itemHeight, visibleItems.length, items.length]);

  return {
    // Estado
    visibleItems,
    visibleRange,
    totalHeight,
    scrollTop,
    containerHeight: containerHeightState,
    
    // Refs
    containerRef,
    
    // Funções de scroll
    handleScroll,
    scrollToItem,
    scrollToTop,
    scrollToBottom,
    
    // Funções de informação
    getCenterItem,
    getTopItem,
    getBottomItem,
    getScrollInfo,
    estimateTotalHeight,
    
    // Utilitários
    isEnabled: enabled,
    itemHeight,
    overscan
  };
};

export default useVirtualScrolling;
