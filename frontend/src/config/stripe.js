import { loadStripe } from '@stripe/stripe-js';

// ✅ CONFIGURAÇÃO ÚNICA: Stripe Promise criado uma única vez
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_...';

// ✅ DEBUG: Verificar chave do Stripe
console.log('🔑 Configuração Stripe:', {
  hasKey: !!stripeKey,
  keyLength: stripeKey?.length,
  isTest: stripeKey?.includes('pk_test_'),
  isLive: stripeKey?.includes('pk_live_'),
  key: stripeKey?.substring(0, 20) + '...',
  envVars: {
    VITE_STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'Presente' : 'Ausente',
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE
  }
});

// ✅ VALIDAÇÃO: Verificar se a chave é válida
if (!stripeKey || stripeKey === 'pk_test_...' || stripeKey.length < 50) {
  console.error('❌ Chave do Stripe inválida ou não configurada:', {
    stripeKey,
    isValid: stripeKey && stripeKey !== 'pk_test_...' && stripeKey.length >= 50
  });
}

let stripePromise = null;

try {
  stripePromise = loadStripe(stripeKey);
  console.log('✅ Stripe Promise criado com sucesso:', !!stripePromise);
} catch (error) {
  console.error('❌ Erro ao criar Stripe Promise:', error);
  stripePromise = null;
}

export default stripePromise;
