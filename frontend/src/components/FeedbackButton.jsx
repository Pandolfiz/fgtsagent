import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { FaLightbulb, FaTimes, FaBug, FaRocket } from 'react-icons/fa';

const FeedbackButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!category || !message.trim()) {
      alert('Por favor, selecione uma categoria e descreva sua solicitação.');
      return;
    }

    if (message.trim().length < 10) {
      alert('Por favor, forneça uma descrição mais detalhada (mínimo 10 caracteres).');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          message: message.trim(),
          url: window.location.href,
          user_agent: navigator.userAgent
        }),
      });

      if (response.ok) {
        alert('Obrigado pelo seu feedback! Nossa equipe analisará sua solicitação.');
        setCategory('');
        setMessage('');
        setIsOpen(false);
      } else {
        throw new Error('Erro ao enviar feedback');
      }
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      alert('Erro ao enviar feedback. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setCategory('');
      setMessage('');
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Botão fixo na extremidade inferior direita */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-1 right-1 z-40 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white p-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
        title="Enviar feedback ou reportar bug"
      >
        <FaLightbulb className="w-4 h-4" />
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          Feedback & Bugs
        </div>
      </button>

      {/* Modal */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={handleClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gradient-to-b from-gray-900 to-gray-800 border border-gray-700 p-6 text-left align-middle shadow-2xl transition-all backdrop-blur-xl">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg">
                        <FaLightbulb className="w-6 h-6 text-white" />
                      </div>
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-semibold leading-6 text-white"
                      >
                        Feedback & Bugs
                      </Dialog.Title>
                    </div>
                    <button
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
                    >
                      <FaTimes className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    {/* Seleção de categoria */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Tipo de solicitação
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setCategory('feature')}
                          className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                            category === 'feature'
                              ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                              : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                          }`}
                        >
                          <FaRocket className="w-5 h-5 mx-auto mb-1" />
                          <span className="text-sm font-medium">Nova Funcionalidade</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategory('bug')}
                          className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                            category === 'bug'
                              ? 'border-red-500 bg-red-500/10 text-red-400'
                              : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                          }`}
                        >
                          <FaBug className="w-5 h-5 mx-auto mb-1" />
                          <span className="text-sm font-medium">Reportar Bug</span>
                        </button>
                      </div>
                    </div>

                    {/* Campo de mensagem */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Descrição {category === 'feature' ? 'da funcionalidade' : 'do problema'}
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={
                          category === 'feature'
                            ? 'Descreva a funcionalidade que gostaria de ver implementada...'
                            : 'Descreva o problema que encontrou e como reproduzi-lo...'
                        }
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                        rows={4}
                        maxLength={1000}
                        disabled={isSubmitting}
                      />
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-400">
                          Mínimo 10 caracteres
                        </span>
                        <span className="text-xs text-gray-400">
                          {message.length}/1000
                        </span>
                      </div>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !category || message.trim().length < 10}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Enviando...' : 'Enviar'}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default FeedbackButton;
