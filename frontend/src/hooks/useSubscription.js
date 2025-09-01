import { useState, useCallback } from 'react';
import axios from 'axios';

/**
 * Hook para gerenciar assinaturas Stripe
 */
const useSubscription = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [setupIntent, setSetupIntent] = useState(null);

  // Criar SetupIntent
  const createSetupIntent = useCallback(async (customerId, planType, interval) => {
    try {
      setIsProcessing(true);
      setError(null);

      console.log('🔧 Criando SetupIntent:', { customerId, planType, interval });

      const response = await axios.post('/api/stripe/create-setup-intent', {
        customerId,
        planType,
        interval
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao criar SetupIntent');
      }

      const newSetupIntent = response.data.data.setupIntent;
      setSetupIntent(newSetupIntent);

      console.log('✅ SetupIntent criado:', newSetupIntent.id);

      return newSetupIntent;
    } catch (error) {
      console.error('❌ Erro ao criar SetupIntent:', error);
      const errorMessage = error.response?.data?.error || error.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // ✅ SetupIntent será confirmado no frontend
  const confirmSetupIntent = useCallback(async (clientSecret, paymentMethodId) => {
    try {
      setIsProcessing(true);
      setError(null);

      console.log('✅ Confirmando SetupIntent:', { clientSecret, paymentMethodId });

      const response = await axios.post('/api/stripe/confirm-setup-intent', {
        clientSecret,
        paymentMethodId
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao confirmar SetupIntent');
      }

      const confirmedIntent = response.data.data;
      console.log('✅ SetupIntent confirmado:', confirmedIntent.id);

      return confirmedIntent;
    } catch (error) {
      console.error('❌ Erro ao confirmar SetupIntent:', error);
      const errorMessage = error.response?.data?.error || error.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Criar assinatura
  const createSubscription = useCallback(async (customerId, planType, interval, paymentMethodId) => {
    try {
      setIsProcessing(true);
      setError(null);

      console.log('🚀 Criando assinatura:', { customerId, planType, interval, paymentMethodId });

      const response = await axios.post('/api/stripe/create-subscription', {
        customerId,
        planType,
        interval,
        paymentMethodId
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao criar assinatura');
      }

      const subscription = response.data.data;
      console.log('✅ Assinatura criada:', subscription.id);

      return subscription;
    } catch (error) {
      console.error('❌ Erro ao criar assinatura:', error);
      const errorMessage = error.response?.data?.error || error.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Limpar estados
  const clearStates = useCallback(() => {
    setError(null);
    setSetupIntent(null);
  }, []);

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isProcessing,
    error,
    setupIntent,
    createSetupIntent,
    confirmSetupIntent,
    createSubscription,
    clearStates,
    clearError
  };
};

export default useSubscription;
