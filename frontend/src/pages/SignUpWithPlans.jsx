import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import PricingPlans from '../components/PricingPlans';

import StepIndicator from '../components/StepIndicator';
import NeuralNetworkBackground from '../NeuralNetworkBackground.jsx';
import LandingNavbar from '../components/LandingNavbar.jsx';
import axios from 'axios';

const SignUpWithPlans = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [selectedInterval, setSelectedInterval] = useState('monthly');
  
  // ✅ REMOVIDO: Console.log que causava re-renderizações infinitas
  
  const [userData, setUserData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    planType: 'pro',
    interval: 'monthly'
  });
  const [consent, setConsent] = useState({
    terms: false,
    privacy: false,
    marketing: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // ✅ SIMPLIFICADO: Estado do email para validação
  const [emailStatus, setEmailStatus] = useState({
    exists: false,
    message: ''
  });
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    special: false
  });

  // ✅ FUNÇÃO: Calcular força da senha em tempo real (simplificada)
  const calculatePasswordStrength = (password) => {
    setPasswordStrength({
      length: password.length >= 6 && password.length <= 128,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password)
    });
  };

  // ✅ useEffect: Atualizar força da senha quando mudar
  useEffect(() => {
    if (userData.password) {
      calculatePasswordStrength(userData.password);
    }
  }, [userData.password]); // ✅ Dependência correta

  // ✅ useEffect: Verificar se há dados salvos ou retorno de pagamento (APENAS UMA VEZ)
  useEffect(() => {
    console.log('🚀 SignUpWithPlans: Inicializando...');
    
    // ✅ VERIFICAR: Se há dados salvos no localStorage
    try {
              const storedUserData = localStorage.getItem('signup_user_data');
        const storedStep = localStorage.getItem('signup_current_step');
        const storedPlan = localStorage.getItem('signup_selected_plan');
        const storedInterval = localStorage.getItem('signup_selected_interval');
        
        if (storedUserData) {
          const parsed = JSON.parse(storedUserData);
        console.log('📋 Dados recuperados do localStorage:', parsed);
          setUserData(parsed);
          
          // ✅ RECUPERAR: Step, plano e intervalo salvos
          if (storedStep) {
            setCurrentStep(parseInt(storedStep));
          }
          
          if (storedPlan) {
            setSelectedPlan(storedPlan);
        } else if (parsed.planType) {
          setSelectedPlan(parsed.planType);
          }
          
          if (storedInterval) {
            setSelectedInterval(storedInterval);
        } else if (parsed.interval) {
          setSelectedInterval(parsed.interval);
        }
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
        setCurrentStep(step || 2); // Corrigido para etapa 2
      }
    }

    console.log('🚀 SignUpWithPlans: Inicialização concluída');
  }, []); // ✅ SEM dependências para evitar re-renderizações infinitas

  const steps = [
    { id: 1, title: 'Dados Pessoais', description: 'Informações básicas' },
         { id: 2, title: 'Escolher Plano', description: 'Selecione seu plano e continue para pagamento' }
  ];



    const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    
    console.log('🔍 handleInputChange:', { name, value });
    
    setUserData(prevUserData => {
      const newUserData = {
        ...prevUserData,
        [name]: value
      };
      
      // ✅ PERSISTIR: Dados do usuário automaticamente
      try {
        localStorage.setItem('signup_user_data', JSON.stringify(newUserData));
      } catch (error) {
        console.error('❌ Erro ao salvar dados no localStorage:', error);
      }
      
      return newUserData;
    });
    
    // ✅ LIMPAR: Status do email e erro quando alterado
    if (name === 'email') {
      console.log('🔍 Campo email alterado, limpando status anterior');
      setEmailStatus({ exists: false, message: '' });
      setError(null);
    }
  }, []); // ✅ Removida dependência checkEmailExists

  const handleConsentChange = useCallback((type) => {
    setConsent(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
    setError(null);
  }, []);

  // ✅ CORRIGIDO: Função de validação assíncrona para verificar email
  const validateStep1 = async () => {
    console.log('🔍 validateStep1: Iniciando validação...');
    console.log('🔍 userData atual:', userData);
    console.log('🔍 consent atual:', consent);
    
    const { first_name, last_name, email, password, confirmPassword } = userData;

    console.log('🔍 Validando first_name:', { first_name, trimmed: first_name?.trim() });
    if (!first_name || !first_name.trim()) {
      console.log('❌ Validação falhou: first_name');
      setError('Nome é obrigatório');
      return false;
    }

    console.log('🔍 Validando last_name:', { last_name, trimmed: last_name?.trim() });
    if (!last_name || !last_name.trim()) {
      console.log('❌ Validação falhou: last_name');
      setError('Sobrenome é obrigatório');
      return false;
    }

    console.log('🔍 Validando email:', { email, trimmed: email?.trim() });
    if (!email || !email.trim()) {
      console.log('❌ Validação falhou: email');
      setError('Email é obrigatório');
      return false;
    }

    console.log('🔍 Validando formato do email');
    if (!/\S+@\S+\.\S+/.test(email)) {
      console.log('❌ Validação falhou: formato do email');
      setError('Email inválido');
      return false;
    }

    // ✅ VALIDAÇÃO: Verificar se email já existe no sistema
    console.log('🔍 Verificando disponibilidade do email:', email);
    setEmailStatus({ exists: false, message: 'Verificando...' });
    
    try {
             console.log('📡 Fazendo requisição para:', '/api/auth/check-email');
       console.log('📧 Dados enviados:', { email: email.trim() });
       
       const response = await axios.post('/api/auth/check-email', { 
        email: email.trim() 
      });
      
      console.log('📥 Resposta da API:', response.data);
      
      if (response.data.success && response.data.emailExists) {
        console.log('❌ Email já está em uso:', response.data.message);
        setEmailStatus({
          exists: true,
          message: 'Email já está em uso'
        });
        setError('Este email já está em uso. Use outro email ou faça login.');
        return false;
      } else if (response.data.success && !response.data.emailExists) {
        console.log('✅ Email disponível:', response.data.message);
        setEmailStatus({
          exists: false,
          message: 'Email disponível'
        });
      } else {
        console.warn('⚠️ Resposta inesperada da API:', response.data);
        setEmailStatus({
          exists: false,
          message: 'Resposta inesperada da API'
        });
        setError('Erro na verificação do email. Tente novamente.');
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao verificar email:', error);
      console.error('❌ Detalhes do erro:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // ✅ TRATAMENTO: Se a API não estiver disponível, permitir continuar mas avisar
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        console.warn('⚠️ API não disponível, permitindo continuar com validação local');
        setEmailStatus({
          exists: false,
          message: 'Verificação offline - email pode estar em uso'
        });
        // Não bloquear o usuário, mas avisar sobre a verificação
      } else if (error.response?.status === 400) {
        console.warn('⚠️ Erro de validação na API:', error.response.data);
        setEmailStatus({
          exists: false,
          message: 'Erro de validação: ' + (error.response.data.message || 'Formato inválido')
        });
        setError('Formato de email inválido. Verifique o email digitado.');
        return false;
      } else if (error.response?.status === 500) {
        console.error('❌ Erro interno do servidor:', error.response.data);
        setEmailStatus({
          exists: false,
          message: 'Erro interno do servidor'
        });
        setError('Erro interno ao verificar email. Tente novamente.');
        return false;
      } else {
        setEmailStatus({
          exists: false,
          message: 'Erro ao verificar email'
        });
        setError('Erro ao verificar disponibilidade do email. Tente novamente.');
        return false;
      }
    }

    console.log('🔍 Validando password:', { password, length: password?.length });
    if (!password) {
      console.log('❌ Validação falhou: password');
      setError('Senha é obrigatória');
      return false;
    }

    console.log('🔍 Validando comprimento da senha');
    if (password.length < 6) {
      console.log('❌ Validação falhou: senha muito curta');
      setError('Senha deve ter pelo menos 6 caracteres');
      return false;
    }

    if (password.length > 128) {
      console.log('❌ Validação falhou: senha muito longa');
      setError('Senha deve ter no máximo 128 caracteres');
      return false;
    }

    console.log('🔍 Validando confirmação da senha');
    if (password !== confirmPassword) {
      console.log('❌ Validação falhou: senhas não coincidem');
      setError('Senhas não coincidem');
      return false;
    }

    console.log('🔍 Validando consentimentos');
    if (!consent.terms) {
      console.log('❌ Validação falhou: termos não aceitos');
      setError('É necessário aceitar os Termos de Uso');
      return false;
    }

    if (!consent.privacy) {
      console.log('❌ Validação falhou: privacidade não aceita');
      setError('É necessário aceitar a Política de Privacidade');
      return false;
    }

    console.log('✅ Validação concluída com sucesso!');
    return true;
  };

  const handleNextStep = useCallback(async () => {
    console.log('🚀 handleNextStep: Iniciando...', { currentStep });
    
    if (currentStep === 1) {
      console.log('🔍 Etapa 1: Validando dados...');
      try {
        const isValid = await validateStep1();
        if (!isValid) {
          console.log('❌ Validação da etapa 1 falhou');
          return;
        }
        console.log('✅ Validação da etapa 1 passou');
      } catch (error) {
        console.error('❌ Erro na validação da etapa 1:', error);
        return;
      }
    }

    if (currentStep === 2) {
      if (!selectedPlan) {
        setError('Selecione um plano para continuar');
        return;
      }
    }

    const newStep = Math.min(currentStep + 1, 2);
    
    setCurrentStep(newStep);
    setError('');
    
    // ✅ PERSISTIR: Step atual no localStorage
    try {
      localStorage.setItem('signup_current_step', newStep.toString());
    } catch (error) {
      console.error('❌ Erro ao salvar step no localStorage:', error);
    }
  }, [currentStep, selectedPlan, userData, consent, emailStatus]); // ✅ Dependências corretas

  const handlePrevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError(null);
  }, []);



  const handleStepClick = useCallback((stepId) => {
    // ✅ PERMITIR: Navegação livre entre todas as etapas
    if (stepId !== currentStep) {
      setCurrentStep(stepId);
      setError('');
      
      // ✅ PERSISTIR: Step atual no localStorage
      try {
        localStorage.setItem('signup_current_step', stepId.toString());
      } catch (error) {
        console.error('❌ Erro ao salvar step no localStorage:', error);
      }
    }
  }, [currentStep]);

    // ✅ COMPONENTE: Indicador de etapas clicável
  const renderStepIndicator = useCallback(() => (
    <StepIndicator
      steps={steps}
      currentStep={currentStep}
      onStepClick={handleStepClick}
    />
  ), [steps, currentStep, handleStepClick]);

  const renderStep1 = useCallback(() => (
    <div className="max-w-sm mx-auto">
      <h2 className="text-lg font-bold text-white mb-3 text-center">
        Dados Pessoais
      </h2>
      
      <form className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="first_name" className="block text-cyan-200 text-xs mb-1">
              Nome <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={userData.first_name}
              onChange={handleInputChange}
              className="w-full px-2 py-1.5 bg-gray-800/50 border border-cyan-400/30 rounded text-white placeholder-cyan-300/50 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 text-sm"
              placeholder="Seu nome"
              required
            />
          </div>
          
          <div>
            <label htmlFor="last_name" className="block text-cyan-200 text-xs mb-1">
              Sobrenome <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={userData.last_name}
              onChange={handleInputChange}
              className="w-full px-2 py-1.5 bg-gray-800/50 border border-cyan-400/30 rounded text-white placeholder-cyan-300/50 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 text-sm"
              placeholder="Seu sobrenome"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-cyan-200 text-xs mb-1">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={userData.email}
            onChange={handleInputChange}
            className={`w-full px-2 py-1.5 bg-gray-800/50 border rounded text-white placeholder-cyan-300/50 focus:outline-none focus:ring-1 text-sm ${
              emailStatus.exists 
                ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' 
                : 'border-cyan-400/30 focus:border-cyan-400 focus:ring-cyan-400/20'
            }`}
            placeholder="seu@email.com"
            required
          />
          
          {/* ✅ INDICADOR: Status do email */}
          {userData.email && (
            <div className="mt-1 flex items-center gap-2">

              

              
              {emailStatus.exists && (
                <div className="flex items-center gap-1 text-xs text-red-400">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  Email já está em uso
                </div>
              )}
              
              {!emailStatus.checking && !emailStatus.exists && userData.email.length >= 3 && (
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Email disponível
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-cyan-200 text-xs mb-1">
            Telefone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={userData.phone}
            onChange={handleInputChange}
            className="w-full px-2 py-1.5 bg-gray-800/50 border border-cyan-400/30 rounded text-white placeholder-cyan-300/50 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 text-sm"
            placeholder="(11) 99999-9999"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-cyan-200 text-xs mb-1">
            Senha <span className="text-red-400">*</span>
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={userData.password}
            onChange={handleInputChange}
            className="w-full px-2 py-1.5 bg-gray-800/50 border border-cyan-400/30 rounded text-white placeholder-cyan-300/50 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 text-sm"
            placeholder="Sua senha"
            required
          />
          
          {/* ✅ INDICADOR: Força da senha - SIMPLIFICADO */}
          {userData.password && (
            <div className="mt-1">
              <div className="flex items-center gap-1 text-xs">
                <div className={`w-1.5 h-1.5 rounded-full ${passwordStrength.length ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className={passwordStrength.length ? 'text-green-400' : 'text-red-400'}>
                  Mín. 6 caracteres
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${passwordStrength.lowercase ? 'bg-green-400' : 'bg-orange-400'}`}></div>
                <span className={passwordStrength.lowercase ? 'text-green-400' : 'text-orange-400'}>
                  Recomendado: 1 minúscula
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${passwordStrength.number ? 'bg-green-400' : 'bg-orange-400'}`}></div>
                <span className={passwordStrength.number ? 'text-green-400' : 'text-orange-400'}>
                  Recomendado: 1 número
                </span>
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-cyan-200 text-xs mb-1">
            Confirmar Senha <span className="text-red-400">*</span>
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={userData.confirmPassword}
            onChange={handleInputChange}
            className="w-full px-2 py-1.5 bg-gray-800/50 border border-cyan-400/30 rounded text-white placeholder-cyan-300/50 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 text-sm"
            placeholder="Confirme sua senha"
            required
          />
        </div>

        {/* ✅ CONSENTIMENTOS: Termos e políticas - ULTRA COMPACTO */}
        <div className="space-y-2">
          <h3 className="text-cyan-200 text-xs font-medium">Consentimentos</h3>
          
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="terms"
              checked={consent.terms}
              onChange={() => handleConsentChange('terms')}
              className="mt-0.5 w-3 h-3 text-cyan-600 bg-gray-800 border-cyan-500/30 rounded focus:ring-cyan-500"
            />
            <label htmlFor="terms" className="text-cyan-200 text-xs">
              Li e aceito os{' '}
              <a href="/terms" target="_blank" className="text-cyan-300 hover:text-cyan-100 underline">
                Termos de Uso
              </a>
              <span className="text-red-400"> *</span>
            </label>
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="privacy"
              checked={consent.privacy}
              onChange={() => handleConsentChange('privacy')}
              className="mt-0.5 w-3 h-3 text-cyan-600 bg-gray-800 border-cyan-500/30 rounded focus:ring-cyan-500"
            />
            <label htmlFor="privacy" className="text-cyan-200 text-xs">
              Li e aceito a{' '}
              <a href="/privacy-policy" target="_blank" className="text-cyan-300 hover:text-cyan-100 underline">
                Política de Privacidade
              </a>
              <span className="text-red-400"> *</span>
            </label>
          </div>

          {/* Marketing (Opcional) - ULTRA COMPACTO */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="marketing"
              checked={consent.marketing}
              onChange={() => handleConsentChange('marketing')}
              className="mt-0.5 w-3 h-3 text-cyan-600 bg-gray-800 border-cyan-500/30 rounded focus:ring-cyan-500"
            />
            <label htmlFor="marketing" className="text-cyan-200 text-xs">
              Aceito receber comunicações de marketing (opcional)
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-400/30 rounded p-2">
            <p className="text-red-300 text-xs">{error}</p>
          </div>
        )}
      </form>
    </div>
  ), [userData, consent, passwordStrength, handleInputChange, handleConsentChange, error]);

  const renderStep2 = useCallback(() => (
    <div>
      <PricingPlans
        selectedPlan={selectedPlan}
        selectedInterval={selectedInterval}
        onPlanSelect={(planType) => {
          setSelectedPlan(planType);
          
          // ✅ PERSISTIR: Plano selecionado
          localStorage.setItem('signup_selected_plan', planType);
        }}
        onIntervalSelect={(interval) => {
          setSelectedInterval(interval);
          
          // ✅ PERSISTIR: Intervalo selecionado
          localStorage.setItem('signup_selected_interval', interval);
        }}
      />
      
      {/* ✅ BOTÃO DE CHECKOUT DIRETO */}
      {selectedPlan && selectedInterval && (
        <div className="max-w-md mx-auto mt-6">
          <button
                         onClick={handleCreateUser}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold py-4 px-6 rounded-lg hover:from-emerald-400 hover:to-cyan-400 transition-all transform hover:scale-105 shadow-lg"
          >
            🚀 Continuar para Pagamento
          </button>
          
          <p className="text-center text-cyan-200 text-xs mt-2">
            Você será redirecionado para uma página segura do Stripe
          </p>
        </div>
      )}
      
      {error && (
        <div className="max-w-md mx-auto mt-4">
          <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
            <p className="text-red-300 text-sm text-center">{error}</p>
          </div>
        </div>
      )}
    </div>
  ), [selectedPlan, selectedInterval, userData, error]);



  const renderStepContent = useCallback(() => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      default:
        return renderStep1();
    }
  }, [currentStep, renderStep1, renderStep2]);

  // ✅ SIMPLIFICADO: Apenas salvar dados e redirecionar para Stripe
  const handleCreateUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Preparando dados para checkout Stripe...');
      
      // ✅ VALIDAR: Dados obrigatórios antes de prosseguir
      if (!userData.first_name || !userData.last_name || !userData.email || !userData.password) {
        setError('Todos os campos obrigatórios devem ser preenchidos');
        setLoading(false);
        return;
      }
      
      // ✅ SALVAR: Dados completos no localStorage para criação posterior
      const paymentData = {
        userData: {
          first_name: userData.first_name,
          last_name: userData.last_name,
          email: userData.email,
          password: userData.password,
          phone: userData.phone || null
        },
        planData: {
          planType: selectedPlan,
          interval: selectedInterval
        },
        timestamp: new Date().toISOString(),
        source: 'signup_with_plans'
      };
      
      try {
        localStorage.setItem('stripe_checkout_data', JSON.stringify(paymentData));
        console.log('✅ Dados salvos para checkout:', paymentData);
      } catch (storageError) {
        console.warn('⚠️ Erro ao salvar dados:', storageError);
        setError('Erro ao salvar dados. Tente novamente.');
        setLoading(false);
        return;
      }
      
      // ✅ REDIRECIONAR: Para checkout link correto
      const checkoutLinks = {
        basic: {
          monthly: 'https://buy.stripe.com/8x29ATdAo3kLbM8da35EY00',
          yearly: 'https://buy.stripe.com/dRm28r53SaNdbM82vp5EY07'
        },
        pro: {
          monthly: 'https://buy.stripe.com/fZu8wP9k808z03q7PJ5EY02',
          yearly: 'https://buy.stripe.com/9B6cN52VKdZp03q8TN5EY06'
        },
        premium: {
          monthly: 'https://buy.stripe.com/3cIbJ1bsg7B12by3zt5EY04',
          yearly: 'https://buy.stripe.com/eVqeVdeEsaNd6rOda35EY08'
        }
      };
      
      const checkoutLink = checkoutLinks[selectedPlan]?.[selectedInterval];
      if (checkoutLink) {
        console.log('🚀 Redirecionando para Stripe:', checkoutLink);
        window.location.href = checkoutLink;
      } else {
        setError('Link de checkout não encontrado para o plano selecionado');
        setLoading(false);
      }
      
    } catch (error) {
      console.error('❌ Erro inesperado:', error);
      setError('Erro inesperado ao redirecionar para pagamento. Tente novamente.');
      setLoading(false);
    }
  }, [userData, selectedPlan, selectedInterval]);

  return (
    <>
      <LandingNavbar />
      <div className="relative min-h-screen bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 animate-gradient-move overflow-y-auto pt-20 pb-8">
        <NeuralNetworkBackground />
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {renderStepIndicator()}

          <div className="mb-6">
            {renderStepContent()}
          </div>

          {/* Navigation buttons */}
          {currentStep < 2 && (
            <div className="flex justify-center space-x-4 mb-6">
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
                className="flex items-center px-4 py-2 text-sm bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:from-emerald-400 hover:to-cyan-400 transition border border-emerald-300/30 drop-shadow-neon disabled:opacity-50"
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