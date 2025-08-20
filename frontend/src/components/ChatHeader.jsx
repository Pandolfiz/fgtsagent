import React from 'react';
import { FaPhone, FaVideo, FaEllipsisV, FaArrowLeft } from 'react-icons/fa';

// Componente otimizado para o cabeçalho do chat
const ChatHeader = React.memo(({ 
  currentContact, 
  onBack, 
  onCall, 
  onVideoCall, 
  onMenu,
  isOnline = false 
}) => {
  // Função para renderizar o status online/offline
  const renderStatus = () => {
    if (!currentContact) return null;
    
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
        <span className="text-xs text-gray-500">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
    );
  };

  // Função para renderizar o nome do contato
  const renderContactName = () => {
    if (!currentContact) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse" />
          <div className="h-4 bg-gray-300 rounded w-24 animate-pulse" />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3">
        {/* Avatar do contato */}
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
          {currentContact.name ? currentContact.name.charAt(0).toUpperCase() : 
           currentContact.push_name ? currentContact.push_name.charAt(0).toUpperCase() : '?'}
        </div>
        
        {/* Informações do contato */}
        <div className="flex flex-col">
          <h3 className="font-semibold text-gray-800 text-lg">
            {currentContact.name || currentContact.push_name || 'Contato'}
          </h3>
          {renderStatus()}
        </div>
      </div>
    );
  };

  // Função para renderizar os botões de ação
  const renderActionButtons = () => {
    if (!currentContact) return null;

    return (
      <div className="flex items-center gap-2">
        {/* Botão de chamada */}
        <button
          onClick={onCall}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors duration-200"
          title="Fazer chamada"
        >
          <FaPhone className="w-4 h-4" />
        </button>
        
        {/* Botão de videochamada */}
        <button
          onClick={onVideoCall}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors duration-200"
          title="Fazer videochamada"
        >
          <FaVideo className="w-4 h-4" />
        </button>
        
        {/* Botão de menu */}
        <button
          onClick={onMenu}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors duration-200"
          title="Menu"
        >
          <FaEllipsisV className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
      {/* Lado esquerdo - Botão voltar e informações do contato */}
      <div className="flex items-center gap-3">
        {/* Botão voltar */}
        <button
          onClick={onBack}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors duration-200 lg:hidden"
          title="Voltar"
        >
          <FaArrowLeft className="w-4 h-4" />
        </button>
        
        {/* Informações do contato */}
        {renderContactName()}
      </div>
      
      {/* Lado direito - Botões de ação */}
      {renderActionButtons()}
    </div>
  );
}, (prevProps, nextProps) => {
  // Função de comparação personalizada para evitar re-renders desnecessários
  return (
    prevProps.currentContact?.id === nextProps.currentContact?.id &&
    prevProps.currentContact?.name === nextProps.currentContact?.name &&
    prevProps.currentContact?.push_name === nextProps.currentContact?.push_name &&
    prevProps.isOnline === nextProps.isOnline
  );
});

// Adicionar displayName para debugging
ChatHeader.displayName = 'ChatHeader';

export default ChatHeader;
