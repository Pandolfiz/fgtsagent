import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../utils/api.js';

// Configurar Stripe (usar variável de ambiente em produção)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_...');

const CheckoutForm = ({ selectedPlan, userData, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Criar sessão de checkout no backend (rota pública para cadastro)
      const response = await api.post('/api/stripe/create-signup-checkout-session', {
        planType: selectedPlan,
        userEmail: userData.email,
        userName: userData.name,
        successUrl: `${window.location.origin}/signup-success`,
        cancelUrl: `${window.location.origin}/signup`
      });

      const { sessionId } = response.data;

      // 2. Redirecionar para o Stripe Checkout
      const { error } = await stripe.redirectToCheckout({
        sessionId: sessionId
      });

      if (error) {
        throw new Error(error.message);
      }

    } catch (err) {
      console.error('Erro no checkout:', err);
      setError(err.response?.data?.message || err.message || 'Erro no processamento do pagamento');
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#ffffff',
        '::placeholder': {
          color: '#a0d9e0',
        },
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        backgroundColor: 'transparent',
      },
      invalid: {
        color: '#ef4444',
      },
      complete: {
        color: '#10b981',
      },
    },
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Pagamento Processado com Sucesso!
        </h3>
        <p className="text-cyan-200">
          Sua conta foi criada e o plano foi ativado.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="bg-white/10 p-3 rounded-lg border border-cyan-400/20">
        <h3 className="font-medium text-cyan-200 mb-1 text-sm">Resumo do Pedido</h3>
        <div className="flex justify-between items-center">
          <span className="text-cyan-300 text-sm">Plano {selectedPlan}</span>
          <span className="font-semibold text-white text-sm">
            {selectedPlan === 'basic' && 'R$ 99,99/mês'}
            {selectedPlan === 'pro' && 'R$ 199,99/mês'}
            {selectedPlan === 'premium' && 'R$ 499,99/mês'}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-2">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-300 mr-2" />
            <span className="text-red-300 text-xs">{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-cyan-200 mb-1">
            <CreditCard className="w-3 h-3 inline mr-1" />
            Informações do Cartão
          </label>
          <div className="border border-cyan-400/30 rounded-lg p-2 bg-white/20 backdrop-blur-sm">
            <CardElement options={cardElementOptions} />
          </div>
        </div>
      </div>

      <div className="bg-cyan-500/20 border border-cyan-400/30 rounded-lg p-2">
        <div className="flex items-start">
          <Lock className="w-4 h-4 text-cyan-300 mr-2 mt-0.5" />
          <div className="text-xs text-cyan-200">
            <p className="font-medium mb-0.5">Seus dados estão protegidos</p>
            <p>Criptografia SSL de 256 bits.</p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        className={`w-full py-2 px-3 text-sm rounded-lg font-semibold text-white transition-all duration-300 ${
          loading
            ? 'bg-gray-500/30 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 shadow-lg hover:shadow-cyan-500/25 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Processando...
          </div>
        ) : (
          `Pagar e Criar Conta`
        )}
      </button>

      <p className="text-xs text-cyan-300/60 text-center leading-tight">
        Ao continuar, você concorda com nossos{' '}
        <a href="/terms" className="text-cyan-400 hover:text-cyan-300 hover:underline">
          Termos
        </a>{' '}
        e{' '}
        <a href="/privacy" className="text-cyan-400 hover:text-cyan-300 hover:underline">
          Política
        </a>
      </p>
    </form>
  );
};

const StripeCheckout = ({ selectedPlan, userData, onSuccess, onError }) => {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white/10 rounded-lg shadow-xl backdrop-blur-lg border border-cyan-400/30 p-4 card-futuristic">
        <div className="text-center mb-3">
          <h2 className="text-lg font-bold text-white mb-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500 text-transparent bg-clip-text drop-shadow-neon">
            Finalizar Cadastro
          </h2>
          <p className="text-cyan-200 text-sm">
            Complete seu pagamento
          </p>
        </div>

        <Elements stripe={stripePromise}>
          <CheckoutForm
            selectedPlan={selectedPlan}
            userData={userData}
            onSuccess={onSuccess}
            onError={onError}
          />
        </Elements>
      </div>
    </div>
  );
};

export default StripeCheckout; 