// ==============================================
// CONFIGURAÇÕES DO STRIPE - MODO PRODUÇÃO
// ==============================================

// ✅ CONFIGURAÇÃO DO STRIPE
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// ✅ DEBUG: Log da chave sendo usada
console.log('🔍 Stripe Config - Chave:', {
  fromEnv: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  keyLength: publishableKey.length,
  keyValue: publishableKey.substring(0, 20) + '...'
});

export const STRIPE_CONFIG = {
  // Chave pública do Stripe (PRODUÇÃO)
  // Obtenha em: https://dashboard.stripe.com/apikeys
  publishableKey,
  
  // Configurações de aparência para produção
  appearance: {
    theme: 'stripe',
    variables: {
      colorPrimary: '#06b6d4',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  },
};
