import React, { useState, useEffect } from 'react';
import { FaCoins } from 'react-icons/fa';

/**
 * Componente PricingPlans - Exibe planos disponíveis
 * Usando dados estáticos da Home.jsx para garantir consistência
 */
const PricingPlans = ({ 
  selectedPlan, 
  onPlanSelect, 
  selectedInterval, 
  onIntervalSelect 
}) => {
  // Dados estáticos do plano (mesmo da Home.jsx)
  const plans = [{
    id: 'premium',
    name: 'Premium',
    price: 'R$ 400,00',
    period: '/mês',
    annualPrice: 'R$ 360,00',
    annualPeriod: '/mês',
    annualBilling: 'Anual cobrado mensalmente',
    annualSavings: 'Economia de R$ 730,00/ano',
    description: 'Cobrança baseada em uso - ideal para todos os volumes fluxo de leads',
    variablePricing: {
      includedTokens: '8.000.000 tokens grátis/mês',
      additionalCost: 'Menos de R$1 por lead atendido',
      billingNote: 'Cobrança automática baseada no uso real'
    },
    stripeProductId: 'prod_T2SfTzFRqv8X2m',
    stripePriceId: 'price_1S6NkGH8jGtRbIKFsPlv2Sf8',
    annualPriceId: 'price_1S6NtsH8jGtRbIKFSbzxuKQk',
    features: [
      'Agente de IA para vendas de saque aniversário FGTS',
      '8.000.000 tokens grátis/mês',
      'Menos de R$1 por lead atendido',
      'API oficial Whatsapp para anúncios sem banimento',
      'API alternativas de Whatsapp para envio de mensagens',
      'Consulta de saldo, simulação de propostas e criação de propostas Ilimitadas',
      'WhatsApp + Web',
      'Disparo de mensagens em massa',
      'Dashboard avançados',
      'Tracking de leads por anúncio',
      'Integração V8 digital',
      'Muito mais barato que uma equipe de atendimento'
    ],
    icon: <FaCoins size={32} />,
    popular: true,
    premium: true,
    tokenBased: true,
    buttonText: 'Testar 7 diasgrátis com descontos'
  }];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ DEBUG: Log quando selectedPlan mudar
  useEffect(() => {
    console.log('🔍 PricingPlans: selectedPlan mudou:', selectedPlan);
  }, [selectedPlan]);

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-3"></div>
        <p className="text-cyan-200 text-sm font-medium">Carregando planos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-red-300 text-sm font-medium">Erro ao carregar planos</p>
          <p className="text-red-200 text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Seletor de intervalo */}
      <div className="mb-6 text-center">
        <div className="inline-flex bg-cyan-900/30 rounded-lg p-1 border border-cyan-400/30">
          <button
            onClick={() => onIntervalSelect('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              selectedInterval === 'monthly'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                : 'text-cyan-200 hover:text-white hover:bg-cyan-800/50'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => onIntervalSelect('yearly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              selectedInterval === 'yearly'
                ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/25'
                : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
            }`}
          >
            Anual -15%
          </button>
        </div>
      </div>

      {/* Card do plano */}
      <div className="flex justify-center">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          
          return (
            <div
              key={plan.id}
              className={`relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl border transition-all duration-300 cursor-pointer w-full max-w-md ${
                isSelected
                  ? 'border-cyan-400/60 bg-cyan-900/20 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-500/25'
                  : 'border-slate-600/40 hover:border-cyan-400/40'
              }`}
              onClick={() => onPlanSelect(plan.id)}
            >
              {/* Tags */}
              {plan.premium && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                    CONVERSÃO MÁXIMA
                  </span>
                </div>
              )}
              
              {plan.popular && selectedInterval === 'yearly' && (
                <div className="absolute -top-2 -right-3 z-10">
                  <span 
                    className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg whitespace-nowrap"
                    style={{ transform: 'rotate(30deg)' }}
                  >
                    Ganhe 2 meses grátis
                  </span>
                </div>
              )}

              <div className="p-6">
                {/* Ícone e nome */}
                <div className="text-center mb-4">
                  <div className="flex justify-center mb-3">
                    {plan.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {plan.name}
                  </h3>
                  
                  {/* Preços */}
                  <div className="mb-4">
                    {selectedInterval === 'monthly' ? (
                      <div className="text-center">
                        <span className="text-3xl font-bold text-cyan-300">
                          {plan.price}
                        </span>
                        <span className="text-cyan-200 text-lg ml-1">{plan.period}</span>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="mb-2">
                          <span className="text-lg text-white/50 line-through">
                            {plan.price}
                          </span>
                          <span className="text-white/40 text-sm ml-1">/mês</span>
                        </div>
                        <div className="mb-2">
                          <span className="text-3xl font-bold text-emerald-400">
                            {plan.annualPrice}
                          </span>
                          <span className="text-emerald-300 text-lg ml-1">{plan.annualPeriod}</span>
                        </div>
                        <div className="text-center">
                          <p className="text-white/70 text-xs mb-1">{plan.annualBilling}</p>
                          <p className="text-emerald-400 text-sm font-semibold">{plan.annualSavings}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Informações de cobrança variável */}
                  {plan.variablePricing && (
                    <div className="bg-white/5 rounded-lg p-3 border border-cyan-400/20 mb-4">
                      <div className="text-center">
                        <p className="text-cyan-300 text-sm font-semibold mb-1">
                          {plan.variablePricing.includedTokens}
                        </p>
                        <p className="text-white/80 text-xs">
                          {plan.variablePricing.additionalCost}
                        </p>
                        <p className="text-cyan-400 text-xs mt-1">
                          {plan.variablePricing.billingNote}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Descrição */}
                  <p className="text-slate-300 text-sm mb-4">
                    {plan.description}
                  </p>

                  {/* Features */}
                  <div className="space-y-2 mb-6 text-left">
                    {plan.features.slice(0, 6).map((feature, idx) => (
                      <div key={idx} className="flex items-center text-sm text-slate-300">
                        <svg className="w-4 h-4 text-cyan-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Botão de seleção */}
                  <button
                    className={`w-full py-3 px-4 rounded-lg font-bold transition-all duration-200 ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                        : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                    }`}
                  >
                    {isSelected ? 'Selecionado' : 'Selecionar'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PricingPlans;