import { loadStripe } from '@stripe/stripe-js';

// ✅ CONFIGURAÇÃO ÚNICA: Stripe Promise criado uma única vez
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_...';

// ✅ DEBUG: Verificar chave do Stripe
console.log('🔑 Configuração Stripe:', {
  hasKey: !!stripeKey,
  keyLength: stripeKey?.length,
  isTest: stripeKey?.includes('pk_test_'),
  isLive: stripeKey?.includes('pk_live_'),
  key: stripeKey?.substring(0, 20) + '...'
});

const stripePromise = loadStripe(stripeKey);

export default stripePromise;
