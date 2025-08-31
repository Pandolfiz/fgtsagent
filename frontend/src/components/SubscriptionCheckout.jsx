import React, { useState, useEffect } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';

// ✅ NOVO: Componente para criação de usuário no Stripe
const UserCreator = ({ onUserCreated, onError }) => {
  const [formData, setFormData] = useState({
    first_name: 'Teste',
    last_name: 'Usuário',
    email: 'teste@exemplo.com',
    phone: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log('🔍 Input change:', { name, value, currentFormData: formData });
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      console.log('🔍 New form data:', newData);
      return newData;
    });
  };

  const createUser = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      setError('Por favor, preencha todos os campos obrigatórios');
        return;
      }

    setIsCreating(true);
    setError(null);

    try {
      console.log('🔍 Criando usuário no Stripe...');
      
              const response = await axios.post('/api/stripe/create-customer', {
        name: `${formData.first_name} ${formData.last_name}`.trim(),
        email: formData.email,
        phone: formData.phone || undefined
      });

      if (response.data.success) {
        console.log('✅ Usuário criado no Stripe:', response.data.customer);
        onUserCreated(response.data.customer);
      } else {
        throw new Error(response.data.error || 'Erro ao criar usuário');
      }

    } catch (createError) {
      console.error('❌ Erro ao criar usuário:', createError);
      setError(`Erro ao criar usuário: ${createError.message}`);
      onError?.(createError);
    } finally {
      setIsCreating(false);
    }
  };

  console.log('🔍 UserCreator render:', { formData, isCreating, error });
  
  return (
    <div className="space-y-4">
      {/* ✅ TESTE: Campo simples para debug */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-medium text-yellow-800 mb-2">Teste de Campo</h4>
        <input
          type="text"
          value="Campo de teste"
          onChange={(e) => console.log('Teste input change:', e.target.value)}
          className="w-full px-3 py-2 border border-yellow-300 rounded-md"
          placeholder="Teste"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome *
          </label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Digite seu nome"
            style={{ pointerEvents: 'auto', userSelect: 'auto' }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sobrenome *
          </label>
          <input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Digite seu sobrenome"
            style={{ pointerEvents: 'auto', userSelect: 'auto' }}
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email *
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Digite seu email"
          style={{ pointerEvents: 'auto', userSelect: 'auto' }}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Telefone (opcional)
        </label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Digite seu telefone"
          style={{ pointerEvents: 'auto', userSelect: 'auto' }}
        />
      </div>
      
      <button
        type="button"
        onClick={createUser}
        disabled={isCreating}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
      >
        {isCreating ? 'Criando usuário...' : 'Criar usuário e continuar'}
      </button>
      
      {error && (
        <div className="mt-2 text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

// ✅ NOVO: Componente para seleção de plano e criação de SetupIntent
const PlanSelector = ({ userData, onSetupIntentCreated, onError }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  const plans = [
    {
      id: 'basic_monthly',
      name: 'Plano Básico',
      type: 'basic',
      price: 9990, // em centavos
      price_id: 'price_123456789',
      description: 'Funcionalidades básicas para começar'
    },
    {
      id: 'pro_monthly',
      name: 'Plano Pro',
      type: 'pro',
      price: 19990, // em centavos
      price_id: 'price_987654321',
      description: 'Funcionalidades avançadas para profissionais'
    },
    {
      id: 'enterprise_monthly',
      name: 'Plano Enterprise',
      type: 'enterprise',
      price: 49990, // em centavos
      price_id: 'price_456789123',
      description: 'Solução completa para empresas'
    }
  ];

  const createSetupIntent = async () => {
    if (!selectedPlan || !userData) {
      setError('Por favor, selecione um plano');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      console.log('🔍 Criando SetupIntent...');
      
              const response = await axios.post('/api/stripe/create-setup-intent', {
        customerId: userData.id,
        planId: selectedPlan.id
      });

      if (response.data.success) {
        console.log('✅ SetupIntent criado:', response.data.setupIntent);
        onSetupIntentCreated(response.data.setupIntent, selectedPlan);
      } else {
        throw new Error(response.data.error || 'Erro ao criar SetupIntent');
      }

    } catch (createError) {
      console.error('❌ Erro ao criar SetupIntent:', createError);
      setError(`Erro ao criar SetupIntent: ${createError.message}`);
      onError?.(createError);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedPlan?.id === plan.id
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedPlan(plan)}
          >
            <div className="text-center">
              <h3 className="font-medium text-gray-900">{plan.name}</h3>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                R$ {(plan.price / 100).toFixed(2)}/mês
              </p>
              <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      {selectedPlan && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-800">Plano Selecionado</h3>
          <p className="text-sm text-green-600 mt-1">
            {selectedPlan.name} - R$ {(selectedPlan.price / 100).toFixed(2)}/mês
          </p>
        </div>
      )}
      
      <button
        type="button"
        onClick={createSetupIntent}
        disabled={!selectedPlan || isCreating}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
      >
        {isCreating ? 'Criando SetupIntent...' : 'Continuar para Pagamento'}
      </button>
      
      {error && (
        <div className="mt-2 text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

// ✅ NOVO: Componente para criação de Payment Method
const PaymentMethodCreator = ({ userData, onPaymentMethodCreated, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  const createPaymentMethod = async () => {
    if (!stripe || !elements) {
      setError('Stripe não está disponível');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      console.log('🔍 Criando Payment Method...');
      
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
        billing_details: {
          name: `${userData.first_name || userData.name} ${userData.last_name || ''}`.trim(),
          email: userData.email || userData.email_address || ''
        }
      });

      if (error) {
        console.error('❌ Erro ao criar Payment Method:', error);
        setError(`Erro ao criar método de pagamento: ${error.message}`);
        onError?.(error);
        return;
      }

      if (paymentMethod) {
        console.log('✅ Payment Method criado com sucesso:', paymentMethod.id);
        onPaymentMethodCreated(paymentMethod);
      }

    } catch (createError) {
      console.error('❌ Erro inesperado ao criar Payment Method:', createError);
      setError('Erro inesperado ao criar método de pagamento');
      onError?.(createError);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 border border-gray-300 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dados do Cartão
        </label>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>
      
      <button
        type="button"
        onClick={createPaymentMethod}
        disabled={isCreating}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
      >
        {isCreating ? 'Criando método de pagamento...' : 'Criar método de pagamento'}
      </button>
      
      {error && (
        <div className="mt-2 text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

// ✅ NOVO: Componente para confirmação do SetupIntent
const SetupIntentConfirmer = ({ setupIntent, paymentMethod, userData, onSetupIntentConfirmed, onError }) => {
  const stripe = useStripe();
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState(null);

  const confirmSetupIntent = async () => {
    if (!stripe || !paymentMethod || !setupIntent) {
      setError('Dados necessários não estão disponíveis');
      return;
    }

    setIsConfirming(true);
    setError(null);

    try {
      console.log('🔍 Confirmando SetupIntent...');
      
      const result = await stripe.confirmCardSetup(setupIntent.client_secret, {
        payment_method: paymentMethod.id,
        mandate_data: {
          customer_acceptance: {
            type: 'online',
            online: {
              ip_address: '127.0.0.1', // ✅ Será substituído pelo IP real
              user_agent: navigator.userAgent
            }
          }
        }
      });

      if (result.error) {
        console.error('❌ Erro ao confirmar SetupIntent:', result.error);
        setError(`Erro ao confirmar SetupIntent: ${result.error.message}`);
        onError?.(result.error);
        return;
      }

      if (result.setupIntent) {
        console.log('✅ SetupIntent confirmado com sucesso:', result.setupIntent.id);
        onSetupIntentConfirmed(result.setupIntent);
      }

    } catch (confirmError) {
      console.error('❌ Erro inesperado ao confirmar SetupIntent:', confirmError);
      setError('Erro inesperado ao confirmar SetupIntent');
      onError?.(confirmError);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={confirmSetupIntent}
        disabled={isConfirming}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
      >
        {isConfirming ? 'Confirmando SetupIntent...' : 'Confirmar SetupIntent'}
      </button>
      
      {error && (
        <div className="mt-2 text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

// ✅ NOVO: Componente para criação da assinatura
const SubscriptionCreator = ({ setupIntent, paymentMethod, userData, plan, onSubscriptionCreated, onError }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  const createSubscription = async () => {
    if (!setupIntent || !paymentMethod || !plan) {
      setError('Dados necessários não estão disponíveis');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      console.log('🔍 Criando assinatura...');
      
              const response = await axios.post('/api/stripe/create-subscription', {
        customerId: userData.id,
        priceId: plan.price_id,
        paymentMethodId: paymentMethod.id,
        setupIntentId: setupIntent.id
      });

      if (response.data.success) {
        console.log('✅ Assinatura criada com sucesso:', response.data.subscription);
        onSubscriptionCreated(response.data.subscription);
      } else {
        throw new Error(response.data.error || 'Erro desconhecido ao criar assinatura');
      }

    } catch (createError) {
      console.error('❌ Erro ao criar assinatura:', createError);
      setError(`Erro ao criar assinatura: ${createError.message}`);
      onError?.(createError);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={createSubscription}
        disabled={isCreating}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
      >
        {isCreating ? 'Criando assinatura...' : 'Criar assinatura'}
      </button>
      
      {error && (
        <div className="mt-2 text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

// ✅ NOVO: Componente principal do checkout
const SubscriptionCheckoutInner = ({ onSuccess, onError }) => {
  const [step, setStep] = useState('user-creation'); // user-creation, plan-selection, payment-method, confirm, subscription
  const [userData, setUserData] = useState(null);
  const [plan, setPlan] = useState(null);
  const [setupIntent, setSetupIntent] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [confirmedSetupIntent, setConfirmedSetupIntent] = useState(null);
  const [error, setError] = useState(null);

  // ✅ NOVO: Handlers para cada etapa
  const handleUserCreated = (newUser) => {
    console.log('✅ Usuário criado no Stripe, avançando para seleção de plano...');
    setUserData(newUser);
    setStep('plan-selection');
  };

  const handleSetupIntentCreated = (newSetupIntent, selectedPlan) => {
    console.log('✅ SetupIntent criado, avançando para método de pagamento...');
    setSetupIntent(newSetupIntent);
    setPlan(selectedPlan);
    setStep('payment-method');
  };

  const handlePaymentMethodCreated = (newPaymentMethod) => {
    console.log('✅ Payment Method criado, avançando para confirmação...');
    setPaymentMethod(newPaymentMethod);
    setStep('confirm');
  };

  const handleSetupIntentConfirmed = (confirmedIntent) => {
    console.log('✅ SetupIntent confirmado, avançando para criação da assinatura...');
    setConfirmedSetupIntent(confirmedIntent);
    setStep('subscription');
  };

  const handleSubscriptionCreated = (subscription) => {
    console.log('✅ Assinatura criada com sucesso!');
      onSuccess?.(subscription);
  };

  const handleError = (error) => {
    console.error('❌ Erro em uma das etapas:', error);
    setError(error.message);
      onError?.(error);
  };

  // ✅ NOVO: Renderização baseada na etapa atual
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">
          <h3 className="font-medium">Erro no checkout</h3>
          <p className="text-sm mt-1">{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  console.log('🔍 SubscriptionCheckoutInner render:', { step, userData, plan, error });

  return (
    <div className="space-y-6">
      {/* ✅ Etapa 1: Criação de usuário */}
      {step === 'user-creation' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800">Etapa 1: Dados do Cliente</h3>
            <p className="text-sm text-blue-600 mt-1">
              Preencha seus dados para criar uma conta no Stripe.
            </p>
          </div>
          
          <UserCreator
            onUserCreated={handleUserCreated}
            onError={handleError}
          />
        </div>
      )}

      {/* ✅ Etapa 2: Seleção de plano e criação de SetupIntent */}
      {step === 'plan-selection' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-800">Etapa 2: Seleção de Plano</h3>
            <p className="text-sm text-green-600 mt-1">
              Usuário criado com sucesso. Agora selecione um plano para continuar.
            </p>
      </div>
      
          <PlanSelector
            userData={userData}
            onSetupIntentCreated={handleSetupIntentCreated}
            onError={handleError}
          />
        </div>
      )}

      {/* ✅ Etapa 3: Criar Payment Method */}
      {step === 'payment-method' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800">Etapa 3: Método de Pagamento</h3>
            <p className="text-sm text-blue-600 mt-1">
              SetupIntent criado com sucesso. Agora vamos criar o método de pagamento.
            </p>
      </div>
      
          <PaymentMethodCreator
            userData={userData}
            onPaymentMethodCreated={handlePaymentMethodCreated}
            onError={handleError}
          />
        </div>
      )}

      {/* ✅ Etapa 4: Confirmar SetupIntent */}
      {step === 'confirm' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-800">Etapa 4: Confirmação</h3>
            <p className="text-sm text-green-600 mt-1">
              Método de pagamento criado. Agora vamos confirmar o SetupIntent.
            </p>
          </div>
          
          <SetupIntentConfirmer
            setupIntent={setupIntent}
            paymentMethod={paymentMethod}
            userData={userData}
            onSetupIntentConfirmed={handleSetupIntentConfirmed}
            onError={handleError}
          />
        </div>
      )}
      
      {/* ✅ Etapa 5: Criar Assinatura */}
      {step === 'subscription' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-medium text-purple-800">Etapa 5: Assinatura</h3>
            <p className="text-sm text-purple-600 mt-1">
              SetupIntent confirmado. Agora vamos criar a assinatura.
            </p>
          </div>
          
          <SubscriptionCreator
            setupIntent={confirmedSetupIntent}
            paymentMethod={paymentMethod}
            userData={userData}
            plan={plan}
            onSubscriptionCreated={handleSubscriptionCreated}
            onError={handleError}
          />
        </div>
      )}

      {/* ✅ Progresso das etapas */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span className={step === 'user-creation' ? 'text-blue-600 font-medium' : ''}>
          1. Usuário
        </span>
        <span className={step === 'plan-selection' ? 'text-blue-600 font-medium' : ''}>
          2. Plano
        </span>
        <span className={step === 'payment-method' ? 'text-blue-600 font-medium' : ''}>
          3. Pagamento
        </span>
        <span className={step === 'confirm' ? 'text-blue-600 font-medium' : ''}>
          4. Confirmação
        </span>
        <span className={step === 'subscription' ? 'text-blue-600 font-medium' : ''}>
          5. Assinatura
        </span>
      </div>
    </div>
  );
};

// ✅ NOVO: Componente principal do checkout
const SubscriptionCheckout = ({ onSuccess, onError }) => {
  const [stripePromise, setStripePromise] = useState(null);
  const [error, setError] = useState(null);

  // ✅ NOVO: Carregar Stripe
  useEffect(() => {
    const loadStripeInstance = async () => {
      try {
        const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
        setStripePromise(stripe);
      } catch (loadError) {
        console.error('❌ Erro ao carregar Stripe:', loadError);
        setError('Erro ao carregar Stripe');
      }
    };

    loadStripeInstance();
  }, []);

  // ✅ NOVO: Handler de erro
  const handleError = (error) => {
    console.error('❌ Erro no checkout:', error);
    setError(error.message);
    onError?.(error);
  };

  // ✅ NOVO: Handler de sucesso
  const handleSuccess = (subscription) => {
    console.log('✅ Checkout concluído com sucesso:', subscription);
    onSuccess?.(subscription);
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">
          <h3 className="font-medium">Erro no checkout</h3>
          <p className="text-sm mt-1">{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Carregando Stripe...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Checkout da Assinatura
        </h2>

        <Elements stripe={stripePromise}>
      <SubscriptionCheckoutInner 
            onSuccess={handleSuccess}
            onError={handleError}
      />
    </Elements>
      </div>
    </div>
  );
};

export default SubscriptionCheckout;

/*
✅ EXEMPLO DE USO DO COMPONENTE:

<SubscriptionCheckout
  onSuccess={(subscription) => {
    console.log('Assinatura criada:', subscription);
    // Redirecionar para página de sucesso
  }}
  onError={(error) => {
    console.error('Erro no checkout:', error);
    // Mostrar mensagem de erro
  }}
/>

✅ NOVO FLUXO:
1. Etapa 1: Criação de usuário no Stripe (formulário editável)
2. Etapa 2: Seleção de plano e criação de SetupIntent
3. Etapa 3: Método de Pagamento (CardElement)
4. Etapa 4: Confirmação do SetupIntent
5. Etapa 5: Criação da Assinatura

⚠️ IMPORTANTE: O componente agora gerencia todo o fluxo internamente!
*/
