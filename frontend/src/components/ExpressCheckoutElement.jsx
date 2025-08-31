import React from 'react';
import { ExpressCheckoutElement } from '@stripe/react-stripe-js';

/**
 * Componente ExpressCheckoutElement - Botões de pagamento rápido Stripe
 * Inclui Apple Pay, Google Pay e outros métodos (quando disponíveis)
 */
const ExpressCheckoutComponent = ({ 
  options = {}, 
  onPaymentMethodSelected,
  className = ''
}) => {
  // Configuração padrão para Brasil
  const defaultOptions = {
    paymentMethodTypes: ['card'], // Link não disponível no Brasil
    layout: {
      maxColumns: 1, // Melhor para mobile
      maxRows: 2
    },
    buttonSpacing: '8px',
    buttonSize: 'large'
  };

  // Mesclar opções padrão com opções customizadas
  const mergedOptions = {
    ...defaultOptions,
    ...options
  };

  const handlePaymentMethodSelected = (event) => {
    console.log('💳 Método de pagamento selecionado:', event);
    onPaymentMethodSelected?.(event);
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-2 sm:mb-3">
        <h3 className="text-base sm:text-lg font-semibold text-slate-100 mb-1 sm:mb-2">
          Pagamento Rápido
        </h3>
        <p className="text-slate-400 text-xs sm:text-sm">
          Escolha uma opção de pagamento rápida e segura
        </p>
      </div>

      <div className="border border-slate-600 rounded-lg p-2 sm:p-3 bg-slate-700/50">
        <ExpressCheckoutElement 
          options={mergedOptions}
          onPaymentMethodSelected={handlePaymentMethodSelected}
        />
      </div>

      {/* Separador - OTIMIZADO */}
      <div className="relative my-3 sm:my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-600" />
        </div>
        <div className="relative flex justify-center text-xs sm:text-sm">
          <span className="px-2 sm:px-3 bg-slate-800 text-slate-400">ou</span>
        </div>
      </div>
    </div>
  );
};

export default ExpressCheckoutComponent;
