import React, { memo, useState, useCallback, useRef } from 'react';
import { FaImage, FaVideo, FaFile, FaUpload, FaTimes, FaCheck } from 'react-icons/fa';

/**
 * Componente para upload de mídia
 */
const MediaUpload = memo(({ 
  onUpload, 
  onCancel, 
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['image/*', 'video/*', 'application/pdf'],
  className = '' 
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Função para validar arquivo
  const validateFile = useCallback((file) => {
    // Verificar tamanho
    if (file.size > maxFileSize) {
      return { valid: false, error: `Arquivo muito grande. Máximo: ${Math.round(maxFileSize / 1024 / 1024)}MB` };
    }

    // Verificar tipo
    const isValidType = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isValidType) {
      return { valid: false, error: 'Tipo de arquivo não suportado' };
    }

    return { valid: true };
  }, [maxFileSize, acceptedTypes]);

  // Função para criar preview
  const createPreview = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview({
        url: e.target.result,
        type: file.type,
        name: file.name,
        size: file.size
      });
    };
    reader.readAsDataURL(file);
  }, []);

  // Função para lidar com seleção de arquivo
  const handleFileSelect = useCallback((file) => {
    setError(null);
    
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    createPreview(file);
  }, [validateFile, createPreview]);

  // Função para lidar com drag over
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  // Função para lidar com drag leave
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  // Função para lidar com drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Função para lidar com clique no input
  const handleInputClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Função para lidar com mudança no input
  const handleInputChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Função para lidar com upload
  const handleUpload = useCallback(async () => {
    if (!preview) return;

    setUploading(true);
    try {
      await onUpload(preview);
      setPreview(null);
      setError(null);
    } catch (error) {
      setError('Erro ao fazer upload do arquivo');
      console.error('Erro no upload:', error);
    } finally {
      setUploading(false);
    }
  }, [preview, onUpload]);

  // Função para cancelar
  const handleCancel = useCallback(() => {
    setPreview(null);
    setError(null);
    onCancel?.();
  }, [onCancel]);

  // Função para formatar tamanho do arquivo
  const formatFileSize = useCallback((bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }, []);

  // Função para obter ícone baseado no tipo
  const getFileIcon = useCallback((type) => {
    if (type.startsWith('image/')) return <FaImage className="w-8 h-8 text-blue-500" />;
    if (type.startsWith('video/')) return <FaVideo className="w-8 h-8 text-red-500" />;
    return <FaFile className="w-8 h-8 text-gray-500" />;
  }, []);

  // Renderizar preview
  const renderPreview = () => {
    if (!preview) return null;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center space-x-3">
          {getFileIcon(preview.type)}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{preview.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(preview.size)}</p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
        
        {preview.type.startsWith('image/') && (
          <div className="mt-3">
            <img
              src={preview.url}
              alt="Preview"
              className="max-w-full h-32 object-cover rounded"
            />
          </div>
        )}
        
        <div className="mt-3 flex space-x-2">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <FaUpload className="w-4 h-4" />
            )}
            <span>{uploading ? 'Enviando...' : 'Enviar'}</span>
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`media-upload ${className}`}>
      {/* Zona de drop */}
      <div
        ref={dropZoneRef}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleInputClick}
      >
        <div className="space-y-2">
          <FaUpload className="w-8 h-8 text-gray-400 mx-auto" />
          <p className="text-sm text-gray-600">
            Arraste arquivos aqui ou clique para selecionar
          </p>
          <p className="text-xs text-gray-500">
            Imagens, vídeos e documentos (máx. {Math.round(maxFileSize / 1024 / 1024)}MB)
          </p>
        </div>
      </div>

      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Erro */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Preview */}
      {renderPreview()}
    </div>
  );
});

MediaUpload.displayName = 'MediaUpload';

export default MediaUpload;
