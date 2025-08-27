import React, { useState, useEffect } from 'react';
import { Check, Zap, Crown, Star } from 'lucide-react';
import api from '../utils/api.js';

const PricingPlans = ({ onPlanSelect, selectedPlan, selectedInterval, onIntervalChange }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [internalInterval, setInternalInterval] = useState(selectedInterval || 'monthly'); // Usar prop ou padrão

  // ✅ HELPER: Extrair tipo do plano do nome
  const getPlanType = (planName) => {
    const lowerName = planName.toLowerCase();
    if (lowerName.includes('basic')) return 'basic';
    if (lowerName.includes('pro')) return 'pro';
    if (lowerName.includes('premium')) return 'premium';
    return 'basic'; // Padrão
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/stripe/plans');
      console.log('🔍 Resposta da API plans:', response.data);
      
      // ✅ VERIFICAÇÃO DE SEGURANÇA: Garantir que temos dados válidos
      const plansData = response.data?.data || response.data || [];
      
      if (!Array.isArray(plansData)) {
        console.error('❌ Dados de planos não são um array:', plansData);
        setError('Formato de dados inválido');
        setPlans([]);
        return;
      }
      
      setPlans(plansData);
      console.log('✅ Planos carregados:', plansData);
    } catch (err) {
      console.error('❌ Erro ao buscar planos:', err);
      setError('Erro ao carregar planos');
      setPlans([]); // Garantir que plans seja sempre um array
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (planId) => {
    switch (planId) {
      case 'basic':
        return <Zap className="w-8 h-8 text-cyan-400" />;
      case 'pro':
        return <Star className="w-8 h-8 text-emerald-400" />;
      case 'premium':
        return <Crown className="w-8 h-8 text-blue-400" />;
      default:
        return <Check className="w-8 h-8 text-cyan-400" />;
    }
  };

  const getPlanColor = (planId) => {
    switch (planId) {
      case 'basic':
        return 'border-cyan-400/30 hover:border-cyan-400/50';
      case 'pro':
        return 'border-emerald-400/30 hover:border-emerald-400/50';
      case 'premium':
        return 'border-blue-400/30 hover:border-blue-400/50';
      default:
        return 'border-cyan-400/30 hover:border-cyan-400/50';
    }
  };

  const getPlanBadge = (planId) => {
    switch (planId) {
      case 'pro':
        return (
          <div className="absolute -top-2 -right-2 w-24 h-24 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-semibold px-8 py-1 transform rotate-45 translate-x-6 translate-y-6 shadow-lg">
              Mais Popular
            </div>
          </div>
        );
      case 'premium':
        return (
          <div className="absolute -top-2 -right-2 w-24 h-24 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-semibold px-8 py-1 transform rotate-45 translate-x-6 translate-y-6 shadow-lg">
              Melhor Valor
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
        <span className="ml-2 text-cyan-200">Carregando planos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-300 mb-4">{error}</p>
        <button
          onClick={fetchPlans}
          className="bg-gradient-to-r from-cyan-500 to-emerald-500 text-white px-4 py-2 rounded-lg hover:from-cyan-600 hover:to-emerald-600 transition-all duration-300"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  // ✅ VERIFICAÇÃO DE SEGURANÇA: Garantir que plans seja sempre um array
  if (!plans || !Array.isArray(plans) || plans.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-yellow-300 mb-4">Nenhum plano disponível no momento</p>
        <button
          onClick={fetchPlans}
          className="bg-gradient-to-r from-cyan-500 to-emerald-500 text-white px-4 py-2 rounded-lg hover:from-cyan-600 hover:to-emerald-600 transition-all duration-300"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="max-w-5xl mx-auto px-2 sm:px-4">
        <div className="text-center mb-2">
          <h2 className="text-lg font-bold text-white bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500 text-transparent bg-clip-text drop-shadow-neon">
            Escolha o Plano Ideal
          </h2>
          
          {/* Seletor de Intervalo */}
          <div className="mt-3 flex justify-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-1 border border-cyan-400/30">
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setInternalInterval('monthly');
                    onIntervalChange && onIntervalChange('monthly');
                  }}
                  className={`px-4 py-1.5 text-xs rounded-md font-medium transition-all duration-300 ${
                    internalInterval === 'monthly'
                      ? 'bg-cyan-500 text-white shadow-md'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => {
                    setInternalInterval('annual');
                    onIntervalChange && onIntervalChange('annual');
                  }}
                  className={`px-4 py-1.5 text-xs rounded-md font-medium transition-all duration-300 ${
                    internalInterval === 'annual'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Anual
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-4xl mx-auto px-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white/10 rounded-lg shadow-xl backdrop-blur-lg p-3 transition-all duration-300 cursor-pointer border-2 card-futuristic min-h-[280px] flex flex-col overflow-visible ${
                selectedPlan === getPlanType(plan.name)
                  ? 'border-cyan-400 ring-1 ring-cyan-400/50 shadow-cyan-500/25'
                  : getPlanColor(plan.id)
              }`}
              onClick={() => onPlanSelect(getPlanType(plan.name))}
            >
              {getPlanBadge(plan.id)}

              <div className="text-center mb-2">
                <div className="flex justify-center mb-1">
                  <div className="w-6 h-6">
                    {React.cloneElement(getPlanIcon(plan.id), { className: "w-6 h-6 text-cyan-400" })}
                  </div>
                </div>
                <h3 className="text-base font-bold text-white">{plan.name}</h3>
                
                {/* Preços com contraste mensal vs anual */}
                <div className="mt-2">
                  {internalInterval === 'monthly' ? (
                    /* Preço mensal em destaque */
                    <div className="mb-1">
                      <span className="text-lg font-bold text-white">
                        {plan.prices.find(p => p.interval === 'month')?.amountFormatted || 'R$ 0,00'}
                      </span>
                      <span className="text-cyan-200 ml-1 text-xs">/mês</span>
                    </div>
                  ) : (
                    /* Preço anual em destaque */
                    <>
                      {/* Preço mensal riscado */}
                      <div className="mb-1">
                        <span className="text-sm text-white/50 line-through">
                          {plan.prices.find(p => p.interval === 'month')?.amountFormatted || 'R$ 0,00'}
                        </span>
                        <span className="text-white/40 text-xs ml-1">/mês</span>
                      </div>
                      
                      {/* Preço anual em destaque */}
                      <div className="mb-1">
                        <span className="text-lg font-bold text-white">
                          {plan.prices.find(p => p.interval === 'year')?.amountFormatted || 'R$ 0,00'}
                        </span>
                        <span className="text-cyan-200 ml-1 text-xs">/ano</span>
                      </div>
                    </>
                  )}
                  
                  {/* Informações do plano */}
                  <div className="text-center">
                    <p className="text-white/60 text-xs">
                      {selectedInterval === 'monthly' 
                        ? 'cobrado mensalmente' 
                        : 'cobrado anualmente com desconto'
                      }
                    </p>
                    {internalInterval === 'annual' && plan.prices.find(p => p.interval === 'year')?.discount && (
                      <p className="text-emerald-400 text-xs font-medium">
                        💰 {plan.prices.find(p => p.interval === 'year')?.discount} desconto
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1 mb-3 flex-grow">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <Check className="w-3 h-3 text-emerald-400 mt-0.5 mr-1.5 flex-shrink-0" />
                    <span className="text-cyan-200 text-xs leading-tight">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="text-center mt-auto">
                <button
                  className={`w-full py-1.5 px-2 text-xs rounded-md font-semibold transition-all duration-300 ${
                    selectedPlan === getPlanType(plan.name)
                      ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white hover:from-cyan-600 hover:to-emerald-600 shadow-lg shadow-cyan-500/25'
                      : 'bg-white/20 text-white hover:bg-white/30 border border-cyan-400/30'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlanSelect(getPlanType(plan.name));
                  }}
                >
                  {selectedPlan === getPlanType(plan.name) ? 'Selecionado' : 'Selecionar'}
                </button>
                
                {/* Indicador de economia anual */}
                <div className="mt-1 text-center">
                  {internalInterval === 'annual' ? (
                    <span className="text-emerald-400 text-xs">
                      💰 Economia anual
                    </span>
                  ) : (
                    <span className="text-cyan-300 text-xs">
                      ⚡ Sem compromisso
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-2">
          <div className="flex justify-center items-center space-x-3 text-xs text-cyan-300">
            <span className="flex items-center">
              <Check className="w-3 h-3 mr-0.5 text-emerald-400" />
              Teste 7 dias gratuitos
            </span>
            <span className="flex items-center">
              <Check className="w-3 h-3 mr-0.5 text-emerald-400" />
              Sem taxa de cancelamento
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPlans;