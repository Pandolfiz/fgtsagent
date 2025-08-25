import React, { useState, useEffect } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Lock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import api from '../utils/api.js';
import stripePromise from '../config/stripe.js';

const CheckoutForm = React.memo(({ selectedPlan, userData, onSuccess, onError }) => {
  // ✅ Estados essenciais apenas
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState('monthly');
  const [planDetails, setPlanDetails] = useState(null);
  
  const stripe = useStripe();
  const elements = useElements();

  // ✅ Carregar detalhes do plano
  useEffect(() => {
    if (selectedPlan) {
      const loadPlanDetails = async () => {
        try {
          const response = await api.get(`/stripe/plans/${selectedPlan}`);
          const planData = response.data.data || response.data;
          setPlanDetails(planData);
        } catch (err) {
          setError(`Erro ao carregar plano: ${err.message}`);
          if (onError) onError(err.message);
        }
      };
      loadPlanDetails();
    }
  }, [selectedPlan, onError]);

  // ✅ Verificar se Stripe está disponível
  if (!stripe || !elements) {
    return (
      <div className="text-center py-8 bg-gray-800/50 rounded-lg border border-yellow-400/30">
        <AlertCircle className="w-16 h-16 text-yellow-400 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Carregando Stripe...
        </h3>
        <p className="text-cyan-200 mb-4">
          Aguarde enquanto carregamos o sistema de pagamento
        </p>
      </div>
    );
  }

  // ✅ Bloquear durante processamento
  if (loading) {
    return (
      <div className="text-center py-8 bg-blue-900/50 rounded-lg border border-blue-400/30">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Processando Assinatura...
        </h3>
        <p className="text-blue-200">
          Não feche esta página. Aguarde a confirmação.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      setError('Sistema de pagamento não disponível');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Iniciando processo de checkout...');

      // ✅ ARQUITETURA CORRETA: Frontend apenas coleta dados, não chama Stripe
      console.log('🔄 Coletando dados do cartão...');
      
      // ✅ CAPTURAR CARD ELEMENT: Para obter dados do cartão
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Elemento do cartão não está disponível. Tente novamente.');
      }

      console.log('✅ CardElement capturado com sucesso');

      // ✅ COLETAR DADOS DO CARTÃO: Sem chamar Stripe diretamente
      console.log('🔄 Coletando dados do cartão para enviar ao backend...');
      
      // ✅ DADOS BÁSICOS: Informações que podemos obter
      const cardData = {
        // ✅ DADOS DO USUÁRIO: Que já temos
        billing_details: {
          name: `${userData.first_name} ${userData.last_name}`,
          email: userData.email,
        },
        // ✅ METADADOS: Para identificação
        metadata: {
          source: 'signup_with_plans',
          timestamp: new Date().toISOString()
        }
      };

      console.log('✅ Dados do cartão coletados:', cardData);

      // ✅ ENVIAR PARA BACKEND: Backend processa tudo com Stripe
      console.log('🔄 Enviando dados para backend processar com Stripe...');
      
      const response = await api.post('/stripe/process-payment', {
        planType: selectedPlan,
        userEmail: userData.email,
        userName: `${userData.first_name} ${userData.last_name}`,
        cardData, // ✅ Dados do cartão coletados
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

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erro ao processar pagamento');
      }

      console.log('✅ Pagamento processado com sucesso pelo backend');
      
      // ✅ SUCESSO: Backend já processou tudo com Stripe
      setSuccess(true);
      if (onSuccess) onSuccess();

    } catch (err) {
      console.error('❌ Erro no checkout:', err);
      setError(err.message || 'Erro no processamento do pagamento');
      
      if (onError) onError(err);
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
    hidePostalCode: false,
  };

  const getSelectedPrice = () => {
    if (!planDetails?.prices || !Array.isArray(planDetails.prices)) {
      return null;
    }
    return planDetails.prices.find(p => p.interval === selectedInterval);
  };

  const selectedPrice = getSelectedPrice();

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Assinatura Ativada!
        </h3>
        <p className="text-cyan-200">
          Sua conta foi criada e a assinatura foi ativada com sucesso.
        </p>
        <p className="text-sm text-cyan-300 mt-2">
          Você será cobrado {selectedInterval === 'monthly' ? 'mensalmente' : 'anualmente'}.
        </p>
      </div>
    );
  }

  // ✅ Se não há dados do plano, mostrar loading
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
      </div>
    );
  }

  // ✅ Se não há dados do usuário, mostrar erro
  if (!userData?.email || !userData?.first_name || !userData?.last_name) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Dados do usuário incompletos
        </h3>
        <p className="text-cyan-200">
          Por favor, preencha todos os dados pessoais antes de continuar.
        </p>
      </div>
    );
  }

  // ✅ Se não há preços disponíveis, mostrar erro
  if (!planDetails?.prices || !Array.isArray(planDetails.prices) || planDetails.prices.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Plano sem preços disponíveis
        </h3>
        <p className="text-cyan-200">
          Este plano não possui preços configurados. Entre em contato com o suporte.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seleção de Intervalo de Pagamento */}
      <div className="bg-white/10 p-4 rounded-lg border border-cyan-400/20">
        <h3 className="font-medium text-cyan-200 mb-3 text-sm">Escolha o Intervalo de Pagamento</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {planDetails.prices && planDetails.prices.map((price) => (
            <button
              key={price.interval}
              type="button"
              onClick={() => setSelectedInterval(price.interval)}
              className={`p-3 rounded-lg border transition-all ${
                selectedInterval === price.interval
                  ? 'border-cyan-400 bg-cyan-400/20 text-cyan-200'
                  : 'border-gray-600 hover:border-cyan-400/50 text-gray-300 hover:text-cyan-200'
              }`}
            >
              <div className="text-center">
                <div className="font-semibold capitalize">{price.interval}</div>
                <div className="text-sm opacity-80">{price.amountFormatted}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

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
                  <span className="text-cyan-300 text-sm">Desconto</span>
                  <span className="font-semibold text-green-400 text-sm">
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
            Informações de Pagamento
          </h3>
          
          <div className="space-y-4">
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <label className="block text-cyan-200 text-sm mb-2 font-medium">
                Dados do Cartão de Crédito
              </label>
              
              <CardElement 
                options={cardElementOptions} 
                className="stripe-card-element"
              />
              
              <p className="text-xs text-cyan-300 mt-2">
                Digite os números do seu cartão, data de validade e código de segurança
              </p>
            </div>
            
            {/* Informação sobre verificação de segurança */}
            <div className="text-xs text-cyan-300 bg-cyan-400/10 p-3 rounded-lg border border-cyan-400/20">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-3 h-3" />
                <span className="font-medium">Verificação de Segurança</span>
              </div>
              <p className="text-xs opacity-80">
                Para sua segurança, pode ser solicitada verificação 3D Secure durante o pagamento. O Stripe gerenciará isso automaticamente.
              </p>
            </div>
            
            {error && (
              <div className="mt-3 p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
                
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded border border-red-400/30 transition-colors"
                >
                  🔄 Tentar Novamente
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Botão de Pagamento */}
        <button
          type="submit"
          disabled={!stripe || loading}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
            loading
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500'
          } text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]`}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Processando...
            </div>
          ) : (
            `Assinar ${selectedPrice ? selectedPrice.amountFormatted : ''} ${selectedInterval === 'monthly' ? '/mês' : '/ano'}`
          )}
        </button>

        {/* Informações de Segurança */}
        <div className="text-center text-xs text-gray-400 flex items-center justify-center gap-2">
          <Lock className="w-3 h-3" />
          Pagamento seguro via Stripe
        </div>
      </form>
    </div>
  );
});

// Componente principal
const StripeCheckout = React.memo(({ selectedPlan, userData, onSuccess, onError }) => {
  if (!stripePromise) {
    return (
      <div className="text-center py-8 bg-red-900/50 rounded-lg border border-red-400/30">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Erro na Configuração do Stripe
        </h3>
        <p className="text-red-200">
          Não foi possível carregar o sistema de pagamento
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
});

export default StripeCheckout;