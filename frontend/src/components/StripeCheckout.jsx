import React, { useState, useEffect } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Lock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import api from '../utils/api.js';
import stripePromise from '../config/stripe.js';

console.log('🔍 StripeCheckout importado, stripePromise:', stripePromise);

const CheckoutForm = ({ selectedPlan, userData, onSuccess, onError }) => {
  console.log('🔍 CheckoutForm renderizando com:', { selectedPlan, userData, onSuccess, onError });
  
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState('monthly');
  const [planDetails, setPlanDetails] = useState(null);

  console.log('🔍 Estados do CheckoutForm:', { stripe: !!stripe, elements: !!elements, loading, error, success, selectedInterval, planDetails });

  // ✅ DEBUG: Monitorar carregamento do Stripe (SEMPRE EXECUTAR)
  useEffect(() => {
    console.log('🔄 useEffect CheckoutForm - Stripe status:', {
      stripe: !!stripe,
      elements: !!elements,
      timestamp: new Date().toISOString()
    });
    
    if (stripe && elements) {
      console.log('✅ Stripe e Elements carregados com sucesso');
    } else {
      console.log('⏳ Aguardando carregamento do Stripe...');
    }
  }, [stripe, elements]);

  // ✅ DEBUG: Carregar detalhes do plano (SEMPRE EXECUTAR)
  useEffect(() => {
    if (selectedPlan) {
      const loadPlanDetails = async () => {
        try {
          const response = await api.get(`/stripe/plans/${selectedPlan}`);
          // ✅ CORRIGIR: A API retorna {data: {...}}, então precisamos acessar response.data.data
          const planData = response.data.data || response.data;
          
          // ✅ DEBUG: Verificar estrutura dos dados
          console.log('🔍 Dados da API:', {
            responseData: response.data,
            planData: planData,
            hasPrices: !!planData?.prices,
            pricesLength: planData?.prices?.length,
            prices: planData?.prices
          });
          
          setPlanDetails(planData);
        } catch (err) {
          const errorMessage = err.message || 'Erro desconhecido ao carregar plano';
          setError(`Erro ao carregar plano: ${errorMessage}`);
          if (onError) onError(errorMessage);
        }
      };
      loadPlanDetails();
    }
  }, [selectedPlan, onError]);

  // ✅ TESTE VISUAL: Garantir que o componente está sendo renderizado
  console.log('🎨 Renderizando CheckoutForm...');

  // ✅ DEBUG: Renderização de debug para identificar problemas
  if (!stripe || !elements) {
    console.log('⚠️ Stripe ou Elements não carregados:', { stripe: !!stripe, elements: !!elements });
    return (
      <div 
        className="text-center py-8 bg-gray-800/50 rounded-lg border border-yellow-400/30"
        style={{
          position: 'relative',
          zIndex: 1000,
          backgroundColor: 'rgba(31, 41, 55, 0.8)',
          border: '2px solid rgba(250, 204, 21, 0.5)',
          borderRadius: '12px',
          padding: '32px',
          margin: '16px 0',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <AlertCircle className="w-16 h-16 text-yellow-400 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Carregando Stripe...
        </h3>
        <p className="text-cyan-200 mb-4">
          Aguarde enquanto carregamos o sistema de pagamento
        </p>
        <div className="p-3 bg-gray-900/80 rounded text-xs text-gray-300 border border-gray-600">
          <p>Debug: stripe = {stripe ? 'Carregado' : 'Não carregado'}</p>
          <p>Debug: elements = {elements ? 'Carregado' : 'Não carregado'}</p>
          <p>Debug: stripePromise = {stripePromise ? 'Presente' : 'Ausente'}</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ CHECKOUT NATIVO: Criar PaymentIntent em vez de sessão de checkout
      console.log('🧪 Iniciando checkout nativo...');
      
      // 1. Criar PaymentIntent no backend
      const response = await api.post('/stripe/create-payment-intent', {
        planType: selectedPlan,
        userEmail: userData.email,
        userName: `${userData.first_name} ${userData.last_name}`,
        interval: selectedInterval
      });

      // ✅ DEBUG: Verificar resposta da API
      console.log('🔍 Resposta da API create-payment-intent:', {
        response: response.data,
        hasClientSecret: !!response.data?.data?.clientSecret,
        clientSecret: response.data?.data?.clientSecret
      });

      // ✅ CORRIGIR: A API retorna {success: true, data: {clientSecret: ...}}
      const { clientSecret } = response.data.data || {};
      
      // ✅ VERIFICAR SE TEM CLIENT SECRET
      if (!clientSecret) {
        console.error('❌ Client Secret não encontrado na resposta:', response.data);
        throw new Error('Client Secret não retornado pela API');
      }

      console.log('✅ Client Secret obtido:', clientSecret);

      // 2. ✅ FLUXO CORRETO: Primeiro criar PaymentMethod, depois confirmar
      const { error: submitError } = await elements.submit();
      if (submitError) {
        console.error('❌ Erro ao submeter elementos:', submitError);
        throw new Error(submitError.message);
      }

      // ✅ CRIAR: PaymentMethod com os dados do cartão
      console.log('💳 Criando PaymentMethod...');
      const { paymentMethod, error: paymentMethodError } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
        billing_details: {
          name: `${userData.first_name} ${userData.last_name}`,
          email: userData.email,
        },
      });

      if (paymentMethodError) {
        console.error('❌ Erro ao criar PaymentMethod:', paymentMethodError);
        throw new Error(paymentMethodError.message);
      }

      console.log('✅ PaymentMethod criado:', paymentMethod.id);

      // ✅ MÉTODO SEGURO: Confirmar pagamento via backend (MAIS SEGURO)
      console.log('🔐 Confirmando pagamento via backend...');
      
      try {
        // ✅ BACKEND: Enviar dados para confirmação segura
        // ✅ MELHORAR: Extração mais robusta do PaymentIntent ID
        const paymentIntentId = clientSecret.includes('_secret_') 
          ? clientSecret.split('_secret_')[0] 
          : clientSecret;
          
        console.log('🔍 PaymentIntent ID extraído:', paymentIntentId);
        console.log('🔍 PaymentMethod ID:', paymentMethod.id);
        console.log('🔍 Client Secret completo:', clientSecret);
        
        // ✅ VALIDAÇÃO: Verificar se os IDs estão corretos
        if (!paymentIntentId || !paymentMethod.id) {
          throw new Error('IDs inválidos para confirmação do pagamento');
        }
        
        const confirmData = {
          paymentIntentId: paymentIntentId,
          paymentMethodId: paymentMethod.id
        };
        
        console.log('📤 Dados enviados para confirmação:', confirmData);
        
        const confirmResponse = await api.post('/stripe/confirm-payment', confirmData);

        console.log('✅ Resposta da confirmação via backend:', confirmResponse.data);

        if (confirmResponse.data.success) {
          const paymentIntent = confirmResponse.data.data;
          
          // ✅ VERIFICAR: Status do PaymentIntent
          console.log('🔍 Status do PaymentIntent:', paymentIntent?.status);
          
          // ✅ FLUXO MELHORADO: Tratamento específico para produção
          if (paymentIntent?.status === 'succeeded') {
            console.log('✅ Pagamento confirmado via backend:', paymentIntent);
            setSuccess(true);
            if (onSuccess) onSuccess(paymentIntent);
          } else if (paymentIntent?.status === 'requires_action') {
            console.log('⚠️ PaymentIntent requer ação adicional (3D Secure)');
            console.log('ℹ️ Aguardando autenticação bancária...');
            
            // ✅ PRODUÇÃO: Aguardar confirmação do 3D Secure
            // O Stripe vai redirecionar automaticamente se necessário
            return;
          } else if (paymentIntent?.status === 'requires_payment_method') {
            console.log('⚠️ PaymentIntent requer método de pagamento válido');
            throw new Error('Método de pagamento inválido. Tente novamente.');
          } else if (paymentIntent?.status === 'canceled') {
            console.log('⚠️ PaymentIntent cancelado');
            throw new Error('Pagamento cancelado. Tente novamente.');
          } else if (paymentIntent?.status === 'processing') {
            console.log('⏳ PaymentIntent em processamento...');
            // ✅ PRODUÇÃO: Aguardar processamento
            return;
          } else {
            console.log('⚠️ PaymentIntent com status inesperado:', paymentIntent?.status);
            // ✅ PRODUÇÃO: Redirecionar para página de sucesso se necessário
            window.location.href = `${window.location.origin}/signup-success`;
          }
        } else {
          throw new Error(confirmResponse.data.message || 'Erro na confirmação do pagamento');
        }

      } catch (confirmError) {
        console.error('❌ Erro na confirmação via backend:', confirmError);
        
        // ✅ TRATAMENTO: Erros específicos do backend
        if (confirmError.response?.data?.error) {
          const backendError = confirmError.response.data.error;
          
          if (backendError.code === 'payment_intent_authentication_failure') {
            throw new Error('Verificação de segurança falhou. Tente novamente ou use outro cartão.');
          } else if (backendError.code === 'card_declined') {
            if (backendError.decline_code === 'fraudulent') {
              throw new Error('Pagamento bloqueado por segurança. Use outro cartão ou entre em contato com seu banco.');
            } else if (backendError.decline_code === 'insufficient_funds') {
              throw new Error('Saldo insuficiente no cartão.');
            } else if (backendError.decline_code === 'expired_card') {
              throw new Error('Cartão expirado. Use um cartão válido.');
            } else if (backendError.decline_code === 'incorrect_cvc') {
              throw new Error('Código de segurança incorreto.');
            } else if (backendError.decline_code === 'processing_error') {
              throw new Error('Erro no processamento. Tente novamente em alguns instantes.');
            } else {
              throw new Error('Cartão recusado. Verifique os dados ou use outro método de pagamento.');
            }
          } else {
            throw new Error(backendError.message || 'Erro no cartão de crédito');
          }
        } else {
          throw new Error(confirmError.message || 'Erro na confirmação do pagamento');
        }
      }

      // ✅ REMOVIDO: Código antigo que chamava Stripe diretamente
      // const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      //   payment_method: {
      //     card: elements.getElement(CardElement),
      //     billing_details: {
      //       name: `${userData.first_name} ${userData.last_name}`,
      //       email: userData.email,
      //     },
      //   }
      // });

    } catch (err) {
      const errorMessage = err.message || 'Erro ao processar pagamento';
      console.error('❌ Erro no checkout nativo:', err);
      
      // ✅ MELHORAR: Tratamento específico para erros de conectividade
      let userFriendlyError = errorMessage;
      
      if (err.message?.includes('Failed to fetch') || err.message?.includes('network')) {
        userFriendlyError = 'Erro de conectividade. Verifique sua conexão com a internet e tente novamente.';
      } else if (err.message?.includes('authentication_failure')) {
        userFriendlyError = 'Falha na verificação de segurança. Tente novamente ou use outro método de pagamento.';
      } else if (err.message?.includes('payment_intent_authentication_failure')) {
        userFriendlyError = 'Verificação de segurança falhou. Complete o captcha e tente novamente.';
      }
      
      setError(userFriendlyError);
      if (onError) onError(userFriendlyError);
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
    if (!planDetails?.prices || !Array.isArray(planDetails.prices)) {
      console.log('⚠️ getSelectedPrice falhou:', {
        planDetails,
        hasPrices: !!planDetails?.prices,
        isArray: Array.isArray(planDetails?.prices)
      });
      return null;
    }
    
    const price = planDetails.prices.find(p => p.interval === selectedInterval);
    if (!price) {
      console.log(`⚠️ Preço para intervalo ${selectedInterval} não encontrado. Preços disponíveis:`, planDetails.prices);
    }
    return price;
  };

  const selectedPrice = getSelectedPrice();

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Pagamento Processado!
        </h3>
        <p className="text-cyan-200">
          Sua conta foi criada e o plano foi ativado.
        </p>
      </div>
    );
  }

  // Se não há dados do plano, mostrar loading
  if (!planDetails) {
    console.log('⚠️ PlanDetails não carregado:', { planDetails });
    
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Carregando detalhes do plano...
        </h3>
        <p className="text-cyan-200">
          Aguarde enquanto preparamos seu checkout
        </p>
        {/* ✅ DEBUG: Mostrar dados em desenvolvimento */}
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
  if (!userData?.email || !userData?.first_name || !userData?.last_name) {
    console.log('⚠️ Dados do usuário incompletos:', {
      userData,
      hasEmail: !!userData?.email,
      hasFirstName: !!userData?.first_name,
      hasLastName: !!userData?.last_name
    });
    
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Dados do usuário incompletos
        </h3>
        <p className="text-cyan-200">
          Por favor, preencha todos os dados pessoais antes de continuar.
        </p>
        {/* ✅ DEBUG: Mostrar dados em desenvolvimento */}
        {import.meta.env.DEV && (
          <div className="mt-4 p-3 bg-gray-800/50 rounded text-xs text-gray-300">
            <p>Debug: userData = {JSON.stringify(userData, null, 2)}</p>
          </div>
        )}
      </div>
    );
  }

  // Se não há preços disponíveis, mostrar erro
  if (!planDetails?.prices || !Array.isArray(planDetails.prices) || planDetails.prices.length === 0) {
    // ✅ DEBUG: Verificar por que não há preços
    console.log('⚠️ Validação de preços falhou:', {
      planDetails,
      hasPrices: !!planDetails?.prices,
      isArray: Array.isArray(planDetails?.prices),
      length: planDetails?.prices?.length,
      prices: planDetails?.prices
    });
    
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Plano sem preços disponíveis
        </h3>
        <p className="text-cyan-200">
          Este plano não possui preços configurados. Entre em contato com o suporte.
        </p>
        {/* ✅ DEBUG: Mostrar dados em desenvolvimento */}
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

  return (
    <div className="space-y-6">
      {/* ✅ TESTE VISUAL: Garantir que o componente está sendo renderizado */}
      <div 
        className="bg-purple-900/20 border border-purple-400/30 rounded-lg p-4"
        style={{
          position: 'relative',
          zIndex: 1000,
          backgroundColor: 'rgba(88, 28, 135, 0.3)',
          border: '2px solid rgba(168, 85, 247, 0.5)',
          borderRadius: '12px',
          padding: '20px',
          margin: '16px 0',
          minHeight: '120px'
        }}
      >
        <h3 className="text-purple-200 text-lg font-semibold mb-2">🎨 CheckoutForm Renderizado com Sucesso</h3>
        <p className="text-purple-300 text-sm mb-3">Stripe e Elements carregados corretamente</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-purple-400">
          <p><strong>selectedPlan:</strong> {selectedPlan}</p>
          <p><strong>userData:</strong> {userData ? 'Presente' : 'Ausente'}</p>
          <p><strong>stripe:</strong> {stripe ? '✅ Carregado' : '❌ Não carregado'}</p>
          <p><strong>elements:</strong> {elements ? '✅ Carregado' : '❌ Não carregado'}</p>
        </div>
      </div>

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
              <CardElement options={cardElementOptions} />
            </div>
            
            {/* ✅ INFORMAÇÃO: Sobre verificação de segurança */}
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
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
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
            `Pagar ${selectedPrice ? selectedPrice.amountFormatted : ''}`
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
};

// Componente principal que envolve o formulário
const StripeCheckout = ({ selectedPlan, userData, onSuccess, onError }) => {
  console.log('🔍 StripeCheckout renderizando com:', { selectedPlan, userData, onSuccess, onError });
  
  // ✅ TESTE VISUAL: Garantir que o componente está sendo renderizado
  console.log('🎨 Renderizando StripeCheckout...');
  
  // ✅ DEBUG: Verificar se stripePromise está carregado
  if (!stripePromise) {
    console.error('❌ stripePromise não está carregado');
    return (
      <div className="text-center py-8 bg-red-900/50 rounded-lg border border-red-400/30">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Erro na Configuração do Stripe
        </h3>
        <p className="text-red-200">
          Não foi possível carregar o sistema de pagamento
        </p>
        <div className="mt-4 p-3 bg-gray-800/50 rounded text-xs text-gray-300">
          <p>Debug: stripePromise = {stripePromise ? 'Presente' : 'Ausente'}</p>
          <p>Debug: VITE_STRIPE_PUBLISHABLE_KEY = {import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'Configurada' : 'Não configurada'}</p>
        </div>
      </div>
    );
  }
  
  // ✅ SEMPRE renderizar algo visual
  return (
    <div className="space-y-4">
      {/* ✅ TESTE VISUAL: Garantir que o componente está sendo renderizado */}
      <div 
        className="bg-blue-900/20 border border-blue-400/30 rounded-lg p-4"
        style={{
          position: 'relative',
          zIndex: 1000,
          backgroundColor: 'rgba(30, 58, 138, 0.3)',
          border: '2px solid rgba(96, 165, 250, 0.5)',
          borderRadius: '12px',
          padding: '20px',
          margin: '16px 0',
          minHeight: '120px'
        }}
      >
        <h3 className="text-blue-200 text-lg font-semibold mb-2">🔍 Debug: StripeCheckout Renderizado</h3>
        <p className="text-blue-300 text-sm mb-3">Componente carregado com sucesso</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-blue-400">
          <p><strong>selectedPlan:</strong> {selectedPlan}</p>
          <p><strong>userData:</strong> {userData ? 'Presente' : 'Ausente'}</p>
          <p><strong>stripePromise:</strong> {stripePromise ? '✅ Carregado' : '❌ Não carregado'}</p>
          <p><strong>timestamp:</strong> {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
      
      {/* ✅ Renderizar Elements apenas se stripePromise estiver pronto */}
      <Elements stripe={stripePromise}>
        <CheckoutForm
          selectedPlan={selectedPlan}
          userData={userData}
          onSuccess={onSuccess}
          onError={onError}
        />
      </Elements>
    </div>
  );
};

export default StripeCheckout;