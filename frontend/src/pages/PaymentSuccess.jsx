import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useSubscription from '../hooks/useSubscription';
import supabase from '../lib/supabaseClient';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const { createSubscription, isProcessing, error } = useSubscription();
  
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Verificando status do pagamento...');

  // ✅ UPGRADE: Obter usuário atual do Supabase
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        }
      } catch (error) {
        console.error('❌ Erro ao obter usuário:', error);
      }
    };
    
    getUser();
  }, []);

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      try {
        console.log('🔍 PaymentSuccess: Iniciando verificação do pagamento...');
        
        // ✅ UPGRADE: Obter parâmetros da URL de retorno do Stripe
        const paymentIntent = searchParams.get('payment_intent');
        const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
        const setupIntent = searchParams.get('setup_intent');
        const setupIntentClientSecret = searchParams.get('setup_intent_client_secret');
        
        console.log('🔍 Parâmetros de retorno:', {
          paymentIntent,
          paymentIntentClientSecret,
          setupIntent,
          setupIntentClientSecret
        });

        // ✅ UPGRADE: Obter dados da sessão armazenados antes do redirecionamento
        const setupIntentId = sessionStorage.getItem('stripe_setup_intent_id');
        const customerId = sessionStorage.getItem('stripe_customer_id');
        const planType = sessionStorage.getItem('stripe_plan_type');
        
        console.log('🔍 Dados da sessão:', {
          setupIntentId,
          customerId,
          planType
        });

        if (!setupIntentId || !customerId || !planType) {
          console.error('❌ Dados da sessão não encontrados');
          setStatus('error');
          setMessage('Dados da sessão não encontrados. Tente novamente.');
          return;
        }

        // ✅ UPGRADE: Verificar se o SetupIntent foi bem-sucedido
        if (setupIntent && setupIntentClientSecret) {
          console.log('✅ SetupIntent retornado com sucesso do 3DS');
          
          // ✅ UPGRADE: Criar assinatura com o plano selecionado
          setMessage('Criando sua assinatura...');
          
          const subscription = await createSubscription(
            customerId,
            planType,
            'monthly', // Default interval
            setupIntent // Payment method ID
          );
          
          if (subscription) {
            console.log('✅ Assinatura criada com sucesso:', subscription.id);
            setStatus('success');
            setMessage('Assinatura criada com sucesso! Redirecionando...');
            
            // ✅ UPGRADE: Limpar dados da sessão
            sessionStorage.removeItem('stripe_setup_intent_id');
            sessionStorage.removeItem('stripe_customer_id');
            sessionStorage.removeItem('stripe_plan_type');
            
            // ✅ UPGRADE: Redirecionar para dashboard após 2 segundos
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
          } else {
            throw new Error('Falha ao criar assinatura');
          }
        } else {
          console.error('❌ SetupIntent não retornado do 3DS');
          setStatus('error');
          setMessage('Erro na autenticação 3DS. Tente novamente.');
        }
        
      } catch (error) {
        console.error('❌ Erro ao processar sucesso do pagamento:', error);
        setStatus('error');
        setMessage(`Erro: ${error.message}`);
      }
    };

    handlePaymentSuccess();
  }, [searchParams, createSubscription, navigate]);

  // ✅ UPGRADE: Renderizar baseado no status
  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-slate-800 rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto mb-6"></div>
            <h1 className="text-2xl font-bold text-slate-100 mb-4">
              Processando Pagamento
            </h1>
            <p className="text-slate-300 mb-6">{message}</p>
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-200"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-slate-800 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 mb-4">
              Erro no Pagamento
            </h1>
            <p className="text-slate-300 mb-6">{message}</p>
            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-slate-800 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 mb-4">
              Pagamento Confirmado!
            </h1>
            <p className="text-slate-300 mb-6">{message}</p>
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-200"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PaymentSuccess;
