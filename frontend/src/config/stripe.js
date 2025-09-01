import { loadStripe } from '@stripe/stripe-js';

// ✅ CARREGAR STRIPE COM CHAVE PÚBLICA
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ✅ DEBUG: Verificar chave do Stripe
console.log('🔑 Configuração Stripe:', {
  hasKey: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  keyLength: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.length,
  isTest: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.includes('pk_test_'),
  isLive: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.includes('pk_live_'),
  key: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.substring(0, 20) + '...',
  envVars: {
    VITE_STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'Presente' : 'Ausente',
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE
  }
});

// ✅ VALIDAÇÃO: Verificar se a chave é válida
if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY === 'pk_test_...' || 
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY.length < 50) {
  console.error('❌ Chave do Stripe inválida ou não configurada:', {
    stripeKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    isValid: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY && 
             import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY !== 'pk_test_...' && 
             import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY.length >= 50
  });
}

// Configuração moderna do Payment Element (2025)
export const paymentElementOptions = {
  layout: {
    type: 'accordion', // Melhor para mobile no Brasil
    defaultCollapsed: false,
    radios: true,
    spacedAccordionItems: false
  },
  appearance: {
    theme: 'flat', // 'stripe' | 'night' | 'flat'
    variables: {
      colorPrimary: '#3b82f6',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      colorSuccess: '#10b981',
      colorWarning: '#f59e0b',
      fontFamily: 'Inter, system-ui, sans-serif',
      borderRadius: '8px',
      spacingUnit: '4px'
    },
    rules: {
      '.Tab': {
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      },
      '.Tab:hover': {
        borderColor: '#3b82f6',
        color: '#3b82f6'
      },
      '.Tab--selected': {
        borderColor: '#3b82f6',
        backgroundColor: '#eff6ff'
      }
    }
  },
  fields: {
    billingDetails: 'never' // Brasil: não coletar endereço de cobrança
  },
  terms: {
    card: 'never', // 'auto' | 'never' | 'required'
    sepaDebit: 'never',
    usBankAccount: 'never'
  }
};

// Configuração específica para Brasil
export const brazilPaymentElementOptions = {
  ...paymentElementOptions,
  layout: {
    ...paymentElementOptions.layout,
    type: 'accordion', // Melhor para mobile no Brasil
    defaultCollapsed: false
  },
  appearance: {
    ...paymentElementOptions.appearance,
    variables: {
      ...paymentElementOptions.appearance.variables,
      colorPrimary: '#10b981', // Verde brasileiro
      colorBackground: '#f9fafb',
      colorText: '#1f2937'
    }
  },
  fields: {
    billingDetails: 'never', // Brasil: não coletar endereço
    name: 'auto',
    email: 'auto',
    phone: 'auto'
  }
};

// Configuração do Express Checkout Element
export const expressCheckoutOptions = {
  paymentMethodTypes: ['card'], // Link não disponível no Brasil
  layout: {
    maxColumns: 1, // Melhor para mobile
    maxRows: 2
  }
};

// Configuração específica para Brasil do Express Checkout
export const brazilExpressCheckoutOptions = {
  paymentMethodTypes: ['card'],
  layout: {
    maxColumns: 1,
    maxRows: 3
  }
};

// Configuração do Elements Provider
export const elementsOptions = {
  mode: 'subscription',
  currency: 'brl',
  paymentMethodTypes: ['card'],
  appearance: paymentElementOptions.appearance
};

// Configuração específica para Brasil do Elements Provider
export const brazilElementsOptions = {
  mode: 'subscription',
  currency: 'brl',
  paymentMethodTypes: ['card'],
  appearance: brazilPaymentElementOptions.appearance
};

// ✅ EXPORTAR STRIPE PROMISE
export default stripePromise;
