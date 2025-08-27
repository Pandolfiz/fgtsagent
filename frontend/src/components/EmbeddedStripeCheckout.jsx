import React, { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CheckCircle, CreditCard, Lock, Shield } from 'lucide-react';
import api from '../utils/api';

// ✅ CONFIGURAÇÃO: Stripe (usar chave pública)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_...');

// ✅ COMPONENTE: Formulário de checkout
const CheckoutForm = ({ selectedPlan, selectedInterval, userData, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  // ✅ CRIAR PAYMENT INTENT
  const createPaymentIntent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Criando Payment Intent...', { selectedPlan, selectedInterval });

      const response = await api.post('/stripe/create-native-payment-intent', {
        planType: selectedPlan,
        userEmail: userData.email,
        userName: `${userData.first_name} ${userData.last_name}`,
        interval: selectedInterval,
        userData: {
          firstName: userData.first_name,
          lastName: userData.last_name,
          phone: userData.phone,
          password: userData.password,
          planType: selectedPlan,
          source: 'signup_with_plans'
        }
      });

      if (response.data.success && response.data.data?.clientSecret) {
        console.log('✅ Payment Intent criado:', response.data.data.clientSecret);
        return response.data.data.clientSecret;
      } else {
        throw new Error(response.data.message || 'Erro ao criar Payment Intent');
      }
    } catch (err) {
      console.error('❌ Erro ao criar Payment Intent:', err);
      setError(err.message || 'Erro ao criar Payment Intent');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedPlan, selectedInterval, userData]);

  // ✅ PROCESSAR PAGAMENTO
  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      // ✅ CRIAR PAYMENT INTENT
      const clientSecret = await createPaymentIntent();

      // ✅ CONFIRMAR PAGAMENTO
      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: `${userData.first_name} ${userData.last_name}`,
            email: userData.email,
            phone: userData.phone
          }
        }
      });

      if (paymentError) {
        console.error('❌ Erro no pagamento:', paymentError);
        setError(paymentError.message || 'Erro no processamento do pagamento');
      } else if (paymentIntent.status === 'succeeded') {
        console.log('✅ Pagamento confirmado:', paymentIntent);
        setSucceeded(true);
        
        // ✅ NOTIFICAR SUCESSO
        if (onSuccess) {
          onSuccess({
            paymentIntent,
            planType: selectedPlan,
            interval: selectedInterval,
            userData
          });
        }
      }
    } catch (err) {
      console.error('❌ Erro no checkout:', err);
      setError(err.message || 'Erro no checkout');
      if (onError) onError(err);
    } finally {
      setProcessing(false);
    }
  }, [stripe, elements, selectedPlan, selectedInterval, userData, createPaymentIntent, onSuccess, onError]);

  // ✅ ESTILOS DO CARD ELEMENT
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Inter, sans-serif',
        '::placeholder': {
          color: '#94a3b8',
        },
        backgroundColor: 'transparent',
      },
      invalid: {
        color: '#ef4444',
      },
    },
    hidePostalCode: true, // ✅ OCULTAR CEP (não necessário para assinatura)
  };

  if (succeeded) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Pagamento Confirmado!</h3>
        <p className="text-cyan-200">Sua assinatura foi ativada com sucesso.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ✅ RESUMO DO PLANO */}
      <div className="bg-gray-800/50 border border-cyan-400/30 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-2">Resumo da Assinatura</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-cyan-200">Plano:</span>
            <span className="text-white font-medium">{selectedPlan}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyan-200">Intervalo:</span>
            <span className="text-white font-medium">
              {selectedInterval === 'monthly' ? 'Mensal' : 'Anual'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyan-200">Email:</span>
            <span className="text-white font-medium">{userData.email}</span>
          </div>
        </div>
      </div>

      {/* ✅ CAMPOS DE PAGAMENTO */}
      <div className="space-y-4">
        <div>
          <label className="block text-cyan-200 text-sm font-medium mb-2">
            Informações do Cartão
          </label>
          <div className="bg-gray-800/50 border border-cyan-400/30 rounded-lg p-3">
            <CardElement options={cardElementOptions} />
          </div>
        </div>

        {/* ✅ BOTÃO DE PAGAMENTO */}
        <button
          type="submit"
          disabled={!stripe || loading || processing}
          className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Criando pagamento...
            </span>
          ) : processing ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processando pagamento...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <Lock className="w-5 h-5 mr-2" />
              Confirmar Assinatura
            </span>
          )}
        </button>
      </div>

      {/* ✅ MENSAGENS DE ERRO */}
      {error && (
        <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
          <p className="text-red-300 text-sm text-center">{error}</p>
        </div>
      )}

      {/* ✅ SEGURANÇA */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 text-xs text-cyan-300">
          <Shield className="w-4 h-4" />
          <span>Pagamento seguro com Stripe</span>
        </div>
        <div className="flex items-center justify-center space-x-2 text-xs text-cyan-300 mt-1">
          <CreditCard className="w-4 h-4" />
          <span>Seus dados nunca são armazenados</span>
        </div>
      </div>
    </form>
  );
};

// ✅ COMPONENTE PRINCIPAL: Checkout embutido
const EmbeddedStripeCheckout = ({ selectedPlan, selectedInterval, userData, onSuccess, onError }) => {
  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Finalizar Assinatura</h2>
        <p className="text-cyan-200 text-sm">
          Complete seu cadastro com segurança
        </p>
      </div>

      <Elements stripe={stripePromise}>
        <CheckoutForm
          selectedPlan={selectedPlan}
          selectedInterval={selectedInterval}
          userData={userData}
          onSuccess={onSuccess}
          onError={onError}
        />
      </Elements>
    </div>
  );
};

export default EmbeddedStripeCheckout;
