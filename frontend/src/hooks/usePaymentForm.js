import { useState, useCallback } from 'react';

/**
 * Hook para gerenciar formulário de pagamento com validação em tempo real
 * Conforme especificado no STRIPE_INTEGRATION_PLAN.md
 */
const usePaymentForm = () => {
  const [cardComplete, setCardComplete] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  // Atualizar estado do cartão - CONFORME PLANO
  const handleCardChange = useCallback((event) => {
    setCardComplete(event.complete);
    
    if (event.error) {
      setErrors(prev => ({ ...prev, card: event.error.message }));
    } else {
      setErrors(prev => ({ ...prev, card: null }));
    }
  }, []);

  // Verificar se formulário é válido - CONFORME PLANO
  const isFormValid = useCallback(() => {
    return cardComplete && 
           formData.firstName && 
           formData.lastName && 
           formData.email &&
           !Object.values(errors).some(error => error);
  }, [cardComplete, formData, errors]);

  // Atualizar dados do formulário
  const handleFormChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  }, [errors]);

  // Validar campo específico
  const validateField = useCallback((field, value) => {
    let error = null;

    switch (field) {
      case 'firstName':
        if (!value.trim()) {
          error = 'Nome é obrigatório';
        } else if (value.trim().length < 2) {
          error = 'Nome deve ter pelo menos 2 caracteres';
        }
        break;

      case 'lastName':
        if (!value.trim()) {
          error = 'Sobrenome é obrigatório';
        } else if (value.trim().length < 2) {
          error = 'Sobrenome deve ter pelo menos 2 caracteres';
        }
        break;

      case 'email':
        if (!value.trim()) {
          error = 'Email é obrigatório';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Email deve ser válido';
        }
        break;

      case 'phone':
        if (!value.trim()) {
          error = 'Telefone é obrigatório';
        } else if (!/^\(\d{2}\) \d{5}-\d{4}$/.test(value)) {
          error = 'Telefone deve estar no formato (11) 99999-9999';
        }
        break;

      default:
        break;
    }

    return error;
  }, []);

  // Validar campo ao perder foco
  const handleFieldBlur = useCallback((field) => {
    const value = formData[field];
    const error = validateField(field, value);
    
    setErrors(prev => ({ ...prev, [field]: error }));
  }, [formData, validateField]);

  // Limpar todos os erros
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Definir erro geral
  const setGeneralError = useCallback((message) => {
    setErrors(prev => ({ ...prev, general: message }));
  }, []);

  // Limpar formulário
  const clearForm = useCallback(() => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    });
    setErrors({});
    setCardComplete(false);
  }, []);

  return {
    cardComplete,
    formData,
    errors,
    handleCardChange,
    handleFormChange,
    handleFieldBlur,
    validateField,
    isFormValid,
    clearErrors,
    setGeneralError,
    clearForm
  };
};

export default usePaymentForm;
