import React, { useState, useEffect } from 'react';
import { X, CreditCard, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { Elements } from '@stripe/react-stripe-js';
import stripePromise from '../config/stripe.js';
import CheckoutForm from './StripeCheckout.jsx';

const PaymentModal = ({ 
  isOpen, 
  onClose, 
  selectedPlan, 
  userData, 
  onSuccess, 
  onError 
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // ✅ FECHAR: Modal com ESC ou clique fora
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('click', handleClickOutside);
      document.body.style.overflow = 'hidden'; // Prevenir scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // ✅ HANDLERS: Sucesso e erro do pagamento
  const handleSuccess = (data) => {
    setIsLoading(false);
    if (onSuccess) {
      onSuccess(data);
    }
    onClose();
  };

  const handleError = (error) => {
    setIsLoading(false);
    if (onError) {
      onError(error);
    }
  };

  // ✅ RENDER: Modal apenas quando aberto
  if (!isOpen) return null;

  return (
    <div className="modal-overlay fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="modal-content bg-gray-900 border border-cyan-500/30 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-cyan-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <CreditCard className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Finalizar Assinatura
              </h2>
              <p className="text-sm text-cyan-200">
                Plano {selectedPlan?.name || 'Premium'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors group"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
              <p className="text-cyan-200">Processando pagamento...</p>
            </div>
          ) : (
            <Elements stripe={stripePromise}>
              <CheckoutForm
                selectedPlan={selectedPlan}
                userData={userData}
                onSuccess={handleSuccess}
                onError={handleError}
                isModal={true}
              />
            </Elements>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-cyan-500/20 bg-gray-800/50">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
            <Lock className="w-4 h-4" />
            <span>Pagamento seguro via Stripe</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
