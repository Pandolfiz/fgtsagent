import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Lock, CheckCircle, AlertCircle, Calendar, Percent } from 'lucide-react';
import api from '../utils/api.js';

// Configurar Stripe (usar configuração de produção)
import { stripePromise, stripeConfig } from '../lib/stripe.js';
import { STRIPE_CONFIG } from '../config/stripe.config.js';

  // Debug: Log das configurações
  console.log('🔍 StripeCheckout - Configurações:', {
    stripeKey: 'PRODUÇÃO - Configurado via config',
    stripeKeyLength: STRIPE_CONFIG.publishableKey.length,
    stripeKeyValue: STRIPE_CONFIG.publishableKey,
    env: 'production',
    dev: false
  });

const CheckoutForm = ({ selectedPlan, userData, onSuccess, onError, clientSecret, loading, error, setError, setLoading }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [success, setSuccess] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState('monthly');
  const [planDetails, setPlanDetails] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [elementsReady, setElementsReady] = useState(false);

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

  // ✅ MONITORAR QUANDO O ELEMENTS ESTÁ PRONTO
  useEffect(() => {
    if (elements) {
      // Aguardar mais tempo para garantir que o Elements esteja totalmente inicializado
      const timer = setTimeout(() => {
        console.log('✅ Elements detectado, marcando como pronto');
        setElementsReady(true);
        
        // ✅ VERIFICAR SE O PAYMENTELEMENT ESTÁ NO DOM APÓS O DELAY
        setTimeout(() => {
          const paymentElement = document.querySelector('[data-elements-stable-field-name]');
          console.log('🔍 PaymentElement após Elements Ready:', paymentElement);
        }, 2000);
      }, 2000); // ✅ AUMENTADO PARA 2 SEGUNDOS
      
      return () => clearTimeout(timer);
    } else {
      setElementsReady(false);
    }
  }, [elements]);

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

    // ✅ VERIFICAR SE O PAYMENTELEMENT ESTÁ MONTADO NO DOM (MULTIPLOS SELETORES)
    const paymentElement = document.querySelector('[data-elements-stable-field-name]') || 
                          document.querySelector('[data-elements-stable-field-name="cardNumber"]') ||
                          document.querySelector('.ElementsApp') ||
                          document.querySelector('[class*="ElementsApp"]') ||
                          document.querySelector('[class*="Stripe"]') ||
                          document.querySelector('[class*="Payment"]') ||
                          document.querySelector('iframe[src*="stripe"]') ||
                          document.querySelector('div[class*="stripe"]');
                          
    if (!paymentElement) {
      console.error('❌ PaymentElement não encontrado no DOM');
      console.log('🔍 Tentando encontrar elementos Stripe:', {
        'data-elements-stable-field-name': document.querySelector('[data-elements-stable-field-name]'),
        'data-elements-stable-field-name="cardNumber"': document.querySelector('[data-elements-stable-field-name="cardNumber"]'),
        '.ElementsApp': document.querySelector('.ElementsApp'),
        '[class*="ElementsApp"]': document.querySelector('[class*="ElementsApp"]'),
        'Todos os elementos com data-*': document.querySelectorAll('[data-elements-stable-field-name]'),
        'Elementos com class*="Elements"': document.querySelectorAll('[class*="Elements"]'),
        'Elementos com class*="Stripe"': document.querySelectorAll('[class*="Stripe"]'),
        'Elementos com class*="Payment"': document.querySelectorAll('[class*="Payment"]')
      });
      setError('Formulário de pagamento não carregado. Recarregue a página.');
      return;
    }
    
    console.log('✅ PaymentElement encontrado no DOM:', paymentElement);

    setLoading(true);
    setError(null);

    try {
             // 1. Criar Payment Intent no backend
       const response = await api.post('/api/stripe/create-payment-intent', {
        planType: selectedPlan,
        userEmail: userData.email,
        userName: `${userData.first_name} ${userData.last_name}`,
        interval: selectedInterval
      });

       const { clientSecret } = response.data.data;

       // 2. Debug do elements antes de submit
       console.log('🔍 Elements antes do submit:', {
         elements: !!elements,
         elementsReady: elementsReady,
         paymentElementInDOM: !!document.querySelector('[data-elements-stable-field-name]'),
         elementsState: elements
       });

       // 3. Confirmar pagamento com Stripe Elements
       const { error: submitError } = await elements.submit();
       if (submitError) {
         throw new Error(submitError.message);
       }

       const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
         elements,
         clientSecret,
         confirmParams: {
           return_url: `${window.location.origin}/signup-success`,
           payment_method_data: {
             billing_details: {
               name: `${userData.first_name} ${userData.last_name}`,
               email: userData.email,
             },
           },
         },
         redirect: 'if_required',
       });

       if (paymentError) {
         throw new Error(paymentError.message);
       }

       // 3. Sucesso
       if (paymentIntent && paymentIntent.status === 'succeeded') {
         onSuccess(paymentIntent);
       } else {
         window.location.href = `${window.location.origin}/signup-success`;
      }

    } catch (err) {
      console.error('❌ Erro no checkout:', err);
      setError(err.response?.data?.message || err.message || 'Erro no processamento do pagamento');
      onError(err);
    } finally {
      setLoading(false);
    }
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
          <p>Elements Ready: {elementsReady ? '✅ Sim' : '❌ Não'}</p>
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
              {/* ✅ DEBUG: Status dos componentes */}
              {import.meta.env.DEV && (
                <div className="mb-3 p-2 bg-gray-800/50 rounded text-xs text-gray-300">
                  <p><strong>PaymentElement Debug:</strong></p>
                  <p>Stripe: {stripe ? '✅ Carregado' : '❌ Não carregado'}</p>
                  <p>Elements: {elements ? '✅ Carregado' : '❌ Não carregado'}</p>
                  <p>Elements Ready: {elementsReady ? '✅ Sim' : '❌ Não'}</p>
                  <p>ClientSecret: {clientSecret ? '✅ Presente' : '❌ Ausente'}</p>
                  <p>ClientSecret Length: {clientSecret ? clientSecret.length : 0}</p>
                  <p>ClientSecret Start: {clientSecret ? clientSecret.substring(0, 20) + '...' : 'N/A'}</p>
                </div>
              )}
              
              {stripe && elements && elementsReady && clientSecret ? (
                // ✅ DEBUG: Verificar estado antes de renderizar PaymentElement
                (() => {
                  console.log('🔍 Renderizando PaymentElement com:', {
                    stripe: !!stripe,
                    elements: !!elements,
                    elementsReady,
                    clientSecret: !!clientSecret,
                    clientSecretLength: clientSecret ? clientSecret.length : 0,
                    clientSecretStart: clientSecret ? clientSecret.substring(0, 20) + '...' : 'N/A',
                    elementsState: elements,
                    elementsReadyState: elementsReady
                  });
                  
                  // ✅ VERIFICAR SE O CLIENT SECRET É VÁLIDO
                  if (clientSecret && !clientSecret.startsWith('pi_')) {
                    console.error('❌ Client Secret inválido:', clientSecret);
                  }
                  
                  return true;
                })() && (
                <div>
                  <PaymentElement 
                    options={{
                      layout: 'tabs',
                      defaultValues: {
                        billingDetails: {
                          name: `${userData.first_name} ${userData.last_name}`,
                          email: userData.email,
                        },
                      },
                      // ✅ CONFIGURAÇÕES ESPECÍFICAS PARA DESENVOLVIMENTO
                      ...(import.meta.env.DEV && {
                        loader: 'always',
                        appearance: {
                          ...stripeConfig,
                          variables: {
                            ...stripeConfig.variables,
                            colorDanger: '#ef4444',
                          }
                        },
                        // ✅ DESABILITAR VERIFICAÇÕES DE SSL EM DESENVOLVIMENTO
                        clientSecret: clientSecret,
                        mode: 'payment'
                      })
                    }}
                    onLoadError={(error) => {
                      console.error('❌ Erro no PaymentElement:', error);
                      setError(`Erro ao carregar formulário: ${error.message}`);
                    }}
                    onReady={() => {
                      console.log('✅ PaymentElement carregado com sucesso!');
                      // ✅ VERIFICAR SE O ELEMENTO ESTÁ REALMENTE NO DOM
                      setTimeout(() => {
                        const paymentElement = document.querySelector('[data-elements-stable-field-name]');
                        console.log('🔍 PaymentElement DOM (delayed):', paymentElement);
                        if (!paymentElement) {
                          console.error('❌ PaymentElement ainda não está no DOM após onReady');
                          // ✅ DEBUG: Verificar todos os elementos possíveis
                          console.log('🔍 Debug DOM completo:', {
                            'data-elements-stable-field-name': document.querySelector('[data-elements-stable-field-name]'),
                            'data-elements-stable-field-name="cardNumber"': document.querySelector('[data-elements-stable-field-name="cardNumber"]'),
                            '.ElementsApp': document.querySelector('.ElementsApp'),
                            '[class*="ElementsApp"]': document.querySelector('[class*="ElementsApp"]'),
                            '[class*="Stripe"]': document.querySelector('[class*="Stripe"]'),
                            '[class*="Payment"]': document.querySelector('[class*="Payment"]'),
                            'iframe[src*="stripe"]': document.querySelector('iframe[src*="stripe"]'),
                            'div[class*="stripe"]': document.querySelector('div[class*="stripe"]'),
                            'Todos os divs': document.querySelectorAll('div').length,
                            'Todos os elementos com data-*': Array.from(document.querySelectorAll('[data-*]')).map(el => ({
                              tagName: el.tagName,
                              className: el.className,
                              dataset: el.dataset
                            }))
                          });
                        }
                      }, 500);
                    }}
                    onChange={(event) => {
                      console.log('🔄 PaymentElement onChange:', event);
                    }}
                  />
                  {error && (
                    <div className="mt-3 p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">{error}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* ✅ BOTÃO DE TESTE PARA VERIFICAR PAYMENTELEMENT */}
                  {import.meta.env.DEV && (
                    <div className="mt-3 p-2 bg-blue-500/20 border border-blue-400/30 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          const paymentElement = document.querySelector('[data-elements-stable-field-name]');
                          console.log('🔍 Teste PaymentElement:', {
                            found: !!paymentElement,
                            element: paymentElement,
                            elementsReady,
                            stripe: !!stripe,
                            elements: !!elements
                          });
                        }}
                        className="text-xs text-blue-300 hover:text-blue-200"
                      >
                        🔍 Testar PaymentElement
                      </button>
                    </div>
                  )}
                </div>
                )
              ) : (
                <div className="text-center py-4 text-cyan-300">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  {!stripe ? 'Carregando Stripe...' : !elements ? 'Carregando Elements...' : !elementsReady ? 'Inicializando Elements...' : !clientSecret ? 'Configurando formulário de pagamento...' : 'Carregando formulário de pagamento...'}
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
           disabled={!stripe || loading || !selectedPrice || !clientSecret}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
             loading || !selectedPrice || !clientSecret
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
           ) : !clientSecret ? (
             'Configurando pagamento...'
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
  // Estados do componente pai
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debug: Log das props recebidas
  console.log('🔍 StripeCheckout - Props recebidas:', {
    selectedPlan,
    userData: userData ? 'Presente' : 'Ausente',
    onSuccess: !!onSuccess,
    onError: !!onError
  });

  // Carregar clientSecret quando o plano for selecionado
  useEffect(() => {
    const loadClientSecret = async () => {
      if (!selectedPlan || !userData?.email || !userData?.first_name || !userData?.last_name) {
        return;
      }

      try {
        setLoading(true);
        const response = await api.post('/api/stripe/create-payment-intent', {
          planType: selectedPlan,
          userEmail: userData.email,
          userName: `${userData.first_name} ${userData.last_name}`,
          interval: 'monthly' // Por enquanto fixo
        });

        const { clientSecret: secret } = response.data.data;
        setClientSecret(secret);
      } catch (err) {
        console.error('❌ Erro ao criar Payment Intent:', err);
        setError(err.message || 'Erro ao configurar pagamento');
      } finally {
        setLoading(false);
      }
    };

    loadClientSecret();
  }, [selectedPlan, userData?.email, userData?.first_name, userData?.last_name]);

  // ✅ IMPORTANTE: Só renderizar Elements quando clientSecret estiver disponível
  if (!clientSecret) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Configurando Pagamento
        </h3>
        <p className="text-cyan-200">
          Aguarde enquanto preparamos seu checkout seguro
        </p>
      </div>
    );
  }

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

   if (loading) {
     return (
       <div className="text-center py-8">
         <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
         <h3 className="text-xl font-semibold text-white mb-2">
           Configurando Pagamento
         </h3>
         <p className="text-cyan-200">
           Aguarde enquanto preparamos seu checkout seguro
         </p>
       </div>
     );
   }

   if (error) {
     return (
       <div className="text-center py-8">
         <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
         <h3 className="text-xl font-semibold text-red-400 mb-2">
           Erro na Configuração
         </h3>
         <p className="text-red-300">{error}</p>
       </div>
     );
   }

  return (
    <Elements 
      key={`${clientSecret}-${Date.now()}`} // ✅ FORÇAR RE-RENDER A CADA MUDANÇA
      stripe={stripePromise}
      options={{
        clientSecret: clientSecret,
        appearance: stripeConfig,
        loader: 'always'
      }}
      onLoadError={(error) => {
        console.error('❌ Erro no Elements:', error);
        setError(`Erro ao carregar Stripe: ${error.message}`);
      }}
      onReady={() => {
        console.log('✅ Stripe Elements carregado com sucesso!');
        console.log('🔍 Elements Options:', { clientSecret: clientSecret.substring(0, 20) + '...', stripeConfig });
      }}
    >
      <CheckoutForm
        selectedPlan={selectedPlan}
        userData={userData}
        onSuccess={onSuccess}
        onError={onError}
         clientSecret={clientSecret}
         loading={loading}
         error={error}
         setError={setError}
         setLoading={setLoading}
      />
    </Elements>
  );
};

export default StripeCheckout;