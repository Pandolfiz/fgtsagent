import React, { useEffect, useState } from 'react';
import { CheckCircle, Home, User, CreditCard } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar.jsx';
import axios from 'axios';

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      verifyPayment(sessionId);
    } else {
      setError('Sessão de pagamento não encontrada');
      setLoading(false);
    }
  }, [searchParams]);

  const verifyPayment = async (sessionId) => {
    try {
      const response = await axios.post('/api/stripe/verify-payment', {
        sessionId
      });
      
      setSubscriptionData(response.data);
    } catch (err) {
      console.error('Erro ao verificar pagamento:', err);
      setError('Erro ao verificar o pagamento. Entre em contato com o suporte.');
    } finally {
      setLoading(false);
    }
  };

  const getPlanDisplayName = (planType) => {
    switch (planType) {
      case 'basic':
        return 'Plano Básico';
      case 'pro':
        return 'Plano Pro';
      case 'premium':
        return 'Plano Premium';
      default:
        return planType;
    }
  };

  const getPlanPrice = (planType) => {
    switch (planType) {
      case 'basic':
        return 'R$ 90,00/mês (cobrado mensalmente com desconto anual) - Economia de R$ 120,00/ano';
      case 'pro':
        return 'R$ 274,99/mês (cobrado mensalmente com desconto anual) - Economia de R$ 300,00/ano';
      case 'premium':
        return 'R$ 449,99/mês (cobrado mensalmente com desconto anual) - Economia de R$ 600,00/ano';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <>
        <LandingNavbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando seu pagamento...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <LandingNavbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ops! Algo deu errado
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/support')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Contatar Suporte
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <LandingNavbar />
      <div className="min-h-screen bg-gray-50 py-12 pt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Pagamento Realizado com Sucesso!
          </h1>
          <p className="text-xl text-gray-600">
            Sua conta foi criada e seu plano está ativo
          </p>
        </div>

        {/* Subscription Details */}
        {subscriptionData && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <h2 className="text-xl font-semibold text-white">
                Detalhes da Assinatura
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Plano Selecionado</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-lg font-semibold text-gray-900">
                      {getPlanDisplayName(subscriptionData.planType)}
                    </p>
                    <p className="text-gray-600">
                      {getPlanPrice(subscriptionData.planType)}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Informações de Cobrança</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Próxima cobrança</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Próximos Passos
          </h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4 mt-1">
                <span className="text-blue-600 font-semibold text-sm">1</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  Verifique seu email
                </h3>
                <p className="text-gray-600">
                  Enviamos um email de confirmação com suas credenciais de acesso e links úteis.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4 mt-1">
                <span className="text-blue-600 font-semibold text-sm">2</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  Configure sua conta
                </h3>
                <p className="text-gray-600">
                  Complete seu perfil e configure suas preferências no painel de controle.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4 mt-1">
                <span className="text-blue-600 font-semibold text-sm">3</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  Comece a usar
                </h3>
                <p className="text-gray-600">
                  Explore todas as funcionalidades do seu plano e comece a gerenciar seu FGTS.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home className="w-5 h-5 mr-2" />
            Ir para Dashboard
          </button>
          
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <User className="w-5 h-5 mr-2" />
            Configurar Perfil
          </button>
          
          <button
            onClick={() => navigate('/support')}
            className="flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Central de Ajuda
          </button>
        </div>

        {/* Support Info */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-2">
            Precisa de ajuda? Nossa equipe está aqui para você.
          </p>
          <div className="flex justify-center space-x-6 text-sm">
            <a href="mailto:support@fgtsagent.com" className="text-blue-600 hover:underline">
              support@fgtsagent.com
            </a>
            <span className="text-gray-400">|</span>
            <a href="tel:+5511999999999" className="text-blue-600 hover:underline">
              (11) 99999-9999
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default CheckoutSuccess; 