import React, { useState, useEffect } from 'react';
import PaymentButton from '../components/PaymentButton.jsx';
import usePaymentModal from '../hooks/usePaymentModal.js';
import PaymentModal from '../components/PaymentModal.jsx';

const PaymentExample = () => {
  const [plans, setPlans] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ CARREGAR: Planos disponíveis
  useEffect(() => {
    const loadPlans = async () => {
      try {
        // Simular carregamento de planos
        const mockPlans = [
          {
            id: 'basic',
            name: 'Básico',
            price: 'R$ 29,90',
            interval: 'monthly',
            features: ['1 usuário', 'Suporte básico', '100 leads/mês']
          },
          {
            id: 'premium',
            name: 'Premium',
            price: 'R$ 59,90',
            interval: 'monthly',
            features: ['5 usuários', 'Suporte prioritário', '500 leads/mês']
          },
          {
            id: 'enterprise',
            name: 'Enterprise',
            price: 'R$ 99,90',
            interval: 'monthly',
            features: ['Usuários ilimitados', 'Suporte 24/7', 'Leads ilimitados']
          }
        ];
        
        setPlans(mockPlans);
        
        // Simular dados do usuário
        setUserData({
          id: 'user123',
          email: 'usuario@exemplo.com',
          firstName: 'João',
          lastName: 'Silva',
          fullName: 'João Silva'
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar planos:', error);
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  // ✅ RENDER: Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Escolha seu Plano
          </h1>
          <p className="text-xl text-cyan-200">
            Comece gratuitamente e atualize quando precisar
          </p>
        </div>

        {/* Planos */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-gray-800 border border-cyan-500/30 rounded-2xl p-6 hover:border-cyan-500/60 transition-all duration-300"
            >
              {/* Nome e Preço */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {plan.name}
                </h3>
                <div className="text-4xl font-bold text-cyan-400 mb-1">
                  {plan.price}
                </div>
                <div className="text-gray-400">por mês</div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-gray-300">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full mr-3"></div>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Botão de Pagamento */}
              <PaymentButton
                plan={plan}
                userData={userData}
                variant={plan.id === 'premium' ? 'primary' : 'secondary'}
                size="lg"
                className="w-full"
              >
                Assinar {plan.name}
              </PaymentButton>
            </div>
          ))}
        </div>

        {/* Informações Adicionais */}
        <div className="text-center text-gray-400">
          <p>
            Todos os planos incluem 7 dias de teste gratuito
          </p>
          <p className="mt-2">
            Cancele a qualquer momento sem compromisso
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentExample;
