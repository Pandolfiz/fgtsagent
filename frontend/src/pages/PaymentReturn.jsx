import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';

// Configurar Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handlePaymentReturn = async () => {
      try {
        console.log('🔄 PaymentReturn: Processando retorno do 3D Secure...');
        
        // ✅ OBTER: PaymentIntent ID dos parâmetros da URL
        const paymentIntentId = searchParams.get('payment_intent');
        const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
        const redirectStatus = searchParams.get('redirect_status');

        if (!paymentIntentId || !paymentIntentClientSecret) {
          throw new Error('Parâmetros de pagamento não encontrados na URL');
        }

        console.log('🔍 PaymentReturn: Parâmetros recebidos:', {
          paymentIntentId,
          redirectStatus,
          hasClientSecret: !!paymentIntentClientSecret
        });

        // ✅ INICIALIZAR: Stripe
        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error('Falha ao carregar Stripe');
        }

        // ✅ RECUPERAR: PaymentIntent para verificar status
        const { paymentIntent, error: stripeError } = await stripe.retrievePaymentIntent(
          paymentIntentClientSecret
        );

        if (stripeError) {
          console.error('❌ Erro do Stripe:', stripeError);
          throw new Error(stripeError.message);
        }

        console.log('📊 PaymentReturn: Status do PaymentIntent:', {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency
        });

        // ✅ PROCESSAR: Status do pagamento
        switch (paymentIntent.status) {
          case 'succeeded':
            console.log('✅ PaymentReturn: Pagamento confirmado com sucesso!');
            setSuccess(true);
            
            // ✅ REDIRECIONAR: Para página de sucesso após delay
            setTimeout(() => {
              navigate('/payment/success', { 
                replace: true,
                state: { 
                  paymentIntentId: paymentIntent.id,
                  amount: paymentIntent.amount,
                  currency: paymentIntent.currency
                }
              });
            }, 2000);
            break;

          case 'processing':
            console.log('⏳ PaymentReturn: Pagamento em processamento...');
            setError('Seu pagamento está sendo processado. Você receberá uma confirmação em breve.');
            
            // ✅ REDIRECIONAR: Para dashboard após delay
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 3000);
            break;

          case 'requires_action':
            console.log('⚠️ PaymentReturn: Pagamento requer ação adicional (3D Secure)');
            setError('Autenticação 3D Secure não foi completada. Tente novamente.');
            
            // ✅ REDIRECIONAR: Para checkout novamente
            setTimeout(() => {
              navigate('/signup-with-plans', { replace: true });
            }, 3000);
            break;

          case 'requires_payment_method':
            console.log('❌ PaymentReturn: Método de pagamento rejeitado');
            setError('Seu método de pagamento foi rejeitado. Tente outro cartão.');
            
            // ✅ REDIRECIONAR: Para checkout novamente
            setTimeout(() => {
              navigate('/signup-with-plans', { replace: true });
            }, 3000);
            break;

          default:
            console.log('⚠️ PaymentReturn: Status inesperado:', paymentIntent.status);
            setError(`Status do pagamento: ${paymentIntent.status}. Entre em contato com o suporte.`);
            
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 3000);
        }

      } catch (error) {
        console.error('❌ PaymentReturn: Erro:', error);
        setError(error.message || 'Erro ao processar retorno do pagamento');
        
        // ✅ REDIRECIONAR: Para dashboard em caso de erro
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    handlePaymentReturn();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">
                Processando pagamento...
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Verificando o status da sua transação
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">
                Pagamento Confirmado!
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Redirecionando para a página de sucesso...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">
                Problema no Pagamento
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {error}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Redirecionando automaticamente...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
