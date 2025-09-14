// ✅ CONFIGURAÇÃO: Payment Links do Stripe usando variáveis de ambiente
// Este arquivo centraliza todos os links de pagamento para evitar hardcoding
// 
// ✅ PARÂMETROS SUPORTADOS PELO STRIPE:
// - prefilled_email: Email do cliente
// - prefilled_name: Nome completo do cliente
// - prefilled_phone: Telefone do cliente

// ✅ CARREGAR: Variáveis de ambiente do Vite
const getPaymentLinks = () => {
  return {
    basic: {
      monthly: import.meta.env.VITE_STRIPE_BASIC_PAYMENT_LINK_MONTHLY || '',
      yearly: import.meta.env.VITE_STRIPE_BASIC_PAYMENT_LINK_YEARLY || ''
    },
    pro: {
      monthly: import.meta.env.VITE_STRIPE_PRO_PAYMENT_LINK_MONTHLY || '',
      yearly: import.meta.env.VITE_STRIPE_PRO_PAYMENT_LINK_YEARLY || ''
    },
    premium: {
      monthly: import.meta.env.VITE_STRIPE_PREMIUM_PAYMENT_LINK_MONTHLY || '',
      yearly: import.meta.env.VITE_STRIPE_PREMIUM_PAYMENT_LINK_YEARLY || ''
    }
  };
};

// ✅ FUNÇÃO: Obter link de pagamento para um plano específico com dados do usuário
export const getPaymentLink = (planType, interval, customerData = {}) => {
  const paymentLinks = getPaymentLinks();
  const baseLink = paymentLinks[planType]?.[interval];
  
  if (!baseLink) {
    console.warn(`⚠️ Payment Link não encontrado para: ${planType} - ${interval}`);
    return null;
  }
  
  // ✅ ADICIONAR: Parâmetros do cliente à URL
  const url = new URL(baseLink);
  
  // Adicionar email se fornecido
  if (customerData.email) {
    url.searchParams.set('prefilled_email', customerData.email);
  }
  
  // Adicionar nome se fornecido
  if (customerData.firstName && customerData.lastName) {
    url.searchParams.set('prefilled_name', `${customerData.firstName} ${customerData.lastName}`);
  } else if (customerData.firstName) {
    url.searchParams.set('prefilled_name', customerData.firstName);
  }
  
  // Adicionar telefone se fornecido
  if (customerData.phone) {
    url.searchParams.set('prefilled_phone', customerData.phone);
  }
  
  // ✅ ADICIONAR: URL de retorno para página de sucesso
  const returnUrl = `${window.location.origin}/signup/success`;
  url.searchParams.set('redirect_url', returnUrl);
  
  console.log('🔗 Payment Link com dados do cliente:', url.toString());
  return url.toString();
};

// ✅ FUNÇÃO: Verificar se todos os links necessários estão configurados
export const validatePaymentLinks = () => {
  const paymentLinks = getPaymentLinks();
  const missing = [];
  
  Object.entries(paymentLinks).forEach(([plan, intervals]) => {
    Object.entries(intervals).forEach(([interval, link]) => {
      if (!link) {
        missing.push(`${plan}.${interval}`);
      }
    });
  });
  
  if (missing.length > 0) {
    console.warn('⚠️ Payment Links não configurados:', missing);
    return false;
  }
  
  return true;
};

// ✅ FUNÇÃO: Obter todos os links (para debug)
export const getAllPaymentLinks = () => {
  return getPaymentLinks();
};

// ✅ DEBUG: Log da configuração atual
console.log('🔗 Payment Links configurados:', getPaymentLinks());

export default getPaymentLinks;
