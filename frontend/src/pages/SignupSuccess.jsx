import React, { useEffect, useState } from 'react';
import { CheckCircle, Mail, ExternalLink } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import NeuralNetworkBackground from '../NeuralNetworkBackground.jsx';
import LandingNavbar from '../components/LandingNavbar.jsx';

const SignupSuccess = () => {
  const [searchParams] = useSearchParams();
  const [plan, setPlan] = useState('');
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    setPlan(searchParams.get('plan') || '');
    setSessionId(searchParams.get('session_id') || '');
  }, [searchParams]);

  const getPlanName = (planType) => {
    switch (planType) {
      case 'basic':
        return 'Plano Básico';
      case 'pro':
        return 'Plano Pro';
      case 'premium':
        return 'Plano Premium';
      default:
        return 'Plano selecionado';
    }
  };

  return (
    <>
      <LandingNavbar />
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 relative overflow-hidden pt-20">
        <NeuralNetworkBackground />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/10 rounded-2xl shadow-2xl backdrop-blur-lg border border-cyan-400/30 p-8 card-futuristic text-center">

            {/* Ícone de sucesso */}
            <div className="mb-6">
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500 text-transparent bg-clip-text drop-shadow-neon">
                Pagamento Realizado!
              </h1>
              <p className="text-cyan-200">
                Sua conta foi criada com sucesso
              </p>
            </div>

            {/* Informações do plano */}
            {plan && (
              <div className="bg-white/10 p-4 rounded-lg border border-cyan-400/20 mb-6">
                <h3 className="font-medium text-cyan-200 mb-2">Plano Ativado</h3>
                <p className="text-white font-semibold">{getPlanName(plan)}</p>
                {sessionId && (
                  <p className="text-xs text-cyan-300/60 mt-2">
                    ID da sessão: {sessionId.substring(0, 20)}...
                  </p>
                )}
              </div>
            )}

            {/* Próximos passos */}
            <div className="space-y-4 mb-6">
              <div className="text-left">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Próximos passos:
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start">
                    <Mail className="w-4 h-4 text-cyan-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-cyan-200">
                        <strong>Verifique seu email</strong>
                      </p>
                      <p className="text-cyan-300/80">
                        Enviamos instruções de acesso para sua conta
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <ExternalLink className="w-4 h-4 text-cyan-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-cyan-200">
                        <strong>Acesse sua conta</strong>
                      </p>
                      <p className="text-cyan-300/80">
                        Faça login para começar a usar o FGTS Agent
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão para fazer login */}
            <div className="space-y-4">
              <a
                href="/login"
                className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 inline-block"
              >
                Fazer Login
              </a>

              <p className="text-xs text-cyan-300/60">
                Problemas? Entre em contato conosco:{' '}
                <a href="mailto:suporte@fgtsagent.com" className="text-cyan-400 hover:text-cyan-300 underline">
                  suporte@fgtsagent.com
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

export default SignupSuccess;