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
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Mais Popular
            </span>
          </div>
        );
      case 'premium':
        return (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Melhor Valor
            </span>
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
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white sm:text-4xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500 text-transparent bg-clip-text drop-shadow-neon">
            Escolha o Plano Ideal para Você
          </h2>
          <p className="mt-4 text-xl text-cyan-200">
            Gerencie seu FGTS com segurança e praticidade
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white/10 rounded-2xl shadow-2xl backdrop-blur-lg p-8 transition-all duration-300 cursor-pointer transform hover:scale-105 border-2 card-futuristic ${
                selectedPlan === plan.id
                  ? 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-cyan-500/25'
                  : getPlanColor(plan.id)
              }`}
              onClick={() => onPlanSelect(plan.id)}
            >
              {getPlanBadge(plan.id)}
              
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  {getPlanIcon(plan.id)}
                </div>
                <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-white">
                    {plan.priceFormatted}
                  </span>
                  <span className="text-cyan-200 ml-1">/mês</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <Check className="w-5 h-5 text-emerald-400 mt-0.5 mr-3 flex-shrink-0" />
                    <span className="text-cyan-200">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <button
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                    selectedPlan === plan.id
                      ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white hover:from-cyan-600 hover:to-emerald-600 shadow-lg shadow-cyan-500/25'
                      : 'bg-white/20 text-white hover:bg-white/30 border border-cyan-400/30'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlanSelect(plan.id);
                  }}
                >
                  {selectedPlan === plan.id ? 'Plano Selecionado' : 'Selecionar Plano'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-cyan-200 mb-4">
            Todos os planos incluem criptografia de ponta e suporte técnico
          </p>
          <div className="flex justify-center items-center space-x-4 text-sm text-cyan-300">
            <span className="flex items-center">
              <Check className="w-4 h-4 mr-1 text-emerald-400" />
              Cancelamento gratuito
            </span>
            <span className="flex items-center">
              <Check className="w-4 h-4 mr-1 text-emerald-400" />
              Sem taxa de instalação
            </span>
            <span className="flex items-center">
              <Check className="w-4 h-4 mr-1 text-emerald-400" />
              Garantia de 30 dias
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPlans; 