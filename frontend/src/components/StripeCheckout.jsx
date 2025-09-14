import React, { useState, useCallback } from 'react';
import api from '../utils/api';

// ✅ COMPONENTE SIMPLIFICADO: StripeCheckout - Usa Payment Links
const StripeCheckout = ({ 
  selectedPlan, 
  selectedInterval, 
  userData, 
  onSuccess, 
  onError 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ REDIRECIONAR PARA PAYMENT LINKS
  const openCheckout = useCallback(() => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Redirecionando para Payment Link...');

      // ✅ PAYMENT LINKS PARA TODOS OS PLANOS
      const paymentLinks = {
        basic: {
          monthly: 'https://buy.stripe.com/8x29ATdAo3kLbM8da35EY00',
          yearly: 'https://buy.stripe.com/dRm28r53SaNdbM82vp5EY07'
        },
        pro: {
          monthly: 'https://buy.stripe.com/fZu8wP9k808z03q7PJ5EY02',
          yearly: 'https://buy.stripe.com/9B6cN52VKdZp03q8TN5EY06'
        },
        premium: {
          monthly: 'https://buy.stripe.com/aFa00j53S08zdUg0nh5EY0b',
          yearly: 'https://buy.stripe.com/6oU9AT67W08z17u8TN5EY0c'
        }
      };

      const paymentLink = paymentLinks[selectedPlan]?.[selectedInterval];
      
      if (paymentLink) {
        console.log('✅ Redirecionando para:', paymentLink);
        window.location.href = paymentLink;
      } else {
        throw new Error('Link de pagamento não encontrado para o plano selecionado');
      }
    } catch (err) {
      console.error('❌ Erro ao redirecionar:', err);
      setError(err.message || 'Erro ao redirecionar para pagamento');
      if (onError) onError(err);
      setLoading(false);
    }
  }, [selectedPlan, selectedInterval, onError]);

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