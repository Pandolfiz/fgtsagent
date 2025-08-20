import React from 'react';
import { FaCheck, FaClock, FaUser, FaRobot } from 'react-icons/fa';

// Componente otimizado com React.memo para evitar re-renders desnecessários
const MessageItem = React.memo(({ message, isLastMessage }) => {
  // Função para renderizar o ícone de status da mensagem
  const renderStatusIcon = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <FaCheck className="text-blue-500 text-xs" />;
      case 'read':
        return <FaCheck className="text-green-500 text-xs" />;
      case 'pending':
      default:
        return <FaClock className="text-gray-400 text-xs" />;
    }
  };

  // Função para renderizar o ícone do remetente
  const renderSenderIcon = (role) => {
    switch (role) {
      case 'ME':
        return <FaUser className="text-blue-500 text-sm" />;
      case 'AI':
        return <FaRobot className="text-green-500 text-sm" />;
      default:
        return <FaUser className="text-gray-500 text-sm" />;
    }
  };

  // Função para formatar o timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return date.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } else {
        return date.toLocaleDateString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit' 
        });
      }
    } catch (error) {
      console.warn('[MessageItem] Erro ao formatar timestamp:', error);
      return '';
    }
  };

  // Determinar se a mensagem é do usuário atual
  const isOwnMessage = message.role === 'ME';
  
  // Classes condicionais para posicionamento
  const messageClasses = `
    flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3
  `;
  
  const bubbleClasses = `
    max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm
    ${isOwnMessage 
      ? 'bg-blue-600 text-white rounded-br-none' 
      : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
    }
  `;

  const iconClasses = `
    flex items-center gap-2 text-xs opacity-70 mt-1
    ${isOwnMessage ? 'justify-end' : 'justify-start'}
  `;

  return (
    <div className={messageClasses}>
      <div className="flex flex-col">
        {/* Ícone do remetente */}
        <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          {renderSenderIcon(message.role)}
          <span className="text-xs opacity-70">
            {message.role === 'ME' ? 'Você' : message.role === 'AI' ? 'IA' : 'Usuário'}
          </span>
        </div>
        
        {/* Bolha da mensagem */}
        <div className={bubbleClasses}>
          <div className="break-words whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
        
        {/* Status e timestamp */}
        <div className={iconClasses}>
          {renderStatusIcon(message.status)}
          <span>{formatTimestamp(message.timestamp || message.created_at)}</span>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Função de comparação personalizada para evitar re-renders desnecessários
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.message.timestamp === nextProps.message.timestamp &&
    prevProps.isLastMessage === nextProps.isLastMessage
  );
});

// Adicionar displayName para debugging
MessageItem.displayName = 'MessageItem';

export default MessageItem;
