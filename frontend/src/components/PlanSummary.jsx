import React from 'react';

/**
 * Componente PlanSummary - Resumo da compra
 * Conforme especificado no STRIPE_INTEGRATION_PLAN.md
 * COMPACTO: Ajustado para ocupar menos espaço vertical
 */
const PlanSummary = ({ plan, className }) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="border border-slate-600 rounded-lg p-3 sm:p-4 bg-slate-700/50">
        <h3 className="text-base sm:text-lg font-semibold text-slate-100 mb-2 sm:mb-3">
          Resumo do Plano
        </h3>
        
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 text-sm sm:text-base">Plano:</span>
            <span className="text-white font-medium text-sm sm:text-base">{plan.name}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-300 text-sm sm:text-base">Intervalo:</span>
            <span className="text-white font-medium text-sm sm:text-base capitalize">
              {plan.interval === 'monthly' ? 'Mensal' : 'Anual'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-300 text-sm sm:text-base">Preço:</span>
            <span className="text-cyan-300 font-bold text-sm sm:text-base">
              {plan.formattedPrice || (plan.price ? `R$ ${(plan.price / 100).toFixed(2)}` : 'R$ 0,00')}
            </span>
          </div>
          
          {plan.interval === 'yearly' && (
            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-sm sm:text-base">Economia:</span>
              <span className="text-emerald-400 font-medium text-sm sm:text-base">
                -20% vs mensal
              </span>
            </div>
          )}
        </div>
        
        <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-slate-600">
          <div className="flex items-center text-xs sm:text-sm text-slate-400">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Pagamento seguro com Stripe
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanSummary;
