import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Componente PricingPlans - Exibe planos disponíveis
 * Com lógica correta de cálculo da economia e logs de debug
 * COMPACTO: Elementos reduzidos para caber em todas as telas
 */
const PricingPlans = ({ 
  selectedPlan, 
  onPlanSelect, 
  selectedInterval, 
  onIntervalSelect 
}) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  // ✅ DEBUG: Log quando selectedPlan mudar
  useEffect(() => {
    console.log('🔍 PricingPlans: selectedPlan mudou:', selectedPlan);
  }, [selectedPlan]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/stripe/plans');
      
      if (response.data.success) {
        setPlans(response.data.data);
        console.log('✅ PricingPlans: Planos carregados:', response.data.data);
      } else {
        setError('Erro ao carregar planos');
      }
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
      setError('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-3"></div>
        <p className="text-cyan-200 text-sm font-medium">Carregando planos...</p>
        <p className="text-cyan-300/70 text-xs mt-1">Aguarde enquanto buscamos as melhores opções para você</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <div className="w-10 h-10 bg-red-500/20 border border-red-400/30 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-red-300 text-sm font-medium mb-3">{error}</p>
        <button 
          onClick={fetchPlans}
          className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg shadow-red-500/25 text-xs"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Seletor de intervalo - COMPACTO */}
      <div className="mb-4 text-center">
        <div className="inline-flex bg-cyan-900/30 rounded-lg p-1 border border-cyan-400/30">
          <button
            onClick={() => onIntervalSelect('monthly')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              selectedInterval === 'monthly'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                : 'text-cyan-200 hover:text-white hover:bg-cyan-800/50'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => onIntervalSelect('yearly')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              selectedInterval === 'yearly'
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-emerald-500/25'
                : 'text-cyan-200 hover:text-white hover:bg-emerald-800/50'
            }`}
          >
            Anual
            <span className="ml-1 text-xs text-emerald-400 font-semibold">-10%</span>
          </button>
        </div>
      </div>

      {/* Grid de planos - COMPACTO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {(() => {
          // Reordenar planos: Básico -> Pro -> Premium
          const orderedPlans = plans.sort((a, b) => {
            const order = { 'basic': 1, 'pro': 2, 'premium': 3 };
            const aOrder = order[a.metadata?.plan_type?.toLowerCase()] || 999;
            const bOrder = order[b.metadata?.plan_type?.toLowerCase()] || 999;
            return aOrder - bOrder;
          });

          return orderedPlans.map((plan) => {
            // ✅ CORREÇÃO: Mapear monthly/yearly para month/year do Stripe
            const stripeInterval = selectedInterval === 'monthly' ? 'month' : 'year';
            const price = plan.prices.find(p => p.interval === stripeInterval);
            
            if (!price) {
              console.warn('⚠️ PricingPlans: Preço não encontrado para intervalo:', {
                selectedInterval,
                stripeInterval,
                availableIntervals: plan.prices.map(p => p.interval),
                planName: plan.name
              });
              return null;
            }

            // ✅ DEBUG: Log para cada plano renderizado
            const planType = plan.metadata?.plan_type || plan.name.toLowerCase();
            const isSelected = selectedPlan === planType;
            
            console.log('🔍 PricingPlans: Renderizando plano:', {
              planName: plan.name,
              planType: planType,
              metadata: plan.metadata,
              selectedPlan: selectedPlan,
              isSelected: isSelected,
              selectedInterval,
              stripeInterval,
              price: price
            });

            return (
              <div
                key={plan.id}
                onClick={() => {
                  const planType = plan.metadata?.plan_type || plan.name.toLowerCase();
                  console.log('🔄 PricingPlans: Plano clicado:', {
                    planName: plan.name,
                    planType: planType,
                    metadata: plan.metadata,
                    currentSelected: selectedPlan
                  });
                  onPlanSelect(planType);
                }}
                className={`
                  relative p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all duration-300
                  ${isSelected
                    ? 'border-cyan-400 bg-gradient-to-br from-cyan-950/50 to-blue-950/50 shadow-xl shadow-cyan-500/20'
                    : 'border-cyan-400/30 bg-gradient-to-br from-slate-900/80 to-slate-800/80 hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-500/10'
                  }
                `}
              >
                {/* Plano mais popular - COMPACTO */}
                {plan.metadata?.plan_type === 'pro' && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg shadow-cyan-500/50">
                      Mais Popular
                    </span>
                  </div>
                )}

                {/* Plano Premium - Conversão Máxima - COMPACTO */}
                {plan.metadata?.plan_type === 'premium' && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg shadow-emerald-500/50">
                      Conversão Máxima
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-sm sm:text-base font-bold text-white mb-2">
                    {plan.name}
                  </h3>
                  
                  <div className="mb-3 sm:mb-4">
                    {selectedInterval === 'monthly' ? (
                      // Exibição para plano mensal - COMPACTO
                      <div className="text-center">
                        <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-cyan-300">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: price.currency || 'BRL'
                          }).format(price.unit_amount / 100)}
                        </span>
                        <span className="text-cyan-200 text-xs sm:text-sm">/mês</span>
                      </div>
                    ) : (
                      // Exibição para plano anual - COMPACTO
                      <div className="text-center">
                        {/* Preço anual principal */}
                        <div className="mb-1 sm:mb-2">
                          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-400">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: price.currency || 'BRL'
                            }).format(price.unit_amount / 100)}
                          </span>
                          <span className="text-emerald-300 text-xs sm:text-sm">/ano</span>
                        </div>
                        
                        {/* Comparação com preço mensal */}
                        {(() => {
                          const monthlyPrice = plan.prices.find(p => p.interval === 'month');
                          if (monthlyPrice) {
                            // LÓGICA CORRETA: Calcular economia anual
                            const monthlyPriceValue = monthlyPrice.unit_amount;
                            const yearlyPriceValue = price.unit_amount; // Preço anual total
                            const monthlySavings = monthlyPriceValue - yearlyPriceValue;
                            const yearlySavings = monthlySavings * 12;
                            
                            // Formatar economia
                            const savingsFormatted = new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(yearlySavings / 100);
                            
                            return (
                              <div className="space-y-1 sm:space-y-2">
                                {/* Preço mensal riscado */}
                                <div className="text-center">
                                                                      <span className="text-xs sm:text-sm text-slate-400 line-through">
                                      {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: monthlyPrice.currency || 'BRL'
                                      }).format(monthlyPrice.unit_amount / 100)}/mês
                                    </span>
                                </div>
                                
                                {/* Economia */}
                                <div className="text-center">
                                  <span className="inline-flex items-center px-2 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-lg text-emerald-300 text-xs font-medium">
                                    💰 Economize {savingsFormatted}/ano
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Free trial - COMPACTO */}
                  <div className="mb-3 sm:mb-4">
                    <span className="inline-flex items-center px-2 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-lg text-emerald-300 text-xs font-medium">
                      🆓 7 dias de free trial
                    </span>
                  </div>

                  {/* Descrição - COMPACTO */}
                  {plan.description && (
                    <p className="text-xs text-cyan-200 mb-3 sm:mb-4">
                      {plan.description}
                    </p>
                  )}

                  {/* Botão de seleção - COMPACTO */}
                  <button
                    className={`
                      w-full py-2 px-3 sm:px-4 rounded-lg text-xs font-semibold transition-all duration-200
                      ${isSelected
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/50 hover:from-cyan-600 hover:to-blue-700'
                        : 'bg-slate-700/50 text-cyan-200 border border-cyan-400/30 hover:bg-slate-700/80 hover:border-cyan-400/60'
                      }
                    `}
                  >
                    {isSelected ? '✓ Selecionado' : 'Selecionar'}
                  </button>
                </div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
};

export default PricingPlans; 