/**
 * Utilitário para testar 3D Secure
 * Use este arquivo para debug e testes
 */

export const test3DSecureFlow = async (stripe, clientSecret) => {
  console.log('🧪 Testando fluxo 3D Secure...');
  
  try {
    // 1. Tentar confirmar pagamento
    const { error, paymentIntent } = await stripe.confirmPayment({
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/payment/return`
      }
    });
    
    if (error) {
      console.error('❌ Erro na confirmação:', error);
      return { error, paymentIntent: null };
    }
    
    console.log('✅ Confirmação bem-sucedida:', paymentIntent);
    return { error: null, paymentIntent };
    
  } catch (err) {
    console.error('❌ Exceção na confirmação:', err);
    return { error: err, paymentIntent: null };
  }
};

export const simulate3DSecureReturn = () => {
  console.log('🔄 Simulando retorno do 3D Secure...');
  
  // Simular parâmetros de retorno
  const mockParams = {
    payment_intent: 'pi_test_123',
    payment_intent_client_secret: 'pi_test_123_secret_456',
    redirect_status: 'succeeded'
  };
  
  // Construir URL de retorno
  const returnUrl = new URL('/payment/return', window.location.origin);
  Object.entries(mockParams).forEach(([key, value]) => {
    returnUrl.searchParams.set(key, value);
  });
  
  console.log('🔗 URL de retorno simulada:', returnUrl.toString());
  return returnUrl.toString();
};
