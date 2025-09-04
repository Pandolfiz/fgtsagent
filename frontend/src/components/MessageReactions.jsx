import React, { memo, useState, useCallback } from 'react';
import { FaThumbsUp, FaHeart, FaLaugh, FaSadTear, FaAngry, FaSurprise } from 'react-icons/fa';

/**
 * Componente para sistema de reações em mensagens
 */
const MessageReactions = memo(({ 
  messageId, 
  reactions = {}, 
  onReactionAdd, 
  onReactionRemove,
  currentUserId,
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Reações disponíveis
  const availableReactions = [
    { id: 'like', icon: FaThumbsUp, label: 'Curtir', color: 'text-blue-500' },
    { id: 'love', icon: FaHeart, label: 'Amar', color: 'text-red-500' },
    { id: 'laugh', icon: FaLaugh, label: 'Rir', color: 'text-yellow-500' },
    { id: 'sad', icon: FaSadTear, label: 'Triste', color: 'text-gray-500' },
    { id: 'angry', icon: FaAngry, label: 'Bravo', color: 'text-red-600' },
    { id: 'wow', icon: FaSurprise, label: 'Uau', color: 'text-purple-500' }
  ];

  // Função para lidar com reação
  const handleReaction = useCallback((reactionId) => {
    const userReaction = reactions[reactionId]?.find(r => r.userId === currentUserId);
    
    if (userReaction) {
      // Remover reação existente
      onReactionRemove?.(messageId, reactionId, currentUserId);
    } else {
      // Adicionar nova reação
      onReactionAdd?.(messageId, reactionId, currentUserId);
    }
    
    setIsOpen(false);
  }, [messageId, reactions, currentUserId, onReactionAdd, onReactionRemove]);

  // Função para obter contagem de reações
  const getReactionCount = useCallback((reactionId) => {
    return reactions[reactionId]?.length || 0;
  }, [reactions]);

  // Função para verificar se usuário reagiu
  const hasUserReacted = useCallback((reactionId) => {
    return reactions[reactionId]?.some(r => r.userId === currentUserId) || false;
  }, [reactions, currentUserId]);

  // Renderizar botão de reação
  const renderReactionButton = (reaction) => {
    const count = getReactionCount(reaction.id);
    const userReacted = hasUserReacted(reaction.id);
    
    if (count === 0) return null;

    return (
      <button
        key={reaction.id}
        onClick={() => handleReaction(reaction.id)}
        className={`
          flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium
          transition-all duration-200 hover:scale-105
          ${userReacted 
            ? `bg-blue-100 ${reaction.color} border border-blue-200` 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }
        `}
        title={`${reaction.label} (${count})`}
      >
        <reaction.icon className="w-3 h-3" />
        <span>{count}</span>
      </button>
    );
  };

  // Renderizar seletor de reações
  const renderReactionSelector = () => {
    if (!isOpen) return null;

    return (
      <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border p-2 flex space-x-1 z-10">
        {availableReactions.map((reaction) => (
          <button
            key={reaction.id}
            onClick={() => handleReaction(reaction.id)}
            className={`
              p-2 rounded-full hover:bg-gray-100 transition-colors
              ${hasUserReacted(reaction.id) ? reaction.color : 'text-gray-600'}
            `}
            title={reaction.label}
          >
            <reaction.icon className="w-4 h-4" />
          </button>
        ))}
      </div>
    );
  };

  // Renderizar lista de usuários que reagiram
  const renderReactionUsers = (reactionId) => {
    const reactionUsers = reactions[reactionId] || [];
    if (reactionUsers.length === 0) return null;

    return (
      <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border p-3 z-10 min-w-48">
        <div className="text-xs font-medium text-gray-700 mb-2">
          {availableReactions.find(r => r.id === reactionId)?.label}
        </div>
        <div className="space-y-1">
          {reactionUsers.map((reaction) => (
            <div key={reaction.userId} className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">
                  {reaction.userName?.charAt(0) || 'U'}
                </span>
              </div>
              <span className="text-sm text-gray-700">
                {reaction.userName || 'Usuário'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Verificar se há reações
  const hasReactions = Object.values(reactions).some(reactionList => reactionList.length > 0);

  if (!hasReactions && !isOpen) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          title="Adicionar reação"
        >
          <span className="text-sm">😊</span>
        </button>
        {renderReactionSelector()}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Lista de reações */}
      <div className="flex items-center space-x-1 mb-1">
        {availableReactions.map((reaction) => {
          const count = getReactionCount(reaction.id);
          if (count === 0) return null;

          return (
            <div key={reaction.id} className="relative group">
              {renderReactionButton(reaction)}
              {renderReactionUsers(reaction.id)}
            </div>
          );
        })}
        
        {/* Botão para adicionar reação */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          title="Adicionar reação"
        >
          <span className="text-sm">😊</span>
        </button>
      </div>

      {/* Seletor de reações */}
      {renderReactionSelector()}
    </div>
  );
});

MessageReactions.displayName = 'MessageReactions';

export default MessageReactions;
