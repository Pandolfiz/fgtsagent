import React, { useState, useCallback } from 'react';
import api from '../utils/api';

// ✅ COMPONENTE SIMPLIFICADO: StripeCheckout
const StripeCheckout = ({ 
  selectedPlan, 
  selectedInterval, 
  userData, 
  onSuccess, 
  onError 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ CRIAR CHECKOUT SESSION
  const openCheckout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Criando Checkout Session...');

      // ✅ DADOS SIMPLIFICADOS (sem loops circulares)
      const checkoutData = {
        planType: selectedPlan,
        userEmail: userData.email,
        userName: `${userData.first_name} ${userData.last_name}`,
        interval: selectedInterval,
        // ✅ DADOS ESSENCIAIS APENAS
        userData: {
          firstName: userData.first_name,
          lastName: userData.last_name,
          phone: userData.phone,
          password: userData.password,
          planType: selectedPlan,
          source: 'signup_with_plans'
        },
        // ✅ IMPORTANTE: false para subscription
        usePopup: false,
        // ✅ URLs simples (o session_id será armazenado no localStorage)
        successUrl: `${window.location.origin}/payment/success?plan=${selectedPlan}&status=success`,
        cancelUrl: `${window.location.origin}/payment/cancel?plan=${selectedPlan}&status=cancelled`
      };

      console.log('📤 Dados sendo enviados:', checkoutData);
      
      const response = await api.post('/stripe/create-checkout-session', checkoutData);
      
      if (response.data.success && response.data.data?.url) {
        console.log('✅ Checkout Session criada, redirecionando...');
        
        // ✅ ARMAZENAR: session_id no localStorage para a página de sucesso
        if (response.data.data.sessionId) {
          localStorage.setItem('stripe_session_id', response.data.data.sessionId);
          console.log('✅ Session ID armazenado no localStorage:', response.data.data.sessionId);
        }
        
        // ✅ REDIRECIONAR: Para o Stripe
        window.location.href = response.data.data.url;
      } else {
        throw new Error(response.data.message || 'Erro ao criar sessão');
      }
    } catch (err) {
      console.error('❌ Erro ao criar sessão:', err);
      setError(err.message || 'Erro ao criar sessão');
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  }, [selectedPlan, selectedInterval, userData, onError]);

  return (
    <>
      <button
        onClick={openCheckout}
        disabled={loading}
        className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Criando Checkout...' : 'Assinar Plano'}
      </button>

      {error && (
        <div className="mt-4 text-red-600 text-sm text-center">
          {error}
        </div>
      )}
    </>
  );
};

export default StripeCheckout;