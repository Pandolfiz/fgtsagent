import React, { useCallback } from 'react';
import { FaChevronDown } from 'react-icons/fa';

// Componente otimizado para o botão âncora de scroll
const ScrollAnchor = React.memo(({ 
  onScrollToBottom, 
  unreadCount = 0, 
  isVisible = true,
  className = ''
}) => {
  // Função otimizada para scroll
  const handleClick = useCallback(() => {
    onScrollToBottom();
  }, [onScrollToBottom]);

  // Se não estiver visível, não renderizar
  if (!isVisible) return null;

  return (
    <button
      onClick={handleClick}
      className={`
        absolute bottom-20 right-4 z-50 
        bg-gradient-to-r from-cyan-500 to-blue-600 
        hover:from-cyan-400 hover:to-blue-500 
        text-white p-3 rounded-full shadow-lg 
        transition-all duration-200 transform hover:scale-110 
        group ${className}
      `}
      title="Ir para a mensagem mais recente"
    >
      {/* Ícone de seta para baixo */}
      <FaChevronDown className="w-4 h-4" />
      
      {/* Contador de mensagens não lidas */}
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[1.25rem] h-5 flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
        Ir para mensagem mais recente
        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
      </div>
    </button>
  );
}, (prevProps, nextProps) => {
  // Função de comparação personalizada para evitar re-renders desnecessários
  return (
    prevProps.unreadCount === nextProps.unreadCount &&
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.className === nextProps.className
  );
});

// Adicionar displayName para debugging
ScrollAnchor.displayName = 'ScrollAnchor';

export default ScrollAnchor;
