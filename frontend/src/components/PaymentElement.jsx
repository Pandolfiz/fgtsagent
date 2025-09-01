import React from 'react';
import { PaymentElement } from '@stripe/react-stripe-js';

/**
 * Componente PaymentElement - Interface moderna de pagamento Stripe (2025)
 * Substitui o CardElement deprecado
 * Conforme especificado no STRIPE_INTEGRATION_PLAN.md
 */
const PaymentElementComponent = ({ 
  options = {}, 
  clientSecret,
  onCardChange,
  className = ''
}) => {
  // ✅ ESTADOS: Para controle do componente
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [isComplete, setIsComplete] = React.useState(false);

  // ✅ FUNÇÃO: Manipular mudanças no PaymentElement
  const handleChange = React.useCallback((event) => {
    console.log('🔄 PaymentElement: Mudança detectada:', event);
    
    if (event.error) {
      setError(event.error.message);
      setIsComplete(false);
    } else {
      setError(null);
      setIsComplete(event.complete);
    }
    
    // ✅ CALLBACK: Notificar componente pai sobre mudanças
    if (onCardChange) {
      onCardChange(event);
    }
  }, [onCardChange]);

  // ✅ FUNÇÃO: Resetar estados
  React.useEffect(() => {
    if (clientSecret) {
      setLoading(false);
      setError(null);
      setIsComplete(false);
    }
  }, [clientSecret]);

  // Se não há clientSecret, mostrar mensagem de carregamento
  if (!clientSecret) {
    return (
      <div className={`w-full ${className}`}>
        <div className="mb-2 sm:mb-3">
          <h3 className="text-base sm:text-lg font-semibold text-slate-100 mb-1 sm:mb-2">
            Dados de Pagamento
          </h3>
          <p className="text-slate-400 text-xs sm:text-sm">
            Carregando configuração de pagamento...
          </p>
        </div>
        
        <div className="border border-slate-600 rounded-xl p-3 sm:p-4 bg-slate-700/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-cyan-400"></div>
          <span className="ml-2 sm:ml-3 text-slate-400 text-xs sm:text-sm">Preparando pagamento...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-2 sm:mb-3">
        <h3 className="text-base sm:text-lg font-semibold text-slate-100 mb-1 sm:mb-2">
          Informações de Pagamento
        </h3>
        <p className="text-slate-400 text-xs sm:text-sm">
          Preencha os dados do seu cartão de crédito
        </p>
      </div>

      <div className="border border-slate-600 rounded-lg p-2 sm:p-3 bg-slate-700/50">
        <PaymentElement
          options={{
            layout: 'tabs',
            fields: {
              billingDetails: 'auto' // ✅ CORRIGIDO: Coletar automaticamente quando necessário
            },
            terms: {
              card: 'never', // 'auto' | 'never' | 'required'
              sepaDebit: 'never',
              usBankAccount: 'never'
            },
            // ✅ UPGRADE: Configurações específicas para 3DS
            paymentMethodOrder: ['card'],
            defaultValues: {
              billingDetails: {
                name: 'Nome do Titular',
                email: 'email@exemplo.com'
              }
            },
            // ✅ NOVO: Configurações específicas para 3DS
            wallets: {
              applePay: 'auto',
              googlePay: 'auto'
            }
          }}
          onChange={handleChange}
        />
      </div>

      {/* ✅ INDICADORES: Status de validação */}
      {error && (
        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-red-500/20 border border-red-400/30 rounded text-center">
          <p className="text-red-300 text-xs sm:text-sm">{error}</p>
        </div>
      )}

      {isComplete && !error && (
        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-green-500/20 border border-green-400/30 rounded text-center">
          <p className="text-green-300 text-xs sm:text-sm">✓ Dados de pagamento válidos</p>
        </div>
      )}
    </div>
  );
};

export default PaymentElementComponent;
