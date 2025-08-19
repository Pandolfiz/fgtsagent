import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Lock, CheckCircle, AlertCircle, Calendar, Percent } from 'lucide-react';
import api from '../utils/api.js';

// Configurar Stripe (usar variável de ambiente em produção)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_...');

// Debug: Log das configurações
console.log('🔍 StripeCheckout - Configurações:', {
  stripeKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'Configurada' : 'Não configurada',
  stripeKeyLength: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.length || 0,
  env: import.meta.env.MODE,
  dev: import.meta.env.DEV
});

const CheckoutForm = ({ selectedPlan, userData, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState('monthly');
  const [planDetails, setPlanDetails] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  // Debug: Log do estado do componente
  useEffect(() => {
    console.log('🔍 CheckoutForm - Estado atual:', {
      selectedPlan,
      userData: userData ? 'Presente' : 'Ausente',
      stripe: stripe ? 'Carregado' : 'Não carregado',
      elements: elements ? 'Carregado' : 'Não carregado',
      planDetails: planDetails ? 'Carregado' : 'Não carregado'
    });
  }, [selectedPlan, userData, stripe, elements, planDetails]);

  useEffect(() => {
    // Carregar detalhes do plano selecionado
    const loadPlanDetails = async () => {
      try {
        console.log('🔍 Carregando detalhes do plano:', selectedPlan);
        const response = await api.get(`/api/stripe/plans/${selectedPlan}`);
        console.log('✅ Detalhes do plano carregados:', response.data);
        
        // Extrair os dados do plano da resposta da API
        const planData = response.data.data || response.data;
        console.log('🔍 Dados extraídos do plano:', planData);
        
        setPlanDetails(planData);
        
        // Verificar se o intervalo selecionado está disponível
        if (planData.prices && planData.prices.length > 0) {
          const availableIntervals = planData.prices.map(p => p.interval);
          if (!availableIntervals.includes(selectedInterval)) {
            // Se o intervalo selecionado não estiver disponível, usar o primeiro disponível
            setSelectedInterval(availableIntervals[0]);
            console.log('🔄 Intervalo ajustado para:', availableIntervals[0]);
          }
        }
      } catch (err) {
        console.error('❌ Erro ao carregar detalhes do plano:', err);
        setError(`Erro ao carregar plano: ${err.message}`);
      }
    };

    if (selectedPlan) {
      loadPlanDetails();
    }
  }, [selectedPlan, selectedInterval]);

  const handleIntervalChange = (newInterval) => {
    setSelectedInterval(newInterval);
    console.log('🔄 Intervalo alterado para:', newInterval);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      console.error('❌ Stripe ou Elements não carregados:', { stripe: !!stripe, elements: !!elements });
      setError('Sistema de pagamento não carregado. Recarregue a página.');
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
      console.error('❌ Erro no checkout:', err);
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
    if (!planDetails || !planDetails.prices || !Array.isArray(planDetails.prices)) {
      console.warn('⚠️ PlanDetails ou prices não estão disponíveis:', planDetails);
      return null;
    }
    
    const price = planDetails.prices.find(p => p.interval === selectedInterval);
    if (!price) {
      console.warn(`⚠️ Preço para intervalo ${selectedInterval} não encontrado. Preços disponíveis:`, planDetails.prices);
    }
    return price;
  };

  const selectedPrice = getSelectedPrice();

  // Debug: Renderizar informações de debug em desenvolvimento
  if (import.meta.env.DEV) {
    console.log('🔍 CheckoutForm - Renderizando com:', {
      selectedPlan,
      userData,
      planDetails,
      planDetailsType: typeof planDetails,
      planDetailsKeys: planDetails ? Object.keys(planDetails) : 'N/A',
      planDetailsPrices: planDetails?.prices,
      planDetailsPricesLength: planDetails?.prices?.length,
      planDetailsPricesType: typeof planDetails?.prices,
      planDetailsPricesIsArray: Array.isArray(planDetails?.prices),
      selectedPrice,
      stripe: !!stripe,
      elements: !!elements
    });
  }

  // Se não há dados do plano, mostrar loading
  if (!planDetails) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Carregando detalhes do plano...
        </h3>
        <p className="text-cyan-200">
          Aguarde enquanto preparamos seu checkout
        </p>
        {import.meta.env.DEV && (
          <div className="mt-4 p-3 bg-gray-800/50 rounded text-xs text-gray-300">
            <p>Debug: selectedPlan = {selectedPlan}</p>
            <p>Debug: userData = {userData ? 'Presente' : 'Ausente'}</p>
            <p>Debug: planDetails = {JSON.stringify(planDetails, null, 2)}</p>
          </div>
        )}
      </div>
    );
  }

  // Se não há dados do usuário, mostrar erro
  if (!userData || !userData.email) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Dados do usuário incompletos
        </h3>
        <p className="text-cyan-200">
          Por favor, preencha todos os dados pessoais antes de continuar.
        </p>
        {import.meta.env.DEV && (
          <div className="mt-4 p-3 bg-gray-800/50 rounded text-xs text-gray-300">
            <p>Debug: userData = {JSON.stringify(userData, null, 2)}</p>
          </div>
        )}
      </div>
    );
  }

  // Se não há preços disponíveis, mostrar erro
  if (!planDetails.prices || !Array.isArray(planDetails.prices) || planDetails.prices.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Plano sem preços disponíveis
        </h3>
        <p className="text-cyan-200">
          Este plano não possui preços configurados. Entre em contato com o suporte.
        </p>
        {import.meta.env.DEV && (
          <div className="mt-4 p-3 bg-gray-800/50 rounded text-xs text-gray-300">
            <p>Debug: planDetails = {JSON.stringify(planDetails, null, 2)}</p>
            <p>Debug: planDetails.prices = {JSON.stringify(planDetails?.prices, null, 2)}</p>
            <p>Debug: planDetails.prices type = {typeof planDetails?.prices}</p>
            <p>Debug: planDetails.prices isArray = {Array.isArray(planDetails?.prices)}</p>
          </div>
        )}
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Pagamento Processado com Sucesso!
        </h3>
        <p className="text-cyan-200">
          Você será redirecionado em instantes...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug Info em desenvolvimento */}
      {import.meta.env.DEV && (
        <div className="p-3 bg-gray-800/50 rounded text-xs text-gray-300">
          <p><strong>Debug Info:</strong></p>
          <p>Plano: {selectedPlan}</p>
          <p>Intervalo: {selectedInterval}</p>
          <p>Stripe: {stripe ? '✅ Carregado' : '❌ Não carregado'}</p>
          <p>Elements: {elements ? '✅ Carregado' : '❌ Não carregado'}</p>
          <p>Plan Details: {planDetails ? '✅ Carregado' : '❌ Não carregado'}</p>
          <p>Prices: {planDetails?.prices ? `${planDetails.prices.length} preços` : '❌ Não disponível'}</p>
          <p>Selected Price: {selectedPrice ? '✅ Encontrado' : '❌ Não encontrado'}</p>
        </div>
      )}

      {/* Seleção de Intervalo de Pagamento */}
      {planDetails && planDetails.prices && planDetails.prices.length > 1 && (
        <div className="bg-white/10 p-4 rounded-lg border border-cyan-400/20">
          <h3 className="font-medium text-cyan-200 mb-3 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Escolha o Intervalo de Pagamento
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {planDetails.prices.map((price) => (
              <button
                key={price.interval}
                type="button"
                onClick={() => handleIntervalChange(price.interval)}
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

      {/* Resumo do Plano */}
      <div className="bg-white/10 p-4 rounded-lg border border-cyan-400/20">
        <h3 className="font-medium text-cyan-200 mb-3 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Resumo do Plano
        </h3>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-cyan-300 text-sm">Plano</span>
            <span className="font-semibold text-white text-sm">
              {planDetails.name || 'Nome não disponível'}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-cyan-300 text-sm">Intervalo</span>
            <span className="font-semibold text-white text-sm">
              {selectedInterval === 'monthly' ? 'Mensal' : 
               selectedInterval === 'semiannual' ? 'Semestral' : 
               selectedInterval === 'annual' ? 'Anual' : selectedInterval}
            </span>
          </div>
          
          {selectedPrice && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-cyan-300 text-sm">Valor</span>
                <span className="font-semibold text-white text-sm">
                  {selectedPrice.amountFormatted || 'Preço não disponível'}
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
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white/10 p-4 rounded-lg border border-cyan-400/20">
          <h3 className="font-medium text-cyan-200 mb-3 text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Informações do Cartão
          </h3>
          
          <div className="space-y-3">
            <div className="bg-white/5 p-3 rounded-lg border border-cyan-400/20">
              {stripe && elements ? (
                <CardElement options={cardElementOptions} />
              ) : (
                <div className="text-center py-4 text-cyan-300">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Carregando formulário de pagamento...
                </div>
              )}
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
          disabled={!stripe || loading || !selectedPrice}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
            loading || !selectedPrice
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 transform hover:scale-105'
          } text-white`}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Processando...
            </div>
          ) : !selectedPrice ? (
            'Preço não disponível'
          ) : (
            `Pagar ${selectedPrice.amountFormatted || 'Valor não disponível'}`
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
    </div>
  );
};

const StripeCheckout = ({ selectedPlan, userData, onSuccess, onError }) => {
  // Debug: Log das props recebidas
  console.log('🔍 StripeCheckout - Props recebidas:', {
    selectedPlan,
    userData: userData ? 'Presente' : 'Ausente',
    onSuccess: !!onSuccess,
    onError: !!onError
  });

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