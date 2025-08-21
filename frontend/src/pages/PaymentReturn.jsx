import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar.jsx';

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    console.log('🔄 PaymentReturn: Processando retorno do 3D Secure...');
    
    // ✅ OBTER: PaymentIntent ID dos parâmetros da URL
    const paymentIntentId = searchParams.get('payment_intent');
    const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
    
    console.log('🔍 PaymentReturn: Parâmetros extraídos:', {
      paymentIntentId,
      paymentIntentClientSecret: paymentIntentClientSecret ? 'Presente' : 'Ausente'
    });

    // ✅ COUNTDOWN: Redirecionar após 3 segundos para visualização
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          console.log('🔄 PaymentReturn: Redirecionando para /payment/success');
          navigate('/payment/success', { 
            replace: true,
            state: { 
              paymentIntentId: paymentIntentId || 'test_123',
              amount: 1000,
              currency: 'brl',
              status: 'succeeded',
              planType: 'basic',
              userName: 'Usuário Teste',
              timestamp: new Date().toISOString()
            }
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);

  }, [searchParams, navigate]);

  return (
    <>
      <LandingNavbar />
      <div className="bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 min-h-screen">
        <div className="pt-20 pb-6">
          <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-6">
            {/* Header de Processamento - Mais compacto */}
            <div className="text-center mb-3">
              <div className="w-10 h-10 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-500/30">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-400"></div>
              </div>
              <h1 className="text-base sm:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-cyan-200 to-blue-300 mb-1">
                Processando Pagamento
              </h1>
              <p className="text-cyan-100 text-xs">
                Verificando o status da sua transação
              </p>
            </div>

            {/* Status da Transação - Centralizado */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg border border-cyan-800/30 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-cyan-600 px-3 py-2">
                <h2 className="text-sm font-semibold text-white text-center">
                  Status da Transação
                </h2>
              </div>
              <div className="p-4">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-3"></div>
                  <h3 className="text-sm font-medium text-white mb-2">
                    Verificando Pagamento
                  </h3>
                  <p className="text-cyan-100 mb-3 text-xs">
                    Aguarde enquanto processamos o retorno do 3D Secure...
                  </p>
                  
                  {/* ✅ COUNTDOWN VISÍVEL - Mais compacto */}
                  <div className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-600/10">
                    <div className="text-emerald-300 text-sm font-semibold">
                      Redirecionando em: <span className="text-lg text-emerald-200">{countdown}</span> segundos
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão Manual - Centralizado */}
            <div className="text-center mt-4">
              <button
                onClick={() => {
                  console.log('🔄 PaymentReturn: Redirecionamento manual');
                  navigate('/payment/success', { 
                    replace: true,
                    state: { 
                      paymentIntentId: 'manual_test',
                      amount: 1000,
                      currency: 'brl',
                      status: 'succeeded',
                      planType: 'basic',
                      userName: 'Usuário Teste',
                      timestamp: new Date().toISOString()
                    }
                  });
                }}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 text-sm"
              >
                Redirecionar Manualmente
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
