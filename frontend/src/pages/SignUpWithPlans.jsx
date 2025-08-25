import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import PricingPlans from '../components/PricingPlans';
import StripeCheckout from '../components/StripeCheckout';
import NeuralNetworkBackground from '../NeuralNetworkBackground.jsx';
import LandingNavbar from '../components/LandingNavbar.jsx';
import axios from 'axios';

const SignUpWithPlans = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('pro'); // Default para o plano mais popular
  const [userData, setUserData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [consent, setConsent] = useState({
    terms: false,
    privacy: false,
    marketing: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    special: false
  });

  // ✅ FUNÇÃO: Calcular força da senha em tempo real
  const calculatePasswordStrength = useCallback((password) => {
    setPasswordStrength({
      length: password.length >= 8 && password.length <= 128,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password)
    });
  }, []);

  // ✅ useEffect: Atualizar força da senha quando mudar
  useEffect(() => {
    if (userData.password) {
      calculatePasswordStrength(userData.password);
    }
  }, [userData.password, calculatePasswordStrength]);

  // ✅ useEffect: Verificar se há dados salvos ou retorno de pagamento (APENAS UMA VEZ)
  useEffect(() => {
    // ✅ VERIFICAR: Se há dados salvos no localStorage
    try {
      const storedUserData = localStorage.getItem('signup_user_data');
      const storedStep = localStorage.getItem('signup_current_step');
      const storedPlan = localStorage.getItem('signup_selected_plan');
      
      if (storedUserData) {
        const parsed = JSON.parse(storedUserData);
        setUserData(parsed);
        
        // ✅ RECUPERAR: Step e plano salvos
        if (storedStep) {
          setCurrentStep(parseInt(storedStep));
        }
        
        if (storedPlan) {
          setSelectedPlan(storedPlan);
        } else {
          setSelectedPlan(parsed.planType || 'pro');
        }
        
        console.log('✅ SignUpWithPlans: Estado recuperado do localStorage:', {
          step: storedStep,
          plan: storedPlan,
          userData: parsed
        });
      }
    } catch (error) {
      console.error('❌ SignUpWithPlans: Erro ao recuperar dados salvos:', error);
    }

    // ✅ VERIFICAR: Se há dados de retorno de pagamento
    if (location.state) {
      const { step, userData: returnedUserData, selectedPlan: returnedPlan } = location.state;
      
      if (returnedUserData) {
        setUserData(returnedUserData);
        setSelectedPlan(returnedPlan || 'pro');
        setCurrentStep(step || 3); // Voltar para etapa de pagamento
      }
    }
  }, []); // ✅ IMPORTANTE: Sem dependências para rodar apenas uma vez

  // ✅ MEMOIZAR: Dados estáveis para evitar re-renderizações
  const stableUserData = useMemo(() => userData, [userData]);
  const stableSelectedPlan = useMemo(() => selectedPlan, [selectedPlan]);

  const steps = [
    { id: 1, title: 'Dados Pessoais', description: 'Informações básicas' },
    { id: 2, title: 'Escolher Plano', description: 'Selecione seu plano' },
    { id: 3, title: 'Pagamento', description: 'Finalize sua conta' }
  ];

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    const newUserData = {
      ...userData,
      [name]: value
    };
    
    setUserData(newUserData);
    setError(null);
    
    // ✅ PERSISTIR: Dados do usuário automaticamente
    try {
      localStorage.setItem('signup_user_data', JSON.stringify(newUserData));
    } catch (error) {
      console.error('❌ Erro ao salvar dados no localStorage:', error);
    }
  }, [userData]);

  const handleConsentChange = useCallback((type) => {
    setConsent(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
    setError(null);
  }, []);

  const validateStep1 = useCallback(() => {
    const { first_name, last_name, email, password, confirmPassword } = userData;

    if (!first_name.trim()) {
      setError('Nome é obrigatório');
      return false;
    }

    if (!last_name.trim()) {
      setError('Sobrenome é obrigatório');
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

    // ✅ VALIDAÇÃO DE SENHA FORTE: Mesmos requisitos do backend
    if (password.length < 8) {
      setError('Senha deve ter pelo menos 8 caracteres');
      return false;
    }

    if (password.length > 128) {
      setError('Senha deve ter no máximo 128 caracteres');
      return false;
    }

    // ✅ VERIFICAR: 1 letra minúscula
    if (!/[a-z]/.test(password)) {
      setError('Senha deve conter pelo menos 1 letra minúscula');
      return false;
    }

    // ✅ VERIFICAR: 1 letra maiúscula
    if (!/[A-Z]/.test(password)) {
      setError('Senha deve conter pelo menos 1 letra maiúscula');
      return false;
    }

    // ✅ VERIFICAR: 1 número
    if (!/\d/.test(password)) {
      setError('Senha deve conter pelo menos 1 número');
      return false;
    }

    // ✅ VERIFICAR: 1 caractere especial
    if (!/[@$!%*?&]/.test(password)) {
      setError('Senha deve conter pelo menos 1 caractere especial (@$!%*?&)');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Senhas não coincidem');
      return false;
    }

    // Validação de consentimentos obrigatórios
    if (!consent.terms) {
      setError('É necessário aceitar os Termos de Uso');
      return false;
    }

    if (!consent.privacy) {
      setError('É necessário aceitar a Política de Privacidade');
      return false;
    }

    return true;
  }, [userData, consent]);

  const handleNextStep = useCallback(() => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
    }

    if (currentStep === 2) {
      if (!selectedPlan) {
        setError('Selecione um plano para continuar');
        return;
      }
    }

    const newStep = Math.min(currentStep + 1, 3);
    setCurrentStep(newStep);
    setError(null);
    
    // ✅ PERSISTIR: Step atual
    localStorage.setItem('signup_current_step', newStep.toString());
  }, [currentStep, selectedPlan, validateStep1]);

  const handlePrevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError(null);
  }, []);

  const handleCheckoutSuccess = useCallback(async () => {
    // ✅ ARMAZENAR: Dados do usuário no localStorage para uso no login automático
    try {
      const userDataForStorage = {
        firstName: userData.first_name,
        lastName: userData.last_name,
        email: userData.email,
        fullName: `${userData.first_name} ${userData.last_name}`.trim(),
        phone: userData.phone,
        password: userData.password, // ✅ IMPORTANTE: Incluir senha para criação no webhook
        planType: selectedPlan,
        source: 'signup_with_plans',
        timestamp: new Date().toISOString()
      };
      
      // ✅ SALVAR: Dados completos no localStorage
      localStorage.setItem('signup_user_data', JSON.stringify(userDataForStorage));
      
      // ✅ LIMPAR: Dados temporários do signup
      localStorage.removeItem('signup_current_step');
      localStorage.removeItem('signup_selected_plan');
      
      console.log('✅ SignUpWithPlans: Dados do usuário salvos no localStorage:', userDataForStorage);
      
      // ✅ REDIRECIONAR: Para página de sucesso com dados completos
      navigate('/payment/success', {
        state: {
          userData: userDataForStorage,
          planType: selectedPlan,
          source: 'signup_with_plans',
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('❌ SignUpWithPlans: Erro ao salvar dados do usuário:', error);
      setError('Erro ao processar dados do usuário. Tente novamente.');
    }
  }, [userData, selectedPlan, navigate]);

  const handleCheckoutError = useCallback((error) => {
    setError(error.message || 'Erro no processamento do pagamento');
  }, []);

  const handleStepClick = useCallback((stepId) => {
    // Só permite navegar para etapas anteriores ou a atual
    if (stepId < currentStep) {
      setCurrentStep(stepId);
      setError('');
    }
  }, [currentStep]);

  const renderStepIndicator = useCallback(() => (
    <div className="flex items-center justify-center mb-2">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                currentStep >= step.id
                  ? 'bg-cyan-400 border-cyan-400 text-gray-900'
                  : 'border-cyan-400/30 text-cyan-400/30'
              }`}
            >
              {currentStep > step.id ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                step.id
              )}
            </div>
            <span className={`text-xs mt-1 ${
              currentStep >= step.id ? 'text-cyan-400' : 'text-cyan-400/30'
            }`}>
              {step.title}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-16 h-0.5 mx-2 ${
              currentStep > step.id ? 'bg-cyan-400' : 'bg-cyan-400/30'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  ), [currentStep, steps]);

  const renderStep1 = useCallback(() => (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">
        Dados Pessoais
      </h2>
      
      <form className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-cyan-200 text-sm mb-2">
              Nome <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={userData.first_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-400/30 rounded-lg text-white placeholder-cyan-300/50 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20"
              placeholder="Seu nome"
              required
            />
          </div>
          
          <div>
            <label htmlFor="last_name" className="block text-cyan-200 text-sm mb-2">
              Sobrenome <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={userData.last_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-400/30 rounded-lg text-white placeholder-cyan-300/50 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20"
              placeholder="Seu sobrenome"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-cyan-200 text-sm mb-2">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={userData.email}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-400/30 rounded-lg text-white placeholder-cyan-300/50 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20"
            placeholder="seu@email.com"
            required
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-cyan-200 text-sm mb-2">
            Telefone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={userData.phone}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-400/30 rounded-lg text-white placeholder-cyan-300/50 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20"
            placeholder="(11) 99999-9999"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-cyan-200 text-sm mb-2">
            Senha <span className="text-red-400">*</span>
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={userData.password}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-400/30 rounded-lg text-white placeholder-cyan-300/50 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20"
            placeholder="Sua senha"
            required
          />
          
          {/* ✅ INDICADOR: Força da senha */}
          {userData.password && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${passwordStrength.length ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className={passwordStrength.length ? 'text-green-400' : 'text-red-400'}>
                  Pelo menos 8 caracteres
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${passwordStrength.lowercase ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className={passwordStrength.lowercase ? 'text-green-400' : 'text-red-400'}>
                  Pelo menos 1 letra minúscula
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${passwordStrength.uppercase ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className={passwordStrength.uppercase ? 'text-green-400' : 'text-red-400'}>
                  Pelo menos 1 letra maiúscula
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${passwordStrength.number ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className={passwordStrength.number ? 'text-green-400' : 'text-red-400'}>
                  Pelo menos 1 número
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${passwordStrength.special ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className={passwordStrength.special ? 'text-green-400' : 'text-red-400'}>
                  Pelo menos 1 caractere especial (@$!%*?&)
                </span>
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-cyan-200 text-sm mb-2">
            Confirmar Senha <span className="text-red-400">*</span>
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={userData.confirmPassword}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-400/30 rounded-lg text-white placeholder-cyan-300/50 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20"
            placeholder="Confirme sua senha"
            required
          />
        </div>

        {/* ✅ CONSENTIMENTOS: Termos e políticas */}
        <div className="space-y-3">
          <h3 className="text-cyan-200 text-sm font-medium">Consentimentos</h3>
          
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="terms"
              checked={consent.terms}
              onChange={() => handleConsentChange('terms')}
              className="mt-1 w-4 h-4 text-cyan-600 bg-gray-800 border-cyan-500/30 rounded focus:ring-cyan-500"
            />
            <label htmlFor="terms" className="text-cyan-200 text-sm">
              Li e aceito os{' '}
              <a href="/terms" target="_blank" className="text-cyan-300 hover:text-cyan-100 underline">
                Termos de Uso
              </a>
              <span className="text-red-400"> *</span>
            </label>
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="privacy"
              checked={consent.privacy}
              onChange={() => handleConsentChange('privacy')}
              className="mt-1 w-4 h-4 text-cyan-600 bg-gray-800 border-cyan-500/30 rounded focus:ring-cyan-500"
            />
            <label htmlFor="privacy" className="text-cyan-200 text-sm">
              Li e aceito a{' '}
              <a href="/privacy-policy" target="_blank" className="text-cyan-300 hover:text-cyan-100 underline">
                Política de Privacidade
              </a>
              <span className="text-red-400"> *</span>
            </label>
          </div>

          {/* Marketing (Opcional) */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="marketing"
              checked={consent.marketing}
              onChange={() => handleConsentChange('marketing')}
              className="mt-1 w-4 h-4 text-cyan-600 bg-gray-800 border-cyan-500/30 rounded focus:ring-cyan-500"
            />
            <label htmlFor="marketing" className="text-cyan-200 text-sm">
              Aceito receber comunicações de marketing e ofertas personalizadas (opcional)
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
      </form>
    </div>
  ), [userData, consent, passwordStrength, handleInputChange, handleConsentChange, error]);

  const renderStep2 = useCallback(() => (
    <div>
      <PricingPlans
        selectedPlan={selectedPlan}
        onPlanSelect={(planType) => {
          setSelectedPlan(planType);
          
          // ✅ PERSISTIR: Plano selecionado
          localStorage.setItem('signup_selected_plan', planType);
        }}
      />
      {error && (
        <div className="max-w-md mx-auto mt-4">
          <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
            <p className="text-red-300 text-sm text-center">{error}</p>
          </div>
        </div>
      )}
    </div>
  ), [selectedPlan, error]);

  const renderStep3 = useCallback(() => (
    <div className="space-y-4">
      {/* ✅ DEBUG: Indicador visual de que estamos no step 3 */}
      <div className="bg-green-900/20 border border-green-400/30 rounded-lg p-4">
        <h3 className="text-green-200 text-sm mb-2">✅ Step 3: Checkout de Pagamento</h3>
        <p className="text-green-300 text-xs">Renderizando componente StripeCheckout...</p>
      </div>
      
      <StripeCheckout
        selectedPlan={stableSelectedPlan}
        userData={stableUserData}
        onSuccess={handleCheckoutSuccess}
        onError={handleCheckoutError}
      />
    </div>
  ), [stableSelectedPlan, stableUserData, handleCheckoutSuccess, handleCheckoutError]);

  const renderStepContent = useCallback(() => {
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
  }, [currentStep, renderStep1, renderStep2, renderStep3]);

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