import React, { memo, useState, useCallback } from 'react';
import { FaDownload, FaPlay, FaPause, FaExpand, FaFile, FaImage, FaVideo } from 'react-icons/fa';

/**
 * Componente para exibir mensagens com mídia
 */
const MediaMessage = memo(({ message, onDownload, onPreview, className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const { mediaType, mediaUrl, fileName, fileSize, thumbnailUrl } = message.media || {};

  // Função para formatar tamanho do arquivo
  const formatFileSize = useCallback((bytes) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }, []);

  // Função para obter ícone baseado no tipo de mídia
  const getMediaIcon = useCallback((type) => {
    switch (type) {
      case 'image':
        return <FaImage className="w-4 h-4" />;
      case 'video':
        return <FaVideo className="w-4 h-4" />;
      default:
        return <FaFile className="w-4 h-4" />;
    }
  }, []);

  // Função para lidar com download
  const handleDownload = useCallback(async () => {
    if (!onDownload) return;
    
    setIsLoading(true);
    try {
      await onDownload(mediaUrl, fileName);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onDownload, mediaUrl, fileName]);

  // Função para lidar com preview
  const handlePreview = useCallback(() => {
    if (onPreview) {
      onPreview(mediaUrl, mediaType);
    }
  }, [onPreview, mediaUrl, mediaType]);

  // Função para alternar reprodução de vídeo
  const togglePlay = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Função para alternar expansão
  const toggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  // Renderizar imagem
  const renderImage = () => (
    <div className="relative group">
      <img
        src={mediaUrl}
        alt={fileName || 'Imagem'}
        className={`rounded-lg max-w-full h-auto cursor-pointer transition-transform ${
          isExpanded ? 'max-w-none' : 'max-w-sm'
        }`}
        onClick={handlePreview}
        onError={(e) => {
          e.target.src = '/placeholder-image.png';
        }}
      />
      
      {/* Overlay com controles */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="flex space-x-2">
          <button
            onClick={handlePreview}
            className="bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 rounded-full p-2 transition-all"
            title="Expandir imagem"
          >
            <FaExpand className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            disabled={isLoading}
            className="bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 rounded-full p-2 transition-all disabled:opacity-50"
            title="Baixar imagem"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-800"></div>
            ) : (
              <FaDownload className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Renderizar vídeo
  const renderVideo = () => (
    <div className="relative group">
      <video
        src={mediaUrl}
        poster={thumbnailUrl}
        className={`rounded-lg max-w-full h-auto ${
          isExpanded ? 'max-w-none' : 'max-w-sm'
        }`}
        controls={isPlaying}
        preload="metadata"
      />
      
      {/* Overlay com controles */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="flex space-x-2">
          <button
            onClick={togglePlay}
            className="bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 rounded-full p-2 transition-all"
            title={isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            {isPlaying ? <FaPause className="w-4 h-4" /> : <FaPlay className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDownload}
            disabled={isLoading}
            className="bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 rounded-full p-2 transition-all disabled:opacity-50"
            title="Baixar vídeo"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-800"></div>
            ) : (
              <FaDownload className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Renderizar arquivo genérico
  const renderFile = () => (
    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border">
      <div className="flex-shrink-0">
        {getMediaIcon(mediaType)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {fileName || 'Arquivo'}
        </p>
        {fileSize && (
          <p className="text-sm text-gray-500">
            {formatFileSize(fileSize)}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">
        <button
          onClick={handleDownload}
          disabled={isLoading}
          className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
          title="Baixar arquivo"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          ) : (
            <FaDownload className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );

  // Renderizar conteúdo baseado no tipo de mídia
  const renderMediaContent = () => {
    switch (mediaType) {
      case 'image':
        return renderImage();
      case 'video':
        return renderVideo();
      default:
        return renderFile();
    }
  };

  return (
    <div className={`media-message ${className}`}>
      {renderMediaContent()}
      
      {/* Informações adicionais */}
      {message.text && (
        <div className="mt-2 text-sm text-gray-700">
          {message.text}
        </div>
      )}
      
      {/* Timestamp */}
      {message.timestamp && (
        <div className="mt-1 text-xs text-gray-500">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
});

MediaMessage.displayName = 'MediaMessage';

export default MediaMessage;
