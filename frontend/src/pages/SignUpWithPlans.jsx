import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import PricingPlans from '../components/PricingPlans';
import StripeCheckout from '../components/StripeCheckout';
import NeuralNetworkBackground from '../NeuralNetworkBackground.jsx';
import LandingNavbar from '../components/LandingNavbar.jsx';
import axios from 'axios';

const SignUpWithPlans = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('pro'); // Default para o plano mais popular
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const steps = [
    { id: 1, title: 'Dados Pessoais', description: 'Informações básicas' },
    { id: 2, title: 'Escolher Plano', description: 'Selecione seu plano' },
    { id: 3, title: 'Pagamento', description: 'Finalize sua conta' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const validateStep1 = () => {
    const { name, email, password, confirmPassword } = userData;
    
    if (!name.trim()) {
      setError('Nome é obrigatório');
      return false;
    }
    
    if (!email.trim()) {
      setError('Email é obrigatório');
      return false;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email inválido');
      return false;
    }
    
    if (!password) {
      setError('Senha é obrigatória');
      return false;
    }
    
    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Senhas não coincidem');
      return false;
    }
    
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
    }
    
    if (currentStep === 2) {
      if (!selectedPlan) {
        setError('Selecione um plano para continuar');
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 3));
    setError(null);
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError(null);
  };

  const handleCheckoutSuccess = async () => {
    // O checkout redirect do Stripe cuidará do redirecionamento
    console.log('Checkout iniciado com sucesso');
  };

  const handleCheckoutError = (error) => {
    setError(error.message || 'Erro no processamento do pagamento');
  };

  const handleStepClick = (stepId) => {
    // Só permite navegar para etapas anteriores ou a atual
    if (stepId < currentStep) {
      setCurrentStep(stepId);
      setError('');
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-2">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                currentStep >= step.id
                  ? 'bg-cyan-400 border-cyan-400 text-gray-900'
                  : 'border-cyan-400/30 text-cyan-300'
              } ${
                step.id < currentStep 
                  ? 'cursor-pointer hover:bg-cyan-300 hover:border-cyan-300' 
                  : step.id === currentStep 
                    ? 'cursor-default' 
                    : 'cursor-not-allowed opacity-60'
              }`}
              onClick={() => handleStepClick(step.id)}
              title={step.id < currentStep ? `Voltar para ${step.title}` : step.title}
            >
              {currentStep > step.id ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <span className="text-xs">{step.id}</span>
              )}
            </div>
            <div className="mt-0.5 text-center hidden sm:block">
              <p 
                className={`text-xs font-medium ${
                  currentStep >= step.id ? 'text-cyan-300' : 'text-cyan-200/60'
                } ${
                  step.id < currentStep ? 'cursor-pointer hover:text-cyan-200' : ''
                }`}
                onClick={() => handleStepClick(step.id)}
                title={step.id < currentStep ? `Voltar para ${step.title}` : step.title}
              >
                {step.title}
              </p>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-8 h-0.5 mx-1 transition-colors ${
              currentStep > step.id ? 'bg-cyan-400' : 'bg-cyan-400/30'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="max-w-md mx-auto">
      <div className="bg-white/10 rounded-xl shadow-2xl backdrop-blur-lg border border-cyan-400/30 p-4 card-futuristic">
        <div className="text-center mb-3">
          <h2 className="text-xl font-bold text-white mb-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500 text-transparent bg-clip-text drop-shadow-neon">
            Criar Sua Conta
          </h2>
          <p className="text-cyan-200 text-sm">
            Preencha seus dados para começar
          </p>
        </div>

        <form className="space-y-2">
          <div>
            <label className="block text-cyan-200 mb-0.5 text-sm">
              Nome Completo
            </label>
            <input
              type="text"
              name="name"
              value={userData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white/10 text-white placeholder-cyan-200 border border-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition"
              placeholder="Seu nome completo"
              required
            />
          </div>

          <div>
            <label className="block text-cyan-200 mb-0.5 text-sm">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={userData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white/10 text-white placeholder-cyan-200 border border-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-cyan-200 mb-0.5 text-sm">
              Telefone (Opcional)
            </label>
            <input
              type="tel"
              name="phone"
              value={userData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white/10 text-white placeholder-cyan-200 border border-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div>
            <label className="block text-cyan-200 mb-0.5 text-sm">
              Senha
            </label>
            <input
              type="password"
              name="password"
              value={userData.password}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white/10 text-white placeholder-cyan-200 border border-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          <div>
            <label className="block text-cyan-200 mb-0.5 text-sm">
              Confirmar Senha
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={userData.confirmPassword}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white/10 text-white placeholder-cyan-200 border border-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition"
              placeholder="Confirme sua senha"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <PricingPlans
        selectedPlan={selectedPlan}
        onPlanSelect={setSelectedPlan}
      />
      {error && (
        <div className="max-w-md mx-auto mt-4">
          <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
            <p className="text-red-300 text-sm text-center">{error}</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <StripeCheckout
      selectedPlan={selectedPlan}
      userData={userData}
      onSuccess={handleCheckoutSuccess}
      onError={handleCheckoutError}
    />
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return renderStep1();
    }
  };

  return (
    <>
      <LandingNavbar />
      <div className="relative h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 animate-gradient-move overflow-hidden pt-20 pb-4">
        <NeuralNetworkBackground />
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {renderStepIndicator()}
        
        <div className="mb-4">
          {renderStepContent()}
        </div>

        {/* Navigation buttons */}
        {currentStep < 3 && (
          <div className="flex justify-center space-x-4 mb-4">
            {currentStep > 1 && (
              <button
                onClick={handlePrevStep}
                className="flex items-center px-4 py-2 text-sm border border-cyan-400/30 rounded-lg text-cyan-200 hover:bg-cyan-900/30 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </button>
            )}
            
            <button
              onClick={handleNextStep}
              disabled={loading}
              className="flex items-center px-4 py-2 text-sm bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 text-white rounded-lg hover:from-cyan-800 hover:via-cyan-600 hover:to-blue-700 transition border border-cyan-400/30 drop-shadow-neon disabled:opacity-50"
            >
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center">
          <p className="text-cyan-200 text-xs">
            Já tem uma conta?{' '}
            <a href="/login" className="text-cyan-300 hover:underline font-semibold">
              Faça login aqui
            </a>
          </p>
        </div>
      </div>
      </div>
    </>
  );
};

export default SignUpWithPlans; 