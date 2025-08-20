import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { FaExclamationTriangle, FaTimes, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  details?: string;
  metaCode?: number;
  metaSubcode?: number;
}

export function ErrorModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'error',
  details,
  metaCode,
  metaSubcode 
}: ErrorModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="w-6 h-6 text-green-400" />;
      case 'warning':
        return <FaExclamationTriangle className="w-6 h-6 text-yellow-400" />;
      case 'info':
        return <FaInfoCircle className="w-6 h-6 text-cyan-400" />;
      default:
        return <FaExclamationTriangle className="w-6 h-6 text-red-400" />;
    }
  };

  const getTitleColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-300';
      case 'warning':
        return 'text-yellow-300';
      case 'info':
        return 'text-cyan-300';
      default:
        return 'text-red-300';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-green-500/30';
      case 'warning':
        return 'border-yellow-500/30';
      case 'info':
        return 'border-cyan-500/30';
      default:
        return 'border-red-500/30';
    }
  };

  const getBgGradient = () => {
    switch (type) {
      case 'success':
        return 'from-green-900/90 to-emerald-900/90';
      case 'warning':
        return 'from-yellow-900/90 to-amber-900/90';
      case 'info':
        return 'from-cyan-900/90 to-blue-900/90';
      default:
        return 'from-red-900/90 to-pink-900/90';
    }
  };

  const getButtonGradient = () => {
    switch (type) {
      case 'success':
        return 'from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700';
      case 'warning':
        return 'from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700';
      case 'info':
        return 'from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700';
      default:
        return 'from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700';
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl bg-gradient-to-b ${getBgGradient()} border ${getBorderColor()} p-6 text-left align-middle shadow-2xl transition-all backdrop-blur-xl`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {getIcon()}
                    <Dialog.Title
                      as="h3"
                      className={`text-lg font-semibold leading-6 ${getTitleColor()}`}
                    >
                      {title || (type === 'error' ? 'Erro' : type === 'warning' ? 'Aviso' : type === 'info' ? 'Informação' : 'Sucesso')}
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-200 leading-relaxed">
                    {message}
                  </p>
                  
                  {(metaCode || metaSubcode) && (
                    <div className="mt-3 p-3 bg-black/20 rounded-lg border border-gray-600/30">
                      <p className="text-xs text-gray-300 font-mono">
                        Código Meta: {metaCode}{metaSubcode ? ` (${metaSubcode})` : ''}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className={`inline-flex justify-center rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r ${getButtonGradient()} shadow-lg hover:shadow-xl transform hover:scale-105`}
                    onClick={onClose}
                  >
                    OK
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 