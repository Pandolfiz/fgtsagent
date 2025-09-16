import React, { useState, useEffect } from 'react';
import { FaTimes, FaBug, FaLightbulb, FaPaperPlane, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const FeedbackModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    type: 'feature', // 'feature' ou 'bug'
    title: '',
    description: '',
    priority: 'medium' // 'low', 'medium', 'high'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success', 'error', null

  // Resetar formulário quando modal abre/fecha
  useEffect(() => {
    if (isOpen) {
      setFormData({
        type: 'feature',
        title: '',
        description: '',
        priority: 'medium'
      });
      setSubmitStatus(null);
    }
  }, [isOpen]);

  // Fechar modal com ESC
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSubmitStatus('success');
        // Fechar modal após 2 segundos
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-cyan-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              {formData.type === 'feature' ? (
                <FaLightbulb className="w-5 h-5 text-white" />
              ) : (
                <FaBug className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {formData.type === 'feature' ? 'Solicitar Nova Funcionalidade' : 'Reportar Bug'}
              </h2>
              <p className="text-sm text-gray-600">
                {formData.type === 'feature' 
                  ? 'Descreva a funcionalidade que você gostaria de ver implementada'
                  : 'Ajude-nos a melhorar reportando problemas encontrados'
                }
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200 disabled:opacity-50"
          >
            <FaTimes className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tipo de feedback */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Solicitação
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'feature' }))}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                  formData.type === 'feature'
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <FaLightbulb className="w-4 h-4" />
                <span className="font-medium">Nova Funcionalidade</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'bug' }))}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                  formData.type === 'bug'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <FaBug className="w-4 h-4" />
                <span className="font-medium">Reportar Bug</span>
              </button>
            </div>
          </div>

          {/* Prioridade (apenas para bugs) */}
          {formData.type === 'bug' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prioridade do Bug
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                required
              >
                <option value="low">Baixa - Não afeta o uso principal</option>
                <option value="medium">Média - Afeta algumas funcionalidades</option>
                <option value="high">Alta - Impede o uso da aplicação</option>
              </select>
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder={formData.type === 'feature' 
                ? "Ex: Adicionar filtros avançados no chat"
                : "Ex: Erro ao enviar mensagem no WhatsApp"
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              required
              maxLength={100}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição Detalhada *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder={formData.type === 'feature' 
                ? "Descreva detalhadamente a funcionalidade que você gostaria de ver implementada. Inclua:\n• Qual problema ela resolveria\n• Como você imagina que funcionaria\n• Exemplos de uso"
                : "Descreva o problema encontrado. Inclua:\n• Passos para reproduzir o bug\n• Comportamento esperado vs comportamento atual\n• Screenshots se possível\n• Navegador e versão utilizados"
              }
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
              required
              maxLength={2000}
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {formData.description.length}/2000 caracteres
            </div>
          </div>

          {/* Status de envio */}
          {submitStatus === 'success' && (
            <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <FaCheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700 font-medium">
                Feedback enviado com sucesso! Obrigado pela sua contribuição.
              </span>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <FaExclamationTriangle className="w-5 h-5 text-red-500" />
              <span className="text-red-700 font-medium">
                Erro ao enviar feedback. Tente novamente em alguns instantes.
              </span>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
              className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <FaPaperPlane className="w-4 h-4" />
                  <span>Enviar Feedback</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;