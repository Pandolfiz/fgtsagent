import React, { useEffect, useState } from 'react';
import { CheckCircle, Home, User, CreditCard } from 'lucide-react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar.jsx';
import axios from 'axios';

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // ✅ NOVO FLUXO: Verificar se temos dados do PaymentIntent no state
    if (location.state?.paymentIntentId) {
      console.log('🔍 CheckoutSuccess: Dados recebidos do PaymentReturn:', location.state);
      
      // ✅ USAR DADOS DIRETOS: Do state em vez de fazer API call
      const paymentData = location.state;
      const formattedData = {
        planType: paymentData.planType || paymentData.metadata?.plan || 'basic',
        customerEmail: paymentData.customerEmail || paymentData.metadata?.customerEmail || 'usuario@exemplo.com',
        userName: paymentData.userName || paymentData.metadata?.userName || 'Usuário',
        amount: paymentData.amount || 1000,
        currency: paymentData.currency || 'brl',
        status: paymentData.status || 'succeeded',
        paymentIntentId: paymentData.paymentIntentId
      };
      
      console.log('✅ CheckoutSuccess: Dados formatados:', formattedData);
      setSubscriptionData(formattedData);
      setLoading(false);
      
    } else {
      // ✅ FALLBACK: Tentar buscar por session_id (para compatibilidade)
      const sessionId = searchParams.get('session_id');
      if (sessionId) {
        console.log('🔍 CheckoutSuccess: Verificando sessão:', sessionId);
        verifyPayment(sessionId);
      } else {
        console.error('❌ CheckoutSuccess: Nenhum dado de pagamento encontrado');
        setError('Dados de pagamento não encontrados');
        setLoading(false);
      }
    }
  }, [searchParams, location.state]);

  // ✅ MÉTODO LEGADO: Verificar sessão (para compatibilidade)
  const verifyPayment = async (sessionId) => {
    try {
      const response = await axios.post('/stripe/verify-payment', {
        sessionId
      });
      
      setSubscriptionData(response.data);
    } catch (err) {
      console.error('❌ Erro ao verificar pagamento:', err);
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
        return 'Plano Básico';
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
        return 'R$ 90,00/mês (cobrado mensalmente com desconto anual) - Economia de R$ 120,00/ano';
    }
  };

  if (loading) {
    return (
      <>
        <LandingNavbar />
        <div className="bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 min-h-screen">
          <div className="pt-20 pb-6 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400 mx-auto mb-3"></div>
              <p className="text-cyan-200 text-sm">Verificando seu pagamento...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <LandingNavbar />
        <div className="bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 min-h-screen">
          <div className="pt-20 pb-6 flex items-center justify-center">
            <div className="max-w-sm mx-auto bg-white/10 backdrop-blur-sm rounded-lg shadow-lg border border-cyan-800/30 p-4 text-center">
              <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-red-500/30">
                <CreditCard className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">
                Ops! Algo deu errado
              </h2>
              <p className="text-cyan-100 mb-3 text-sm">{error}</p>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/support')}
                  className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300 text-sm"
                >
                  Contatar Suporte
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-2 px-3 rounded-lg bg-white/10 text-cyan-200 border border-cyan-800/30 hover:bg-white/20 transition-colors text-sm"
                >
                  Voltar ao Início
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <LandingNavbar />
      <div className="bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 min-h-screen">
        <div className="pt-20 pb-6">
          <div className="max-w-lg mx-auto px-2 sm:px-3 lg:px-4">
            {/* Success Header - Mais compacto */}
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-cyan-200 to-blue-300 mb-2">
                Pagamento Realizado com Sucesso!
              </h1>
              <p className="text-cyan-100 text-sm">
                Sua conta foi criada e seu plano está ativo
              </p>
            </div>

            {/* Subscription Details - Mais compacto */}
            {subscriptionData && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg border border-cyan-800/30 mb-4 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-cyan-600 px-3 py-2">
                  <h2 className="text-base font-semibold text-white">
                    Detalhes da Assinatura
                  </h2>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <h3 className="font-medium text-white mb-1 text-xs">Plano Selecionado</h3>
                      <div className="bg-white/5 rounded-lg p-2 border border-cyan-800/20">
                        <p className="text-sm font-semibold text-white">
                          {getPlanDisplayName(subscriptionData.planType)}
                        </p>
                        <p className="text-cyan-100 text-xs">
                          {getPlanPrice(subscriptionData.planType)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-white mb-1 text-xs">Informações de Cobrança</h3>
                      <div className="bg-white/5 rounded-lg p-2 border border-cyan-800/20">
                        <p className="text-xs text-cyan-100">Próxima cobrança</p>
                        <p className="font-semibold text-white text-xs">
                          {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Next Steps - Mais compacto */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg border border-cyan-800/30 mb-4">
              <h2 className="text-sm font-semibold text-white mb-3 p-2 border-b border-cyan-800/30">
                Próximos Passos
              </h2>
              <div className="p-2 space-y-2">
                <div className="flex items-start">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center mr-2 mt-0 bg-gradient-to-r from-emerald-500 to-cyan-600">
                    <span className="text-white font-semibold text-xs">1</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-white text-xs">
                      Verifique seu email
                    </h3>
                    <p className="text-cyan-100 text-xs">
                      Enviamos um email de confirmação com suas credenciais de acesso e links úteis.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center mr-2 mt-0 bg-gradient-to-r from-emerald-500 to-cyan-600">
                    <span className="text-white font-semibold text-xs">2</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-white text-xs">
                      Configure sua conta
                    </h3>
                    <p className="text-cyan-100 text-xs">
                      Complete seu perfil e configure suas preferências no painel de controle.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center mr-2 mt-0 bg-gradient-to-r from-emerald-500 to-cyan-600">
                    <span className="text-white font-semibold text-xs">3</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-white text-xs">
                      Comece a usar
                    </h3>
                    <p className="text-cyan-100 text-xs">
                      Explore todas as funcionalidades do seu plano e comece a gerenciar seu FGTS.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons - Mais compacto */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center justify-center px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 text-xs"
              >
                <Home className="w-3 h-3 mr-1" />
                Ir para Dashboard
              </button>
              
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center justify-center px-3 py-2 rounded-lg bg-white/10 text-cyan-200 border border-cyan-800/30 hover:bg-white/20 transition-colors text-xs"
              >
                <User className="w-3 h-3 mr-1" />
                Configurar Perfil
              </button>
              
              <button
                onClick={() => navigate('/support')}
                className="flex items-center justify-center px-3 py-2 rounded-lg bg-white/10 text-cyan-200 border border-cyan-800/30 hover:bg-white/20 transition-colors text-xs"
              >
                <CreditCard className="w-3 h-3 mr-1" />
                Central de Ajuda
              </button>
            </div>

            {/* Support Info - Mais compacto */}
            <div className="text-center">
              <p className="text-cyan-100 mb-1 text-xs">
                Precisa de ajuda? Nossa equipe está aqui para você.
              </p>
              <div className="flex justify-center space-x-3 text-xs">
                <a href="mailto:support@fgtsagent.com" className="text-emerald-300 hover:text-emerald-200 transition-colors">
                  support@fgtsagent.com
                </a>
                <span className="text-cyan-600">|</span>
                <a href="tel:+5511999999999" className="text-emerald-300 hover:text-emerald-200 transition-colors">
                  (11) 99999-9999
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CheckoutSuccess; 