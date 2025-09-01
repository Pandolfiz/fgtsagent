import React from 'react';
import usePaymentForm from '../hooks/usePaymentForm';

/**
 * Componente PaymentForm - Dados pessoais do usuário
 * Segue as regras do Cursor para validação em tempo real
 */
const PaymentForm = ({ 
  onFormChange, 
  errors: externalErrors,
  className = '',
  ...props 
}) => {
  const {
    formData,
    errors: hookErrors,
    handleFormChange,
    validateField
  } = usePaymentForm();

  // Usar erros externos se fornecidos, senão usar erros do hook
  const errors = externalErrors || hookErrors;

  const handleInputChange = (field, value) => {
    handleFormChange(field, value);
    onFormChange?.(field, value);
  };

  const handleInputBlur = (field, value) => {
    const error = validateField(field, value);
    if (error) {
      console.log(`❌ Erro de validação no campo ${field}:`, error);
    }
  };

  const renderField = (field, label, type = 'text', placeholder = '') => {
    const error = errors[field]; // ✅ CORRIGIDO: usar errors[field] diretamente
    const value = formData[field] || '';

    return (
      <div className="mb-4">
        <label 
          htmlFor={field} 
          className="block text-sm font-medium text-slate-200 mb-2"
        >
          {label}
          <span className="text-red-400 ml-1">*</span>
        </label>
        
        <input
          id={field}
          type={type}
          value={value}
          onChange={(e) => handleInputChange(field, e.target.value)}
          onBlur={(e) => handleInputBlur(field, e.target.value)}
          placeholder={placeholder}
          className={`
            w-full px-4 py-3 border rounded-xl shadow-sm bg-slate-700 text-slate-100
            placeholder-slate-400
            focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500
            transition-colors duration-200
            ${error 
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
              : 'border-slate-600 hover:border-slate-500'
            }
          `}
          {...props}
        />
        
        {error && (
          <p className="mt-2 text-sm text-red-400 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-slate-100 mb-2">
          Dados Pessoais
        </h3>
        <p className="text-slate-400">
          Preencha seus dados para continuar com a assinatura
        </p>
      </div>

      <div className="space-y-4">
        {/* Nome e Sobrenome */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField(
            'firstName', 
            'Nome', 
            'text', 
            'Digite seu nome'
          )}
          
          {renderField(
            'lastName', 
            'Sobrenome', 
            'text', 
            'Digite seu sobrenome'
          )}
        </div>

        {/* Email */}
        {renderField(
          'email', 
          'Email', 
          'email', 
          'seu@email.com'
        )}

        {/* Telefone */}
        {renderField(
          'phone', 
          'Telefone', 
          'tel', 
          '(11) 99999-9999'
        )}
      </div>

      {/* Mensagem de segurança */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-xl">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-blue-300 font-medium">Seus dados estão seguros</p>
            <p className="text-blue-400 text-sm mt-1">
              Utilizamos criptografia SSL e seguimos as diretrizes da LGPD para proteger suas informações.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;
