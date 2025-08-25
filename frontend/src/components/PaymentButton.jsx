import React from 'react';
import { CreditCard, Zap } from 'lucide-react';
import usePaymentModal from '../hooks/usePaymentModal.js';
import PaymentModal from './PaymentModal.jsx';

const PaymentButton = ({ plan, userData, children, variant = 'primary', size = 'md' }) => {
  const {
    isOpen,
    openPaymentModal,
    closePaymentModal,
    handlePaymentSuccess,
    handlePaymentError
  } = usePaymentModal();

  // ✅ HANDLER: Abrir modal de pagamento
  const handlePaymentClick = () => {
    if (!plan) {
      console.error('❌ Plano não fornecido para PaymentButton');
      return;
    }
    
    if (!userData) {
      console.error('❌ Dados do usuário não fornecidos para PaymentButton');
      return;
    }
    
    console.log('🚀 Abrindo modal de pagamento para:', { plan, userData });
    openPaymentModal(plan, userData);
  };

  // ✅ STYLES: Variantes do botão
  const getButtonStyles = () => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const variants = {
      primary: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl',
      secondary: 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600',
      success: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white',
      warning: 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white'
    };
    
    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };
    
    return `${baseStyles} ${variants[variant]} ${sizes[size]}`;
  };

  return (
    <>
      {/* ✅ BOTÃO: Abrir modal de pagamento */}
      <button
        onClick={handlePaymentClick}
        className={getButtonStyles()}
        disabled={!plan || !userData}
      >
        <CreditCard className="w-4 h-4 mr-2" />
        {children || 'Assinar Plano'}
      </button>

      {/* ✅ MODAL: Pagamento em popup */}
      <PaymentModal
        isOpen={isOpen}
        onClose={closePaymentModal}
        selectedPlan={plan}
        userData={userData}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </>
  );
};

export default PaymentButton;
