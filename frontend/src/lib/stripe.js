import { loadStripe } from '@stripe/stripe-js';
import { STRIPE_CONFIG } from '../config/stripe.config.js';

// ✅ DEBUG: Log da chave sendo usada para carregar o Stripe
console.log('🔍 Stripe.js - Carregando Stripe com chave:', {
  keyLength: STRIPE_CONFIG.publishableKey.length,
  keyValue: STRIPE_CONFIG.publishableKey.substring(0, 20) + '...'
});

// ✅ CARREGAR STRIPE COM CONFIGURAÇÕES DE PRODUÇÃO
// ⚠️ IMPORTANTE: Não recriar o stripePromise
const stripePromise = loadStripe(STRIPE_CONFIG.publishableKey);

// ✅ CONFIGURAÇÕES DE APARÊNCIA PARA PRODUÇÃO
export const stripeConfig = STRIPE_CONFIG.appearance;

// ✅ EXPORTAR STRIPE PROMISE ESTÁVEL
export { stripePromise }; 