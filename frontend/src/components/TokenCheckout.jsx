import React, { useState } from 'react';
import api from '../utils/api';

/**
 * Componente para checkout do produto de tokens
 * Usa a nova rota /api/stripe/create-token-checkout
 */
const TokenCheckout = ({ 
  customerEmail, 
  customerName, 
  onSuccess, 
  onError 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const openTokenCheckout = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Criando checkout para produto de tokens...');

      const response = await api.post('/stripe/create-token-checkout', {
        customerEmail,
        customerName,
        successUrl: `${window.location.origin}/success?plan=token-based&status=success`,
        cancelUrl: `${window.location.origin}/cancel?plan=token-based&status=cancelled`
      });

      if (response.data.success && response.data.data?.url) {
        // Armazenar session_id no localStorage
        if (response.data.data.sessionId) {
          localStorage.setItem('stripe_session_id', response.data.data.sessionId);
          console.log('✅ Session ID armazenado:', response.data.data.sessionId);
        }
        
        // Redirecionar para o Stripe
        window.location.href = response.data.data.url;
      } else {
        throw new Error(response.data.message || 'Erro ao criar checkout');
      }
    } catch (err) {
      console.error('❌ Erro ao criar checkout:', err);
      setError(err.message || 'Erro ao criar checkout');
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        onClick={openTokenCheckout}
        disabled={loading}
        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        {loading ? 'Criando Checkout...' : 'Assinar Plano por Tokens'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p className="font-medium">💰 Estrutura de Cobrança:</p>
        <ul className="mt-2 space-y-1 text-xs">
          <li>• R$ 400,00/mês com 4 milhões de tokens inclusos</li>
          <li>• R$ 100,00 para cada 8 milhões de tokens adicionais</li>
          <li>• Cobrança automática baseada no uso real</li>
        </ul>
      </div>
    </div>
  );
};

export default TokenCheckout;
