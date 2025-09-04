import React, { memo, useCallback, useMemo } from 'react';
import { useVirtualScrolling } from '../hooks/useVirtualScrolling';

/**
 * Componente de lista virtualizada para performance otimizada
 */
const VirtualizedList = memo(({
  items = [],
  renderItem,
  itemHeight = 60,
  containerHeight = 400,
  overscan = 5,
  className = '',
  onScroll,
  onItemClick,
  onItemDoubleClick,
  enableVirtualization = true,
  ...props
}) => {
  // Hook de virtual scrolling
  const {
    visibleItems,
    totalHeight,
    containerRef,
    handleScroll,
    scrollToItem,
    scrollToTop,
    scrollToBottom,
    getScrollInfo
  } = useVirtualScrolling(items, {
    itemHeight,
    containerHeight,
    overscan,
    enabled: enableVirtualization
  });

  // Função para lidar com scroll
  const handleScrollWithCallback = useCallback((event) => {
    handleScroll(event);
    if (onScroll) {
      onScroll(event, getScrollInfo());
    }
  }, [handleScroll, onScroll, getScrollInfo]);

  // Função para lidar com clique no item
  const handleItemClick = useCallback((item, index, event) => {
    if (onItemClick) {
      onItemClick(item, index, event);
    }
  }, [onItemClick]);

  // Função para lidar com duplo clique no item
  const handleItemDoubleClick = useCallback((item, index, event) => {
    if (onItemDoubleClick) {
      onItemDoubleClick(item, index, event);
    }
  }, [onItemDoubleClick]);

  // Renderizar item virtualizado
  const renderVirtualizedItem = useCallback((item, index) => {
    const itemProps = {
      key: item.id || item.key || index,
      style: {
        position: 'absolute',
        top: item.top,
        left: 0,
        right: 0,
        height: itemHeight,
        transform: `translateY(${item.top}px)`
      },
      onClick: (event) => handleItemClick(item, item.index, event),
      onDoubleClick: (event) => handleItemDoubleClick(item, item.index, event)
    };

    if (renderItem) {
      return renderItem(item, item.index, itemProps);
    }

    // Renderização padrão
    return (
      <div {...itemProps} className="flex items-center p-2 border-b border-gray-200">
        <span className="text-sm text-gray-600">#{item.index + 1}</span>
        <span className="ml-2 text-gray-900">{item.name || item.title || 'Item'}</span>
      </div>
    );
  }, [renderItem, itemHeight, handleItemClick, handleItemDoubleClick]);

  // Renderizar lista sem virtualização
  const renderNormalList = useCallback(() => {
    return items.map((item, index) => {
      const itemProps = {
        key: item.id || item.key || index,
        onClick: (event) => handleItemClick(item, index, event),
        onDoubleClick: (event) => handleItemDoubleClick(item, index, event)
      };

      if (renderItem) {
        return renderItem(item, index, itemProps);
      }

      return (
        <div key={index} {...itemProps} className="flex items-center p-2 border-b border-gray-200">
          <span className="text-sm text-gray-600">#{index + 1}</span>
          <span className="ml-2 text-gray-900">{item.name || item.title || 'Item'}</span>
        </div>
      );
    });
  }, [items, renderItem, handleItemClick, handleItemDoubleClick]);

  // Renderizar indicador de scroll
  const renderScrollIndicator = useCallback(() => {
    const scrollInfo = getScrollInfo();
    
    if (scrollInfo.totalItemsCount <= scrollInfo.itemsPerViewport) {
      return null;
    }

    return (
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
        {scrollInfo.visibleItemsCount} de {scrollInfo.totalItemsCount}
      </div>
    );
  }, [getScrollInfo]);

  // Renderizar controles de scroll
  const renderScrollControls = useCallback(() => {
    const scrollInfo = getScrollInfo();
    
    if (scrollInfo.totalItemsCount <= scrollInfo.itemsPerViewport) {
      return null;
    }

    return (
      <div className="absolute right-2 bottom-2 flex flex-col space-y-1">
        <button
          onClick={scrollToTop}
          disabled={scrollInfo.isAtTop}
          className="p-1 bg-white bg-opacity-80 hover:bg-opacity-100 rounded shadow disabled:opacity-50"
          title="Ir para o topo"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          onClick={scrollToBottom}
          disabled={scrollInfo.isAtBottom}
          className="p-1 bg-white bg-opacity-80 hover:bg-opacity-100 rounded shadow disabled:opacity-50"
          title="Ir para o final"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    );
  }, [getScrollInfo, scrollToTop, scrollToBottom]);

  // Renderizar lista vazia
  const renderEmptyList = useCallback(() => {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">Nenhum item encontrado</p>
        </div>
      </div>
    );
  }, []);

  if (items.length === 0) {
    return (
      <div className={`relative ${className}`} style={{ height: containerHeight }} {...props}>
        {renderEmptyList()}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} {...props}>
      <div
        ref={containerRef}
        className="overflow-y-auto"
        style={{ height: containerHeight }}
        onScroll={handleScrollWithCallback}
      >
        {enableVirtualization ? (
          <div style={{ height: totalHeight, position: 'relative' }}>
            {visibleItems.map(renderVirtualizedItem)}
          </div>
        ) : (
          <div>
            {renderNormalList()}
          </div>
        )}
      </div>
      
      {/* Indicador de scroll */}
      {renderScrollIndicator()}
      
      {/* Controles de scroll */}
      {renderScrollControls()}
    </div>
  );
});

VirtualizedList.displayName = 'VirtualizedList';

export default VirtualizedList;
