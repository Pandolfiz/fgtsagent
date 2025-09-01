import React, { useState } from 'react';
import { FaPlus, FaTimes, FaSave, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessAccountId: string;
  onTemplateCreated: () => void;
}

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  text?: string;
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  buttons?: TemplateButton[];
}

interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'OTP' | 'MPM' | 'CATALOG' | 'FLOW' | 'VOICE_CALL' | 'APP';
  text: string;
  url?: string;
  phone_number?: string;
}

export function CreateTemplateModal({ isOpen, onClose, businessAccountId, onTemplateCreated }: CreateTemplateModalProps) {
  const [templateData, setTemplateData] = useState({
    name: '',
    category: 'UTILITY',
    language: 'pt_BR',
    parameter_format: 'POSITIONAL'
  });

  const [components, setComponents] = useState<TemplateComponent[]>([
    { type: 'BODY', text: '' }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Resetar formulário
  const resetForm = () => {
    setTemplateData({
      name: '',
      category: 'UTILITY',
      language: 'pt_BR',
      parameter_format: 'POSITIONAL'
    });
    setComponents([{ type: 'BODY', text: '' }]);
    setError(null);
    setSuccess(false);
  };

  // Fechar modal
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Adicionar componente
  const addComponent = (type: TemplateComponent['type']) => {
    const newComponent: TemplateComponent = { type };
    
    if (type === 'HEADER') {
      newComponent.format = 'TEXT';
      newComponent.text = '';
    } else if (type === 'BUTTONS') {
      newComponent.buttons = [
        { type: 'QUICK_REPLY', text: '' }
      ];
    }
    
    setComponents([...components, newComponent]);
  };

  // Remover componente
  const removeComponent = (index: number) => {
    if (components.length > 1) {
      setComponents(components.filter((_, i) => i !== index));
    }
  };

  // Atualizar componente
  const updateComponent = (index: number, updates: Partial<TemplateComponent>) => {
    const updatedComponents = [...components];
    updatedComponents[index] = { ...updatedComponents[index], ...updates };
    setComponents(updatedComponents);
  };

  // Atualizar botão
  const updateButton = (componentIndex: number, buttonIndex: number, updates: Partial<TemplateButton>) => {
    const updatedComponents = [...components];
    if (updatedComponents[componentIndex].buttons) {
      updatedComponents[componentIndex].buttons![buttonIndex] = {
        ...updatedComponents[componentIndex].buttons![buttonIndex],
        ...updates
      };
      setComponents(updatedComponents);
    }
  };

  // Adicionar botão
  const addButton = (componentIndex: number) => {
    const updatedComponents = [...components];
    if (updatedComponents[componentIndex].type === 'BUTTONS') {
      updatedComponents[componentIndex].buttons = [
        ...(updatedComponents[componentIndex].buttons || []),
        { type: 'QUICK_REPLY', text: '' }
      ];
      setComponents(updatedComponents);
    }
  };

  // Remover botão
  const removeButton = (componentIndex: number, buttonIndex: number) => {
    const updatedComponents = [...components];
    if (updatedComponents[componentIndex].buttons) {
      updatedComponents[componentIndex].buttons = updatedComponents[componentIndex].buttons!.filter((_, i) => i !== buttonIndex);
      setComponents(updatedComponents);
    }
  };

  // Validar formulário
  const validateForm = () => {
    if (!templateData.name.trim()) {
      setError('Nome do template é obrigatório');
      return false;
    }

    if (templateData.name.length > 512) {
      setError('Nome do template deve ter no máximo 512 caracteres');
      return false;
    }

    // Validar componentes
    const hasBody = components.some(comp => comp.type === 'BODY');
    if (!hasBody) {
      setError('Template deve ter pelo menos um componente BODY');
      return false;
    }

    for (let i = 0; i < components.length; i++) {
      const comp = components[i];
      
      if (comp.type === 'BODY' && !comp.text?.trim()) {
        setError(`Componente BODY ${i + 1}: Texto é obrigatório`);
        return false;
      }
      
      if (comp.type === 'HEADER' && comp.format === 'TEXT' && !comp.text?.trim()) {
        setError(`Componente HEADER ${i + 1}: Texto é obrigatório para formato TEXT`);
        return false;
      }
      
      if (comp.type === 'BUTTONS') {
        if (!comp.buttons || comp.buttons.length === 0) {
          setError(`Componente BUTTONS ${i + 1}: Deve ter pelo menos um botão`);
          return false;
        }
        
        for (let j = 0; j < comp.buttons.length; j++) {
          const btn = comp.buttons[j];
          if (!btn.text?.trim()) {
            setError(`Botão ${j + 1} do componente ${i + 1}: Texto é obrigatório`);
            return false;
          }
        }
      }
    }

    return true;
  };

  // Criar template
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/whatsapp-templates/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessAccountId,
          templateData: {
            ...templateData,
            components
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar template');
      }

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onTemplateCreated();
          handleClose();
        }, 2000);
      } else {
        throw new Error(data.error || 'Erro ao criar template');
      }

    } catch (error: any) {
      setError(error.message || 'Erro ao criar template');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl border border-cyan-800/30 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-cyan-800/30">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <FaPlus className="mr-2 text-cyan-400" />
              Criar Novo Template
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Dados básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-cyan-200 mb-2">
                Nome do Template *
              </label>
              <input
                type="text"
                value={templateData.name}
                onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-cyan-700/50 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-gray-800 text-white placeholder-gray-400"
                placeholder="Ex: confirmação_pedido"
                maxLength={512}
              />
              <p className="text-xs text-gray-400 mt-1">
                {templateData.name.length}/512 caracteres
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-cyan-200 mb-2">
                Categoria *
              </label>
              <select
                value={templateData.category}
                onChange={(e) => setTemplateData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-cyan-700/50 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-gray-800 text-white"
              >
                <option value="UTILITY">Utilitário</option>
                <option value="MARKETING">Marketing</option>
                <option value="AUTHENTICATION">Autenticação</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-cyan-200 mb-2">
                Idioma *
              </label>
              <select
                value={templateData.language}
                onChange={(e) => setTemplateData(prev => ({ ...prev, language: e.target.value }))}
                className="w-full px-3 py-2 border border-cyan-700/50 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-gray-800 text-white"
              >
                <option value="pt_BR">Português (BR)</option>
                <option value="en_US">Inglês (US)</option>
                <option value="es_ES">Espanhol (ES)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-cyan-200 mb-2">
                Formato de Parâmetros
              </label>
              <select
                value={templateData.parameter_format}
                onChange={(e) => setTemplateData(prev => ({ ...prev, parameter_format: e.target.value }))}
                className="w-full px-3 py-2 border border-cyan-700/50 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-gray-800 text-white"
              >
                <option value="POSITIONAL">Posicional (&#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125;)</option>
                <option value="NAMED">Nomeado (&#123;&#123;nome&#125;&#125;, &#123;&#123;valor&#125;&#125;)</option>
              </select>
            </div>
          </div>

          {/* Componentes */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Componentes do Template</h3>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => addComponent('HEADER')}
                  className="px-3 py-1 text-sm bg-cyan-600 hover:bg-cyan-700 text-white rounded border border-cyan-500 transition-colors"
                >
                  + Header
                </button>
                <button
                  type="button"
                  onClick={() => addComponent('FOOTER')}
                  className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded border border-purple-500 transition-colors"
                >
                  + Footer
                </button>
                <button
                  type="button"
                  onClick={() => addComponent('BUTTONS')}
                  className="px-3 py-1 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded border border-emerald-500 transition-colors"
                >
                  + Botões
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {components.map((component, index) => (
                <div key={index} className="border border-cyan-800/30 rounded-lg p-4 bg-gray-800/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        component.type === 'HEADER' ? 'bg-cyan-900/30 text-cyan-300 border border-cyan-700/50' :
                        component.type === 'BODY' ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-700/50' :
                        component.type === 'FOOTER' ? 'bg-purple-900/30 text-purple-300 border border-purple-700/50' :
                        'bg-orange-900/30 text-orange-300 border border-orange-700/50'
                      }`}>
                        {component.type}
                      </span>
                      
                      {component.type === 'HEADER' && (
                        <select
                          value={component.format || 'TEXT'}
                          onChange={(e) => updateComponent(index, { format: e.target.value as any })}
                          className="px-2 py-1 text-xs border border-cyan-700/50 rounded bg-gray-700 text-white"
                        >
                          <option value="TEXT">Texto</option>
                          <option value="IMAGE">Imagem</option>
                          <option value="VIDEO">Vídeo</option>
                          <option value="DOCUMENT">Documento</option>
                        </select>
                      )}
                    </div>
                    
                    {components.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeComponent(index)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <FaTimes className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Conteúdo do componente */}
                  {component.type === 'BODY' && (
                    <div>
                      <label className="block text-sm font-medium text-cyan-200 mb-2">
                        Texto da Mensagem *
                      </label>
                      <textarea
                        value={component.text || ''}
                        onChange={(e) => updateComponent(index, { text: e.target.value })}
                        className="w-full px-3 py-2 border border-cyan-700/50 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-gray-700 text-white placeholder-gray-400"
                        placeholder="Digite o texto da mensagem. Use &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125; para parâmetros."
                        rows={4}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Use &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125;, &#123;&#123;3&#125;&#125; para parâmetros dinâmicos
                      </p>
                    </div>
                  )}

                  {component.type === 'HEADER' && component.format === 'TEXT' && (
                    <div>
                      <label className="block text-sm font-medium text-cyan-200 mb-2">
                        Texto do Header
                      </label>
                      <input
                        type="text"
                        value={component.text || ''}
                        onChange={(e) => updateComponent(index, { text: e.target.value })}
                        className="w-full px-3 py-2 border border-cyan-700/50 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-gray-700 text-white placeholder-gray-400"
                        placeholder="Digite o texto do header"
                      />
                    </div>
                  )}

                  {component.type === 'FOOTER' && (
                    <div>
                      <label className="block text-sm font-medium text-cyan-200 mb-2">
                        Texto do Footer
                      </label>
                      <input
                        type="text"
                        value={component.text || ''}
                        onChange={(e) => updateComponent(index, { text: e.target.value })}
                        className="w-full px-3 py-2 border border-cyan-700/50 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-gray-700 text-white placeholder-gray-400"
                        placeholder="Digite o texto do footer"
                      />
                    </div>
                  )}

                  {component.type === 'BUTTONS' && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-cyan-200">
                          Botões
                        </label>
                        <button
                          type="button"
                          onClick={() => addButton(index)}
                          className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded border border-emerald-500 transition-colors"
                        >
                          + Botão
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        {(component.buttons || []).map((button, btnIndex) => (
                          <div key={btnIndex} className="flex items-center space-x-3 p-3 border border-emerald-700/50 rounded bg-gray-700/50">
                            <select
                              value={button.type}
                              onChange={(e) => updateButton(index, btnIndex, { type: e.target.value as any })}
                              className="px-2 py-1 text-xs border border-emerald-700/50 rounded bg-gray-600 text-white"
                            >
                              <option value="QUICK_REPLY">Resposta Rápida</option>
                              <option value="URL">Link</option>
                              <option value="PHONE_NUMBER">Telefone</option>
                              <option value="OTP">Código OTP</option>
                            </select>
                            
                            <input
                              type="text"
                              value={button.text}
                              onChange={(e) => updateButton(index, btnIndex, { text: e.target.value })}
                              className="flex-1 px-2 py-1 text-xs border border-emerald-700/50 rounded bg-gray-600 text-white placeholder-gray-400"
                              placeholder="Texto do botão"
                            />
                            
                            {(component.buttons || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeButton(index, btnIndex)}
                                className="text-red-400 hover:text-red-300 transition-colors"
                              >
                                <FaTimes className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mensagens de erro/sucesso */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-900/30 border border-red-700/50 rounded text-red-300">
              <FaExclamationTriangle />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 p-3 bg-emerald-900/30 border border-emerald-700/50 rounded text-emerald-300">
              <FaCheckCircle />
              <span>Template criado com sucesso! Redirecionando...</span>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-cyan-800/30">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md transition-colors"
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              disabled={loading || success}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 rounded-md shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Criando...
                </>
              ) : (
                <>
                  <FaSave className="mr-2" />
                  Criar Template
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
