/**
 * Componente para mostrar aviso quando é necessário usar template da Meta API
 */
import React, { useState, useEffect } from 'react';
import { useMetaTemplateControl } from '../hooks/useMetaTemplateControl';
import { AlertTriangle, Clock, MessageSquare, CheckCircle } from 'lucide-react';

const MetaTemplateWarning = ({ 
  conversationId, 
  instanceId, 
  onTemplateSelect,
  className = '' 
}) => {
  const [sendStatus, setSendStatus] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const { checkSendStatus, getApprovedTemplates, loading, error } = useMetaTemplateControl();

  useEffect(() => {
    if (conversationId && instanceId) {
      checkStatus();
    }
  }, [conversationId, instanceId]);

  const checkStatus = async () => {
    const status = await checkSendStatus(conversationId, instanceId);
    setSendStatus(status);

    // Se precisa de template, buscar templates disponíveis
    if (status.requiresTemplate) {
      const availableTemplates = await getApprovedTemplates(instanceId);
      setTemplates(availableTemplates);
    }
  };

  const handleTemplateSelect = (template) => {
    if (onTemplateSelect) {
      onTemplateSelect(template);
    }
    setShowTemplates(false);
  };

  const formatTimeAgo = (hours) => {
    if (hours < 1) {
      return 'menos de 1 hora';
    } else if (hours < 24) {
      return `${Math.floor(hours)} horas`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days} dia${days > 1 ? 's' : ''}`;
    }
  };

  // Se não há props necessárias, não renderizar
  if (!conversationId || !instanceId) {
    return null;
  }

  if (loading) {
    return (
      <div className={`bg-cyan-900/20 border border-cyan-800/30 rounded-lg p-3 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-cyan-400"></div>
          <span className="text-cyan-300 text-xs">Verificando status de envio...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-900/20 border border-red-800/30 rounded-lg p-3 ${className}`}>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-3 w-3 text-red-400" />
          <span className="text-red-300 text-xs">Erro ao verificar status: {error}</span>
        </div>
      </div>
    );
  }

  if (!sendStatus) {
    return null;
  }

  // Se pode enviar mensagem livre, não mostrar aviso
  if (sendStatus.canSendFreeMessage) {
    return null;
  }

  // Se precisa de template, mostrar aviso
  if (sendStatus.requiresTemplate) {
    return (
      <div className={`bg-amber-900/20 border border-amber-800/30 rounded-lg p-3 ${className}`}>
        <div className="flex items-start space-x-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-amber-200 font-medium text-xs mb-1">
              Template Necessário
            </h4>
            <p className="text-amber-300 text-xs mb-2">
              Última mensagem há{' '}
              <span className="font-medium text-amber-200">
                {sendStatus.hoursSinceLastMessage ? 
                  formatTimeAgo(sendStatus.hoursSinceLastMessage) : 
                  'mais de 24 horas'
                }
              </span>
              . Use um template aprovado.
            </p>
            
            {sendStatus.lastUserMessage && (
              <div className="bg-amber-800/20 rounded p-2 mb-2">
                <div className="flex items-center space-x-2 text-xs text-amber-300">
                  <Clock className="h-3 w-3" />
                  <span>Última mensagem:</span>
                  <span className="font-medium text-amber-200">
                    {new Date(sendStatus.lastUserMessage.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="mt-1 text-xs text-amber-400">
                  "{sendStatus.lastUserMessage.content.substring(0, 60)}
                  {sendStatus.lastUserMessage.content.length > 60 ? '...' : ''}"
                </div>
              </div>
            )}

            {templates.length > 0 ? (
              <div>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="bg-amber-800/30 hover:bg-amber-800/50 text-amber-200 text-xs px-3 py-1.5 rounded-md transition-colors border border-amber-700/50"
                >
                  {showTemplates ? 'Ocultar' : 'Ver'} Templates ({templates.length})
                </button>

                {showTemplates && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-amber-300 font-medium">Templates Aprovados:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {templates.map((template) => (
                        <button
                          key={template.template_id}
                          onClick={() => handleTemplateSelect(template)}
                          className="w-full text-left bg-amber-800/20 border border-amber-700/30 rounded p-2 hover:bg-amber-800/30 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-medium text-amber-200">
                                {template.template_name}
                              </div>
                              <div className="text-xs text-amber-400">
                                {template.template_language} • {template.template_category}
                              </div>
                            </div>
                            <CheckCircle className="h-3 w-3 text-green-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-amber-800/20 rounded p-2">
                <div className="flex items-center space-x-2 text-xs text-amber-300">
                  <MessageSquare className="h-3 w-3" />
                  <span>Nenhum template aprovado encontrado.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MetaTemplateWarning;
