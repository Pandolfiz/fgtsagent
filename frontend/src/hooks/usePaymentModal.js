import { useState, useCallback } from 'react';

const usePaymentModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [userData, setUserData] = useState(null);

  // ✅ ABRIR: Modal de pagamento
  const openPaymentModal = useCallback((plan, user) => {
    setSelectedPlan(plan);
    setUserData(user);
    setIsOpen(true);
  }, []);

  // ✅ FECHAR: Modal de pagamento
  const closePaymentModal = useCallback(() => {
    setIsOpen(false);
    setSelectedPlan(null);
    setUserData(null);
  }, []);

  // ✅ HANDLER: Sucesso do pagamento
  const handlePaymentSuccess = useCallback((data) => {
    console.log('✅ Pagamento realizado com sucesso:', data);
    
    // ✅ ATUALIZAR: Estado da aplicação
    // Aqui você pode atualizar o contexto global, localStorage, etc.
    
    // ✅ NOTIFICAR: Usuário
    if (typeof window !== 'undefined' && window.showNotification) {
      window.showNotification('Pagamento realizado com sucesso!', 'success');
    }
    
    // ✅ FECHAR: Modal
    closePaymentModal();
    
    // ✅ REDIRECIONAR: Para dashboard ou página de sucesso
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard?payment=success';
    }
  }, [closePaymentModal]);

  // ✅ HANDLER: Erro do pagamento
  const handlePaymentError = useCallback((error) => {
    console.error('❌ Erro no pagamento:', error);
    
    // ✅ NOTIFICAR: Usuário
    if (typeof window !== 'undefined' && window.showNotification) {
      window.showNotification('Erro no pagamento. Tente novamente.', 'error');
    }
    
    // ✅ FECHAR: Modal
    closePaymentModal();
  }, [closePaymentModal]);

  return {
    isOpen,
    selectedPlan,
    userData,
    openPaymentModal,
    closePaymentModal,
    handlePaymentSuccess,
    handlePaymentError
  };
};

export default usePaymentModal;
