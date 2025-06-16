import React, { useState, useEffect } from 'react';
import { Check, Zap, Crown, Star } from 'lucide-react';
import api from '../utils/api.js';

const PricingPlans = ({ onPlanSelect, selectedPlan }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/api/stripe/plans');
      setPlans(response.data.data);
    } catch (err) {
      setError('Erro ao carregar planos');
      console.error('Erro ao buscar planos:', err);
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

  return (
    <div className="py-2">
      <div className="max-w-5xl mx-auto px-2 sm:px-4">
        <div className="text-center mb-2">
          <h2 className="text-lg font-bold text-white bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500 text-transparent bg-clip-text drop-shadow-neon">
            Escolha o Plano Ideal
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-4xl mx-auto px-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white/10 rounded-lg shadow-xl backdrop-blur-lg p-3 transition-all duration-300 cursor-pointer border-2 card-futuristic min-h-[280px] flex flex-col overflow-visible ${
                selectedPlan === plan.id
                  ? 'border-cyan-400 ring-1 ring-cyan-400/50 shadow-cyan-500/25'
                  : getPlanColor(plan.id)
              }`}
              onClick={() => onPlanSelect(plan.id)}
            >
              {getPlanBadge(plan.id)}
              
              <div className="text-center mb-2">
                <div className="flex justify-center mb-1">
                  <div className="w-6 h-6">
                    {React.cloneElement(getPlanIcon(plan.id), { className: "w-6 h-6 text-cyan-400" })}
                  </div>
                </div>
                <h3 className="text-base font-bold text-white">{plan.name}</h3>
                <div className="mt-1">
                  <span className="text-xl font-bold text-white">
                    {plan.priceFormatted}
                  </span>
                  <span className="text-cyan-200 ml-1 text-xs">/mês</span>
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
                    selectedPlan === plan.id
                      ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white hover:from-cyan-600 hover:to-emerald-600 shadow-lg shadow-cyan-500/25'
                      : 'bg-white/20 text-white hover:bg-white/30 border border-cyan-400/30'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlanSelect(plan.id);
                  }}
                >
                  {selectedPlan === plan.id ? 'Selecionado' : 'Selecionar'}
                </button>
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