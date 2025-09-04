import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FaPaperPlane, FaSmile, FaPaperclip, FaMicrophone } from 'react-icons/fa';
import { IoSend } from 'react-icons/io5';
import MediaUpload from './MediaUpload';

/**
 * Componente otimizado para entrada de mensagens
 * Simplificado e focado na experiência do usuário
 */
const MessageInputOptimized = React.memo(({ 
  onSendMessage, 
  onSendMedia,
  disabled = false, 
  placeholder = "Digite sua mensagem...",
  maxLength = 1000,
  showEmojiButton = true,
  showAttachmentButton = true,
  showVoiceButton = true
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const sendTimeoutRef = useRef(null);

  // Função otimizada para enviar mensagem
  const handleSendMessage = useCallback(() => {
    if (!message.trim() || disabled) return;
    
    const trimmedMessage = message.trim();
    
    // Prevenir múltiplos envios
    if (sendTimeoutRef.current) return;
    
    sendTimeoutRef.current = setTimeout(() => {
      onSendMessage(trimmedMessage);
      setMessage('');
      setIsTyping(false);
      
      // Resetar altura do textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      sendTimeoutRef.current = null;
    }, 100);
  }, [message, onSendMessage, disabled]);

  // Função otimizada para lidar com mudanças no input
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    
    // Verificar limite de caracteres
    if (value.length > maxLength) return;
    
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
  }, [maxLength]);

  // Função otimizada para lidar com teclas pressionadas
  const handleKeyDown = useCallback((e) => {
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

  // Cleanup dos timeouts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
      }
    };
  }, []);

  // Calcular caracteres restantes
  const remainingChars = maxLength - message.length;
  const isNearLimit = remainingChars <= 50;
  const isAtLimit = remainingChars <= 0;

  // Função para lidar com upload de mídia
  const handleMediaUpload = useCallback(async (mediaData) => {
    if (onSendMedia) {
      try {
        await onSendMedia(mediaData);
        setShowMediaUpload(false);
      } catch (error) {
        console.error('Erro ao enviar mídia:', error);
      }
    }
  }, [onSendMedia]);

  // Função para cancelar upload de mídia
  const handleCancelMediaUpload = useCallback(() => {
    setShowMediaUpload(false);
  }, []);

  // Função para alternar upload de mídia
  const toggleMediaUpload = useCallback(() => {
    setShowMediaUpload(!showMediaUpload);
  }, [showMediaUpload]);

  // Determinar se pode enviar
  const canSend = message.trim().length > 0 && !disabled;

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
        {showAttachmentButton && (
          <button
            onClick={toggleMediaUpload}
            className={`p-2 rounded-full transition-colors duration-200 disabled:opacity-50 ${
              showMediaUpload 
                ? 'text-blue-500 bg-blue-100' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="Anexar arquivo"
            disabled={disabled}
          >
            <FaPaperclip className="w-4 h-4" />
          </button>
        )}
        
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className={`
              w-full resize-none border rounded-lg px-3 py-2
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
              transition-all duration-200
              ${isFocused ? 'border-blue-500' : 'border-gray-300'}
              ${isAtLimit ? 'border-red-500' : isNearLimit ? 'border-yellow-500' : ''}
            `}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          
          {/* Contador de caracteres */}
          {isNearLimit && (
            <div className={`absolute bottom-1 right-2 text-xs ${
              isAtLimit ? 'text-red-500' : 'text-yellow-600'
            }`}>
              {remainingChars}
            </div>
          )}
        </div>
        
        {/* Botão de emoji */}
        {showEmojiButton && (
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200 disabled:opacity-50"
            title="Emojis"
            disabled={disabled}
          >
            <FaSmile className="w-4 h-4" />
          </button>
        )}
        
        {/* Botão de enviar ou gravação */}
        {canSend ? (
          <button
            onClick={handleSendMessage}
            disabled={disabled}
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            title="Enviar mensagem"
          >
            <IoSend className="w-4 h-4" />
          </button>
        ) : showVoiceButton ? (
          <button
            className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200 disabled:opacity-50"
            title="Gravar áudio"
            disabled={disabled}
          >
            <FaMicrophone className="w-4 h-4" />
          </button>
        ) : null}
      </div>
      
      {/* Avisos de limite */}
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
      
      {/* Upload de mídia */}
      {showMediaUpload && (
        <div className="mt-4">
          <MediaUpload
            onUpload={handleMediaUpload}
            onCancel={handleCancelMediaUpload}
            maxFileSize={10 * 1024 * 1024} // 10MB
            acceptedTypes={['image/*', 'video/*', 'application/pdf']}
          />
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Função de comparação personalizada para evitar re-renders desnecessários
  return (
    prevProps.disabled === nextProps.disabled &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.maxLength === nextProps.maxLength &&
    prevProps.showEmojiButton === nextProps.showEmojiButton &&
    prevProps.showAttachmentButton === nextProps.showAttachmentButton &&
    prevProps.showVoiceButton === nextProps.showVoiceButton
  );
});

// Adicionar displayName para debugging
MessageInputOptimized.displayName = 'MessageInputOptimized';

export default MessageInputOptimized;
