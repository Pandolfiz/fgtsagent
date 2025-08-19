import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Lock, CheckCircle, AlertCircle, Calendar, Percent } from 'lucide-react';
import api from '../utils/api.js';

// Configurar Stripe (usar variável de ambiente em produção)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_...');

const CheckoutForm = ({ selectedPlan, userData, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState('monthly');
  const [planDetails, setPlanDetails] = useState(null);

  useEffect(() => {
    // Carregar detalhes do plano selecionado
    const loadPlanDetails = async () => {
      try {
        const response = await api.get(`/api/stripe/plans/${selectedPlan}`);
        setPlanDetails(response.data);
      } catch (err) {
        console.error('Erro ao carregar detalhes do plano:', err);
      }
    };

    if (selectedPlan) {
      loadPlanDetails();
    }
  }, [selectedPlan]);

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
        userName: `${userData.first_name} ${userData.last_name}`,
        successUrl: `${window.location.origin}/signup-success`,
        cancelUrl: `${window.location.origin}/signup`,
        interval: selectedInterval
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

  const getSelectedPrice = () => {
    if (!planDetails) return null;
    return planDetails.prices.find(p => p.interval === selectedInterval);
  };

  const selectedPrice = getSelectedPrice();

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Seleção de Intervalo de Pagamento */}
      {planDetails && (
        <div className="bg-white/10 p-4 rounded-lg border border-cyan-400/20">
          <h3 className="font-medium text-cyan-200 mb-3 text-sm">Escolha o Intervalo de Pagamento</h3>
          <div className="grid grid-cols-3 gap-2">
            {planDetails.prices.map((price) => (
              <button
                key={price.interval}
                type="button"
                onClick={() => setSelectedInterval(price.interval)}
                className={`p-3 rounded-lg border transition-all ${
                  selectedInterval === price.interval
                    ? 'border-cyan-400 bg-cyan-400/20 text-cyan-200'
                    : 'border-cyan-400/20 hover:border-cyan-400/40 text-cyan-300'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold text-sm">
                    {price.interval === 'monthly' && 'Mensal'}
                    {price.interval === 'semiannual' && 'Semestral'}
                    {price.interval === 'annual' && 'Anual'}
                  </div>
                  <div className="text-lg font-bold text-white">
                    {price.amountFormatted}
                  </div>
                  {price.discount && (
                    <div className="text-xs text-emerald-400 flex items-center justify-center gap-1">
                      <Percent className="w-3 h-3" />
                      {price.discount} desconto
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resumo do Pedido */}
      <div className="bg-white/10 p-4 rounded-lg border border-cyan-400/20">
        <h3 className="font-medium text-cyan-200 mb-3 text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Resumo do Pedido
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-cyan-300 text-sm">Plano {selectedPlan}</span>
            <span className="font-semibold text-white text-sm capitalize">
              {selectedInterval}
            </span>
          </div>
          {selectedPrice && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-cyan-300 text-sm">Valor</span>
                <span className="font-semibold text-white text-sm">
                  {selectedPrice.amountFormatted}
                </span>
              </div>
              {selectedPrice.discount && (
                <div className="flex justify-between items-center">
                  <span className="text-emerald-400 text-sm">Desconto aplicado</span>
                  <span className="font-semibold text-emerald-400 text-sm">
                    {selectedPrice.discount}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Formulário de Pagamento */}
      <div className="bg-white/10 p-4 rounded-lg border border-cyan-400/20">
        <h3 className="font-medium text-cyan-200 mb-3 text-sm flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Informações do Cartão
        </h3>
        
        <div className="space-y-3">
          <div className="bg-white/5 p-3 rounded-lg border border-cyan-400/20">
            <CardElement options={cardElementOptions} />
          </div>
          
          <div className="flex items-center gap-2 text-xs text-cyan-300">
            <Lock className="w-3 h-3" />
            <span>Seus dados estão protegidos com criptografia SSL</span>
          </div>
        </div>
      </div>

      {/* Botão de Pagamento */}
      <button
        type="submit"
        disabled={!stripe || loading}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
          loading
            ? 'bg-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 transform hover:scale-105'
        } text-white`}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Processando...
          </div>
        ) : (
          `Pagar ${selectedPrice ? selectedPrice.amountFormatted : ''}`
        )}
      </button>

      {/* Mensagem de Erro */}
      {error && (
        <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
    </form>
  );
};

const StripeCheckout = ({ selectedPlan, userData, onSuccess, onError }) => {
  if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Configuração do Stripe Incompleta
        </h3>
        <p className="text-cyan-200">
          A chave pública do Stripe não está configurada. Entre em contato com o suporte.
        </p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm
        selectedPlan={selectedPlan}
        userData={userData}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
};

export default StripeCheckout;