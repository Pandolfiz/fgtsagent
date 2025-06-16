// Serviço para integração com Stripe
// Este arquivo fornece funções para buscar produtos e preços do Stripe

// Configuração de cupons do Stripe
export const STRIPE_COUPONS = {
  EARLY_USER: {
    id: 'zn9LzD2a',
    name: 'earlyUser',
    percentOff: 50,
    duration: 'forever',
    description: '50% de desconto para usuários pioneiros'
  }
};

// Configuração base dos produtos do Stripe
export const STRIPE_PRODUCTS = {
  BASIC: {
    productId: 'prod_STalRE6RzVNTUu',
    priceId: 'price_1RYdaBRrfRhcM17zE4rOKO9U',
    name: 'FGTS Agent - Plano Básico',
    price: 9999, // centavos
    formattedPrice: 'R$ 99,99'
  },
  PRO: {
    productId: 'prod_STalhjSBTyHza7',
    priceId: 'price_1RYdaFRrfRhcM17zecmj0hhT',
    name: 'FGTS Agent - Plano Pro',
    price: 19999, // centavos
    formattedPrice: 'R$ 199,99'
  },
  PREMIUM: {
    productId: 'prod_STalNWvSe9GqRs',
    priceId: 'price_1RYdaJRrfRhcM17zJsOCBmmi',
    name: 'FGTS Agent - Plano Premium',
    price: 49999, // centavos
    formattedPrice: 'R$ 499,99'
  }
};

// Função para formatar preços do Stripe (centavos) para reais
export function formatStripePriceToReal(priceInCents) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(priceInCents / 100);
}

// Função para buscar produtos do Stripe (para uso futuro com API)
export async function fetchStripeProducts() {
  try {
    // Esta função será implementada quando houver endpoint para buscar do Stripe
    // Por enquanto retorna os dados hardcoded
    return Object.values(STRIPE_PRODUCTS);
  } catch (error) {
    console.error('Erro ao buscar produtos do Stripe:', error);
    return Object.values(STRIPE_PRODUCTS);
  }
}

// Função para obter URL de checkout do Stripe
export function getStripeCheckoutUrl(priceId, successUrl, cancelUrl) {
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  return `${baseUrl}/api/stripe/checkout?price_id=${priceId}&success_url=${encodeURIComponent(successUrl)}&cancel_url=${encodeURIComponent(cancelUrl)}`;
}

// Função para validar se um preço existe no Stripe
export function isValidStripePriceId(priceId) {
  return Object.values(STRIPE_PRODUCTS).some(product => product.priceId === priceId);
}

// Função para obter detalhes de um produto pelo priceId
export function getProductByPriceId(priceId) {
  return Object.values(STRIPE_PRODUCTS).find(product => product.priceId === priceId);
}

// Função para calcular preço com desconto do cupom
export function calculateDiscountedPrice(originalPrice, couponId) {
  const coupon = Object.values(STRIPE_COUPONS).find(c => c.id === couponId);
  if (!coupon) return originalPrice;
  
  if (coupon.percentOff) {
    return originalPrice * (1 - coupon.percentOff / 100);
  }
  
  return originalPrice;
}

// Função para formatar preço com desconto
export function formatDiscountedPrice(originalPrice, couponId) {
  const discountedPrice = calculateDiscountedPrice(originalPrice, couponId);
  const coupon = Object.values(STRIPE_COUPONS).find(c => c.id === couponId);
  
  return {
    original: formatStripePriceToReal(originalPrice),
    discounted: formatStripePriceToReal(discountedPrice),
    discount: coupon?.percentOff || 0,
    savings: formatStripePriceToReal(originalPrice - discountedPrice)
  };
}

export default {
  STRIPE_PRODUCTS,
  STRIPE_COUPONS,
  formatStripePriceToReal,
  fetchStripeProducts,
  getStripeCheckoutUrl,
  isValidStripePriceId,
  getProductByPriceId,
  calculateDiscountedPrice,
  formatDiscountedPrice
}; 