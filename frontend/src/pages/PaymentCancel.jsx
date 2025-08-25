import React, { useEffect, useState } from 'react';
import { XCircle, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar.jsx';
import NeuralNetworkBackground from '../NeuralNetworkBackground.jsx';

const PaymentCancel = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // ✅ OBTER: Dados do usuário do localStorage
    try {
      const storedUserData = localStorage.getItem('signup_user_data');
      if (storedUserData) {
        const parsed = JSON.parse(storedUserData);
        setUserData(parsed);
        console.log('✅ PaymentCancel: Dados do usuário recuperados:', parsed);
      }
    } catch (error) {
      console.error('❌ PaymentCancel: Erro ao recuperar dados do usuário:', error);
    }

    // ✅ OBTER: Parâmetros da URL
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (errorParam || errorDescription) {
      setError({
        code: errorParam || 'unknown',
        description: errorDescription || 'Erro desconhecido no pagamento'
      });
    }
  }, [searchParams]);

  const handleRetryPayment = () => {
    if (userData) {
      // ✅ RETORNAR: Para a etapa de pagamento com dados preservados
      navigate('/signup-with-plans', {
        state: {
          step: 3, // Voltar para etapa de pagamento
          userData: userData,
          selectedPlan: userData.planType
        }
      });
    } else {
      // ✅ RETORNAR: Para o início do cadastro
      navigate('/signup-with-plans');
    }
  };

  const handleStartOver = () => {
    // ✅ LIMPAR: Dados do usuário
    localStorage.removeItem('signup_user_data');
    
    // ✅ RETORNAR: Para o início do cadastro
    navigate('/signup-with-plans');
  };

  return (
    <>
      <LandingNavbar />
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 relative overflow-hidden pt-20">
        <NeuralNetworkBackground />
        
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white/10 rounded-2xl shadow-2xl backdrop-blur-lg border border-red-400/30 p-8 card-futuristic text-center">
              
              {/* Ícone de erro */}
              <div className="mb-6">
                <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-red-400 via-orange-400 to-yellow-500 text-transparent bg-clip-text drop-shadow-neon">
                  Pagamento Cancelado
                </h1>
                <p className="text-red-200">
                  Houve um problema com seu pagamento
                </p>
              </div>

              {/* Detalhes do erro */}
              {error && (
                <div className="bg-red-500/20 p-4 rounded-lg border border-red-400/30 mb-6">
                  <h3 className="font-medium text-red-200 mb-2">Detalhes do Erro</h3>
                  <p className="text-white text-sm">{error.description}</p>
                  {error.code && (
                    <p className="text-xs text-red-300/60 mt-2">
                      Código: {error.code}
                    </p>
                  )}
                </div>
              )}

              {/* Informações do usuário */}
              {userData && (
                <div className="bg-white/10 p-4 rounded-lg border border-cyan-400/20 mb-6">
                  <h3 className="font-medium text-cyan-200 mb-2">Seus Dados</h3>
                  <p className="text-white text-sm">
                    <strong>Nome:</strong> {userData.fullName}
                  </p>
                  <p className="text-white text-sm">
                    <strong>Email:</strong> {userData.email}
                  </p>
                  <p className="text-white text-sm">
                    <strong>Plano:</strong> {userData.planType}
                  </p>
                </div>
              )}

              {/* Ações disponíveis */}
              <div className="space-y-4 mb-6">
                <div className="bg-yellow-500/20 p-4 rounded-lg border border-yellow-400/30">
                  <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <h3 className="font-medium text-yellow-200 mb-2">Não se preocupe!</h3>
                  <p className="text-yellow-100 text-sm">
                    Seus dados estão seguros e você pode tentar novamente
                  </p>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="space-y-3">
                <button
                  onClick={handleRetryPayment}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Tentar Pagamento Novamente
                </button>
                
                <button
                  onClick={handleStartOver}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Começar Novamente
                </button>
              </div>

              {/* Informações adicionais */}
              <div className="mt-6 text-xs text-gray-400">
                <p>Se o problema persistir, entre em contato com nosso suporte</p>
                <p className="mt-1">
                  <a href="mailto:suporte@fgtsagent.com.br" className="text-cyan-400 hover:text-cyan-300">
                    suporte@fgtsagent.com.br
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentCancel;
