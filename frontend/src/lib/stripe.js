import { loadStripe } from '@stripe/stripe-js';

// ✅ CARREGAR STRIPE COM CHAVE PÚBLICA
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ✅ DEBUG: Verificar chave do Stripe
console.log('🔑 Stripe.js - Configuração:', {
  hasKey: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  keyLength: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.length,
  isTest: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.includes('pk_test_'),
  isLive: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.includes('pk_live_'),
  key: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.substring(0, 20) + '...'
});

// ✅ VALIDAÇÃO: Verificar se a chave é válida
if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY === 'pk_test_...' || 
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY.length < 50) {
  console.error('❌ Chave do Stripe inválida ou não configurada');
}

export default stripePromise; 