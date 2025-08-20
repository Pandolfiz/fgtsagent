import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FaPaperPlane, FaSmile, FaPaperclip } from 'react-icons/fa';

// Componente otimizado para entrada de mensagens
const MessageInput = React.memo(({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Digite sua mensagem...",
  maxLength = 1000
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Função otimizada para enviar mensagem
  const handleSendMessage = useCallback(() => {
    if (!message.trim() || disabled) return;
    
    const trimmedMessage = message.trim();
    onSendMessage(trimmedMessage);
    setMessage('');
    setIsTyping(false);
    
    // Resetar altura do textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, onSendMessage, disabled]);

  // Função otimizada para lidar com mudanças no input
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setMessage(value);
    
    // Indicar que está digitando
    setIsTyping(true);
    
    // Limpar timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Definir timeout para parar de digitar
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  }, []);

  // Função otimizada para lidar com teclas pressionadas
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Função otimizada para ajustar altura do textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 120; // Altura máxima em pixels
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  }, []);

  // Efeito para ajustar altura quando a mensagem muda
  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  // Cleanup do timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Calcular caracteres restantes
  const remainingChars = maxLength - message.length;
  const isNearLimit = remainingChars <= 50;
  const isAtLimit = remainingChars <= 0;

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      {/* Indicador de digitação */}
      {isTyping && (
        <div className="text-xs text-gray-500 mb-2 animate-pulse">
          Digitando...
        </div>
      )}
      
      {/* Área de entrada */}
      <div className="flex items-end gap-3">
        {/* Botão de anexo */}
        <button
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200 disabled:opacity-50"
          title="Anexar arquivo"
          disabled={disabled}
        >
          <FaPaperclip className="w-4 h-4" />
        </button>
        
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className={`
              w-full resize-none border border-gray-300 rounded-lg px-3 py-2
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${isAtLimit ? 'border-red-500' : isNearLimit ? 'border-yellow-500' : ''}
            `}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          
          {/* Contador de caracteres */}
          <div className={`absolute bottom-1 right-2 text-xs ${
            isAtLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-600' : 'text-gray-400'
          }`}>
            {remainingChars}
          </div>
        </div>
        
        {/* Botão de emoji */}
        <button
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200 disabled:opacity-50"
          title="Emojis"
          disabled={disabled}
        >
          <FaSmile className="w-4 h-4" />
        </button>
        
        {/* Botão de enviar */}
        <button
          onClick={handleSendMessage}
          disabled={!message.trim() || disabled}
          className={`
            p-3 rounded-full transition-all duration-200 transform hover:scale-105
            ${message.trim() && !disabled
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
          title="Enviar mensagem"
        >
          <FaPaperPlane className="w-4 h-4" />
        </button>
      </div>
      
      {/* Aviso de limite de caracteres */}
      {isNearLimit && !isAtLimit && (
        <div className="text-xs text-yellow-600 mt-2">
          Você está próximo do limite de caracteres
        </div>
      )}
      
      {isAtLimit && (
        <div className="text-xs text-red-600 mt-2">
          Limite de caracteres atingido
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Função de comparação personalizada para evitar re-renders desnecessários
  return (
    prevProps.disabled === nextProps.disabled &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.maxLength === nextProps.maxLength
  );
});

// Adicionar displayName para debugging
MessageInput.displayName = 'MessageInput';

export default MessageInput;
