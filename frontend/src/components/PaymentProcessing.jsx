import React from 'react';

/**
 * Componente PaymentProcessing - Estados de Loading e Processamento
 * Conforme especificado no STRIPE_INTEGRATION_PLAN.md
 * COMPACTO: Ajustado para ocupar menos espaço vertical
 */
const PaymentProcessing = ({ isProcessing, message }) => {
  if (!isProcessing) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-4 sm:p-6 text-center border border-slate-600 shadow-xl max-w-sm mx-4">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-cyan-400 mx-auto mb-3 sm:mb-4"></div>
        <p className="text-slate-200 text-base sm:text-lg font-medium">{message || 'Processando pagamento...'}</p>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 sm:mt-2">Não feche esta página</p>
      </div>
    </div>
  );
};

export default PaymentProcessing;
