import React, { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CheckCircle, CreditCard, Lock, Shield, Clock, Calendar, Zap } from 'lucide-react';
import api from '../utils/api';

// ✅ CONFIGURAÇÃO: Stripe (usar chave pública)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_...');

// ✅ COMPONENTE: Formulário de assinatura recorrente
const SubscriptionForm = ({ selectedPlan, selectedInterval, userData, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  // ✅ CRIAR ASSINATURA RECORRENTE
  const createSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Criando assinatura recorrente...', { selectedPlan, selectedInterval });

      const response = await api.post('/stripe/create-subscription', {
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

      if (response.data.success && response.data.data?.subscription) {
        console.log('✅ Assinatura criada:', response.data.data.subscription);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Erro ao criar assinatura');
      }
    } catch (err) {
      console.error('❌ Erro ao criar assinatura:', err);
      setError(err.message || 'Erro ao criar assinatura');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedPlan, selectedInterval, userData]);

  // ✅ PROCESSAR ASSINATURA
  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      // ✅ CRIAR ASSINATURA
      const subscriptionData = await createSubscription();

      // ✅ CONFIRMAR SETUP DO CARTÃO (não pagamento)
      const { error: setupError, setupIntent } = await stripe.confirmCardSetup(
        subscriptionData.setupIntent.client_secret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: {
              name: `${userData.first_name} ${userData.last_name}`,
              email: userData.email,
              phone: userData.phone
            }
          }
        }
      );

      if (setupError) {
        console.error('❌ Erro na configuração do cartão:', setupError);
        setError(setupError.message || 'Erro na validação do cartão');
      } else if (setupIntent.status === 'succeeded') {
        console.log('✅ Cartão configurado com sucesso:', setupIntent);
        
        // ✅ IMPORTANTE: Anexar método de pagamento à assinatura
        try {
          const attachResponse = await api.post('/stripe/attach-payment-method', {
            subscriptionId: subscriptionData.subscription.id,
            paymentMethodId: setupIntent.payment_method
          });
          
          if (attachResponse.data.success) {
            console.log('✅ Método de pagamento anexado à assinatura');
            
            // ✅ IMPORTANTE: Tentar login automático após sucesso
            try {
              console.log('🔄 Tentando login automático...');
              await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2s para webhook processar
              
              const loginResponse = await api.get(`/auth/check-auto-login/${userData.email}`);
              console.log('🔍 Resposta do login automático:', loginResponse.data);
              
              if (loginResponse.data.hasAutoLogin) {
                console.log('✅ Login automático disponível!');
              } else {
                console.log('⚠️ Login automático não disponível ainda');
                
                // ✅ IMPORTANTE: Limpar estado se login automático falhar
                try {
                  console.log('🧹 Limpando estado de autenticação...');
                  await api.post('/auth/force-clear-state', { email: userData.email });
                  console.log('✅ Estado limpo com sucesso');
                } catch (clearError) {
                  console.warn('⚠️ Erro ao limpar estado:', clearError);
                }
              }
            } catch (loginError) {
              console.warn('⚠️ Erro ao verificar login automático:', loginError);
              
              // ✅ IMPORTANTE: Limpar estado em caso de erro
              try {
                console.log('🧹 Limpando estado de autenticação após erro...');
                await api.post('/auth/force-clear-state', { email: userData.email });
                console.log('✅ Estado limpo com sucesso');
              } catch (clearError) {
                console.warn('⚠️ Erro ao limpar estado:', clearError);
              }
              
              // Não falhar o checkout por causa do login automático
            }
            
            setSucceeded(true);
            
            // ✅ NOTIFICAR SUCESSO
            if (onSuccess) {
              onSuccess({
                subscription: subscriptionData.subscription,
                setupIntent,
                planType: selectedPlan,
                interval: selectedInterval,
                userData
              });
            }
          } else {
            throw new Error('Falha ao anexar método de pagamento');
          }
        } catch (attachError) {
          console.error('❌ Erro ao anexar método de pagamento:', attachError);
          setError('Cartão validado, mas falha ao configurar assinatura. Tente novamente.');
        }
      }
    } catch (err) {
      console.error('❌ Erro no checkout:', err);
      setError(err.message || 'Erro no checkout');
      if (onError) onError(err);
    } finally {
      setProcessing(false);
    }
  }, [stripe, elements, selectedPlan, selectedInterval, userData, createSubscription, onSuccess, onError]);

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
    hidePostalCode: true,
  };

  if (succeeded) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Assinatura Ativada!</h3>
        <p className="text-cyan-200 mb-4">Seu free trial começou agora.</p>
        <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-lg p-4 max-w-sm mx-auto">
          <div className="flex items-center justify-center space-x-2 text-emerald-300 mb-2">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">Free Trial Ativo</span>
          </div>
          <p className="text-sm text-emerald-200">
            ✅ Cartão validado com sucesso!<br/>
            🎉 Seu free trial de 7 dias começou agora.<br/>
            💳 Após esse período, será cobrado automaticamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ✅ RESUMO DA ASSINATURA */}
      <div className="bg-gray-800/50 border border-cyan-400/30 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Resumo da Assinatura</h3>
        
        {/* ✅ PLANO E INTERVALO */}
        <div className="space-y-2 text-sm mb-4">
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

        {/* ✅ FREE TRIAL INFO */}
        <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-emerald-300 mb-2">
            <Zap className="w-4 h-4" />
            <span className="font-semibold text-sm">Free Trial de 7 Dias</span>
          </div>
          <p className="text-xs text-emerald-200">
            Teste gratuitamente por 7 dias. Após esse período, será cobrado automaticamente.
          </p>
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
          <p className="text-xs text-cyan-300 mt-2">
            💳 Seu cartão será validado agora. Nenhuma cobrança será feita durante o free trial.
          </p>
        </div>

        {/* ✅ BOTÃO DE ASSINATURA */}
        <button
          type="submit"
          disabled={!stripe || loading || processing}
          className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Criando assinatura...
            </span>
          ) : processing ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Configurando cartão...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <Calendar className="w-5 h-5 mr-2" />
              Ativar Free Trial
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

      {/* ✅ SEGURANÇA E INFORMAÇÕES */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center space-x-2 text-xs text-cyan-300">
          <Shield className="w-4 h-4" />
          <span>Pagamento seguro com Stripe</span>
        </div>
        <div className="flex items-center justify-center space-x-2 text-xs text-cyan-300">
          <CreditCard className="w-4 h-4" />
          <span>Seus dados nunca são armazenados</span>
        </div>
        <div className="flex items-center justify-center space-x-2 text-xs text-emerald-300">
          <Clock className="w-4 h-4" />
          <span>Cancelar a qualquer momento</span>
        </div>
      </div>
    </form>
  );
};

// ✅ COMPONENTE PRINCIPAL: Checkout de assinatura recorrente
const SubscriptionCheckout = ({ selectedPlan, selectedInterval, userData, onSuccess, onError }) => {
  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Ativar Assinatura</h2>
        <p className="text-cyan-200 text-sm">
          Comece seu free trial de 7 dias
        </p>
      </div>

      <Elements stripe={stripePromise}>
        <SubscriptionForm
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

export default SubscriptionCheckout;
