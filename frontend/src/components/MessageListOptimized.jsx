import React, { memo, useCallback, useEffect, useRef } from 'react';
import { useLazyLoading } from '../hooks/useLazyLoading';
import MessageItem from './MessageItem';
import SkeletonLoader from './SkeletonLoader';

/**
 * Componente otimizado para lista de mensagens com lazy loading
 */
const MessageListOptimized = memo(({
  initialMessages = [],
  currentContact,
  onLoadMoreMessages,
  onMessageUpdate,
  onMessageDelete,
  className = '',
  ...props
}) => {
  const scrollContainerRef = useRef(null);
  const lastMessageRef = useRef(null);

  // Função para carregar mais mensagens
  const loadMoreMessages = useCallback(async (page, pageSize) => {
    if (!currentContact?.remote_jid || !onLoadMoreMessages) {
      return [];
    }

    try {
      const response = await onLoadMoreMessages(currentContact.remote_jid, page, pageSize);
      return response || [];
    } catch (error) {
      console.error('Erro ao carregar mais mensagens:', error);
      throw error;
    }
  }, [currentContact?.remote_jid, onLoadMoreMessages]);

  // Hook de lazy loading
  const {
    messages,
    isLoading,
    hasMore,
    error,
    containerRef,
    loadMore,
    addNewMessage,
    addNewMessages,
    updateMessage,
    removeMessage,
    handleScroll,
    canLoadMore,
    totalMessages
  } = useLazyLoading(initialMessages, loadMoreMessages, {
    threshold: 150,
    pageSize: 20,
    enabled: !!currentContact?.remote_jid,
    onLoadStart: () => {
      console.log('🔄 Iniciando carregamento de mensagens antigas...');
    },
    onLoadComplete: (newMessages) => {
      console.log(`✅ ${newMessages.length} mensagens antigas carregadas`);
    },
    onLoadError: (error) => {
      console.error('❌ Erro ao carregar mensagens antigas:', error);
    }
  });

  // Função para scroll suave para o final
  const scrollToBottom = useCallback((smooth = true) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, [containerRef]);

  // Função para scroll para uma mensagem específica
  const scrollToMessage = useCallback((messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement && containerRef.current) {
      messageElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, [containerRef]);

  // Efeito para scroll automático quando há novas mensagens
  useEffect(() => {
    if (messages.length > initialMessages.length) {
      // Há novas mensagens, fazer scroll para o final
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [messages.length, initialMessages.length, scrollToBottom]);

  // Efeito para ancoragem automática na mensagem mais recente ao carregar
  useEffect(() => {
    if (initialMessages.length > 0 && !isLoading) {
      // Sempre ancorar na mensagem mais recente ao carregar uma conversa
      setTimeout(() => scrollToBottom(false), 100);
    }
  }, [initialMessages.length, isLoading, scrollToBottom]);

  // Efeito para ancoragem quando muda de contato
  useEffect(() => {
    if (currentContact && messages.length > 0) {
      // Quando muda de contato, sempre ir para a mensagem mais recente
      setTimeout(() => scrollToBottom(false), 150);
    }
  }, [currentContact?.remote_jid, messages.length, scrollToBottom]);

  // Função para lidar com atualização de mensagem
  const handleMessageUpdate = useCallback((messageId, updates) => {
    updateMessage(messageId, updates);
    if (onMessageUpdate) {
      onMessageUpdate(messageId, updates);
    }
  }, [updateMessage, onMessageUpdate]);

  // Função para lidar com remoção de mensagem
  const handleMessageDelete = useCallback((messageId) => {
    removeMessage(messageId);
    if (onMessageDelete) {
      onMessageDelete(messageId);
    }
  }, [removeMessage, onMessageDelete]);

  // Função para adicionar nova mensagem
  const handleAddMessage = useCallback((message) => {
    addNewMessage(message);
  }, [addNewMessage]);

  // Função para adicionar múltiplas mensagens
  const handleAddMessages = useCallback((newMessages) => {
    addNewMessages(newMessages);
  }, [addNewMessages]);

  // Renderizar indicador de carregamento no topo
  const renderLoadingIndicator = () => {
    if (!isLoading) return null;

    return (
      <div className="flex justify-center py-4">
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-sm">Carregando mensagens antigas...</span>
        </div>
      </div>
    );
  };

  // Renderizar indicador de "não há mais mensagens"
  const renderNoMoreMessages = () => {
    if (hasMore || isLoading) return null;

    return (
      <div className="flex justify-center py-4">
        <div className="text-sm text-gray-400">
          Não há mais mensagens antigas
        </div>
      </div>
    );
  };

  // Renderizar erro
  const renderError = () => {
    if (!error) return null;

    return (
      <div className="flex justify-center py-4">
        <div className="text-sm text-red-500">
          Erro ao carregar mensagens: {error.message}
        </div>
      </div>
    );
  };

  // Renderizar skeleton loader para carregamento inicial
  const renderSkeletonLoader = () => {
    if (messages.length > 0) return null;

    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonLoader key={index} type="message" />
        ))}
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={`flex-1 overflow-y-auto ${className}`}
      onScroll={handleScroll}
      {...props}
    >
      {/* Indicador de carregamento no topo */}
      {renderLoadingIndicator()}
      
      {/* Indicador de "não há mais mensagens" */}
      {renderNoMoreMessages()}
      
      {/* Indicador de erro */}
      {renderError()}
      
      {/* Skeleton loader para carregamento inicial */}
      {renderSkeletonLoader()}
      
      {/* Lista de mensagens */}
      {messages.length > 0 && (
        <div className="space-y-1 p-4">
          {messages.map((message, index) => (
            <div
              key={message.id || index}
              id={`message-${message.id || index}`}
              ref={index === messages.length - 1 ? lastMessageRef : null}
            >
              <MessageItem
                message={message}
                onUpdate={handleMessageUpdate}
                onDelete={handleMessageDelete}
                showTimestamp={true}
                showStatus={true}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Indicador de scroll para o final */}
      {messages.length > 10 && (
        <div className="sticky bottom-4 flex justify-end pr-4">
          <button
            onClick={() => scrollToBottom(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 shadow-lg transition-colors"
            title="Ir para a mensagem mais recente"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
});

MessageListOptimized.displayName = 'MessageListOptimized';

export default MessageListOptimized;
