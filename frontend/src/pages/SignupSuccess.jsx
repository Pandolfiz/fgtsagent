import React, { useState, useEffect } from 'react';
import { CheckCircle, Mail, User, ArrowRight, Home, Shield, RefreshCw, CreditCard, ExternalLink } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar.jsx';
import supabase from '../lib/supabaseClient.js';

const SignupSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // ✅ ESTADOS UNIFICADOS
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [error, setError] = useState('');
  const [userCreationAttempted, setUserCreationAttempted] = useState(false);
  
  // ✅ DETECTAR CONTEXTO AUTOMATICAMENTE
  const [context, setContext] = useState(null); // 'signup' | 'payment'
  const [contextData, setContextData] = useState(null);

  // ✅ DADOS RECEBIDOS (unificados)
  const { userData, planType, interval, userId, source } = location.state || {};

  // ✅ DETECTAR CONTEXTO AUTOMATICAMENTE
  useEffect(() => {
    const detectContext = () => {
      console.log('🔍 Detectando contexto da página de sucesso...');
      
      // ✅ PRIORIDADE 1: Dados via location.state (signup)
      if (location.state && location.state.source === 'signup_with_plans') {
        console.log('✅ Contexto detectado: SIGNUP (via state)');
        setContext('signup');
        setContextData(location.state);
        return;
      }
      
      // ✅ PRIORIDADE 2: Dados salvos no localStorage (signup)
      try {
        const storedData = localStorage.getItem('stripe_checkout_data');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (parsedData.source === 'signup_with_plans') {
            console.log('✅ Contexto detectado: SIGNUP (via localStorage)');
            setContext('signup');
            setContextData(parsedData);
            return;
          }
        }
      } catch (error) {
        console.warn('⚠️ Erro ao ler dados do localStorage:', error);
      }
      
      // ✅ PRIORIDADE 3: Parâmetros da URL (payment)
      const planFromUrl = searchParams.get('plan');
      const statusFromUrl = searchParams.get('status');
      const sessionIdFromUrl = searchParams.get('session_id');
      
      if (planFromUrl || statusFromUrl || sessionIdFromUrl) {
        console.log('✅ Contexto detectado: PAYMENT (via URL)');
        setContext('payment');
        setContextData({
          planType: planFromUrl || 'pro',
          status: statusFromUrl || 'success',
          sessionId: sessionIdFromUrl,
          source: 'stripe_checkout',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // ✅ PRIORIDADE 4: Dados via location.state (payment)
      if (location.state && location.state.source === 'stripe_checkout') {
        console.log('✅ Contexto detectado: PAYMENT (via state)');
        setContext('payment');
        setContextData(location.state);
        return;
      }
      
      // ✅ FALLBACK: Assumir signup se não conseguir detectar
      console.log('⚠️ Contexto não detectado, assumindo SIGNUP');
      setContext('signup');
      setContextData({});
    };

    detectContext();
  }, [location.state, searchParams]);

  // ✅ VERIFICAR: Se o usuário já está logado OU criar novo usuário (APENAS UMA VEZ)
  useEffect(() => {
    if (!context || userCreationAttempted) return; // Aguardar contexto OU evitar duplicação
    
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        
        // ✅ PRIORIDADE 1: Verificar se já está logado
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Erro ao verificar sessão:', error);
          throw error;
        }
        
        const isAuthenticated = !!session && !!session.access_token;
        console.log('🔍 Status de autenticação:', isAuthenticated);
        
        if (isAuthenticated) {
          // ✅ SUCESSO: Usuário já autenticado
          setIsLoggedIn(true);
          setLoading(false);
          
          // ✅ SINCRONIZAR: Token com localStorage
          localStorage.setItem('authToken', session.access_token);
          console.log('✅ Usuário já autenticado');
          return;
        }
        
        // ✅ PRIORIDADE 2: Se não autenticado e contexto é signup, criar usuário (APENAS UMA VEZ)
        if (context === 'signup' && !userCreationAttempted) {
          console.log('🔄 Usuário não autenticado, criando nova conta...');
          setUserCreationAttempted(true); // ⚠️ PREVENIR DUPLICAÇÃO
          await createUserFromSignupData();
          return;
        }
        
        // ✅ PRIORIDADE 3: Se não autenticado e contexto é payment, aguardar
        if (context === 'payment') {
          console.log('⏳ Aguardando criação de usuário via webhook...');
          setIsLoggedIn(false);
          setLoading(false);
          return;
        }
        
        // ✅ FALLBACK: Usuário não autenticado e sem contexto válido
        console.warn('⚠️ Usuário não autenticado e sem contexto válido');
        setIsLoggedIn(false);
        setLoading(false);
        
      } catch (error) {
        console.error('❌ Erro na verificação de autenticação:', error);
        setIsLoggedIn(false);
        setLoading(false);
      }
    };

    // ✅ INICIAR: Verificação de autenticação
    checkAuthStatus();
  }, [context]); // ⚠️ REMOVIDO contextData para evitar re-execuções

  const getPlanName = (planType) => {
    switch (planType) {
      case 'basic':
        return 'Plano Básico';
      case 'pro':
        return 'Plano Pro';
      case 'premium':
        return 'Plano Premium';
      default:
        return 'Plano selecionado';
    }
  };

  const getIntervalText = (interval) => {
    switch (interval) {
      case 'monthly':
        return 'mensal';
      case 'yearly':
        return 'anual';
      default:
        return interval;
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleGoToHome = () => {
    navigate('/');
  };

  // ✅ CORRIGIDO: Navegação para dashboard com verificação de autenticação
  // ✅ FUNÇÃO: Verificar se email foi confirmado
  const checkEmailConfirmation = async (email) => {
    try {
      console.log('🔍 Verificando confirmação de email...');
      
      // Tentar fazer login para verificar se o email foi confirmado
      const { data: { session }, error } = await supabase.auth.signInWithPassword({
        email,
        password: contextData?.userData?.password || 'temp_password'
      });
      
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          console.log('⚠️ Email ainda não foi confirmado');
          return false;
        } else if (error.message.includes('Invalid login credentials')) {
          console.log('⚠️ Credenciais inválidas (senha temporária)');
          return false;
        }
      }
      
      if (session?.access_token) {
        console.log('✅ Email confirmado, sessão válida');
        return true;
      }
      
      return false;
    } catch (checkError) {
      console.error('❌ Erro ao verificar confirmação:', checkError);
      return false;
    }
  };

  // ✅ FUNÇÃO: Debug para verificar sessão
  const debugSession = async () => {
    try {
      console.log('🔍 === DEBUG SESSÃO ===');
      
      // Verificar localStorage
      const authToken = localStorage.getItem('authToken');
      const supabaseToken = localStorage.getItem('supabase-auth');
      console.log('📱 localStorage authToken:', authToken ? '✅ Presente' : '❌ Ausente');
      console.log('📱 localStorage supabase-auth:', supabaseToken ? '✅ Presente' : '❌ Ausente');
      
      // Verificar sessão Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('🔐 Sessão Supabase:', session ? '✅ Presente' : '❌ Ausente');
      if (session) {
        console.log('🔐 Token da sessão:', session.access_token ? '✅ Presente' : '❌ Ausente');
        console.log('🔐 Usuário da sessão:', session.user?.id || '❌ Ausente');
      }
      if (error) {
        console.error('❌ Erro na sessão:', error);
      }
      
      console.log('🔍 === FIM DEBUG ===');
    } catch (debugError) {
      console.error('❌ Erro no debug:', debugError);
    }
  };

  // ✅ FUNÇÃO: Criar usuário a partir dos dados do signup (PROTEGIDA CONTRA DUPLICAÇÃO)
  const createUserFromSignupData = async () => {
    try {
      // ✅ PROTEÇÃO: Verificar se já tentou criar usuário
      if (userCreationAttempted) {
        console.log('⚠️ Criação de usuário já foi tentada, ignorando...');
        return;
      }
      
      console.log('🔄 Criando usuário com dados do signup...');
      
      // ✅ DEBUG: Verificar estado da sessão antes da criação
      await debugSession();
      
      // ✅ PRIORIDADE 1: Usar dados do contextData se disponível
      let userData, planData;
      
      if (contextData?.userData && contextData?.planData) {
        console.log('📋 Usando dados do contextData:', contextData);
        userData = contextData.userData;
        planData = contextData.planData;
      } else {
        // ✅ PRIORIDADE 2: Obter dados salvos no localStorage
        const storedData = localStorage.getItem('stripe_checkout_data');
        if (!storedData) {
          console.error('❌ Dados do signup não encontrados');
          setError('Dados do cadastro não encontrados. Tente novamente.');
          setLoading(false);
          return;
        }
        
        const parsedData = JSON.parse(storedData);
        userData = parsedData.userData;
        planData = parsedData.planData;
        console.log('📋 Dados recuperados do localStorage:', { userData, planData });
      }
      
      // ✅ VALIDAR: Dados obrigatórios
      if (!userData?.email || !userData?.password || !userData?.first_name) {
        console.error('❌ Dados obrigatórios ausentes:', userData);
        setError('Dados obrigatórios ausentes. Tente novamente.');
        setLoading(false);
        return;
      }
      
             // ✅ CRIAR: Usuário no Supabase (frontend)
       console.log('🔄 Criando usuário no Supabase...');
       
       // ✅ USAR: Método padrão do frontend
       const { data: { user }, error: signUpError } = await supabase.auth.signUp({
         email: userData.email,
         password: userData.password,
         options: {
           data: {
             first_name: userData.first_name,
             last_name: userData.lastName || '',
             full_name: `${userData.first_name} ${userData.lastName || ''}`.trim(),
             phone: userData.phone || null,
             plan_type: planData?.planType || 'pro',
             interval: planData?.interval || 'monthly'
           }
         }
       });
      
      if (signUpError) {
        console.error('❌ Erro ao criar usuário:', signUpError);
        
        // ✅ TRATAR: Erro de email já existente
        if (signUpError.message.includes('already registered')) {
          setError('Este email já está cadastrado. Faça login para continuar.');
          setIsLoggedIn(false);
          setLoading(false);
          return;
        }
        
        setError(`Erro ao criar conta: ${signUpError.message}`);
        setLoading(false);
        return;
      }
      
      if (user) {
        console.log('✅ Usuário criado com sucesso:', user.id);
        
        // ✅ FORÇAR: Criação da sessão após signup
        console.log('🔄 Forçando criação da sessão...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Erro ao obter sessão:', sessionError);
        }
        
                 if (session?.access_token) {
           console.log('✅ Sessão criada com sucesso:', session.access_token.substring(0, 20) + '...');
           localStorage.setItem('authToken', session.access_token);
         } else {
           console.log('⚠️ Email não confirmado ainda. Aguardando confirmação...');
           
           // ✅ AGUARDAR: Confirmação de email antes de prosseguir
           setError('Por favor, confirme seu email antes de continuar. Verifique sua caixa de entrada e clique no link de confirmação.');
           setIsLoggedIn(false);
           setLoading(false);
           
           // ✅ INICIAR: Verificação periódica de confirmação
           const checkInterval = setInterval(async () => {
             const isConfirmed = await checkEmailConfirmation(userData.email);
             if (isConfirmed) {
               clearInterval(checkInterval);
               console.log('✅ Email confirmado! Atualizando estado...');
               setIsLoggedIn(true);
               setLoading(false);
               setError('');
             }
           }, 5000); // Verificar a cada 5 segundos
           
           return;
         }
        
        // ✅ LIMPAR: Dados do localStorage após criação bem-sucedida
        localStorage.removeItem('stripe_checkout_data');
        
        // ✅ ATUALIZAR: Estado para usuário logado
        setIsLoggedIn(true);
        setLoading(false);
        
        console.log('✅ Usuário criado e autenticado com sucesso');
      } else {
        console.error('❌ Usuário não foi criado');
        setError('Erro inesperado ao criar conta. Tente novamente.');
        setLoading(false);
      }
      
    } catch (error) {
      console.error('❌ Erro inesperado ao criar usuário:', error);
      setError('Erro inesperado ao criar conta. Tente novamente.');
      setLoading(false);
    }
  };

  const handleGoToDashboard = async () => {
    try {
      console.log('🚀 Tentando acessar dashboard...');
      
      // ✅ DEBUG: Verificar estado da sessão antes de navegar
      await debugSession();
      
      // ✅ VERIFICAÇÃO FINAL: Confirmar autenticação antes de navegar
      let { data: { session }, error } = await supabase.auth.getSession();
      
      // ✅ TENTAR: Recriar sessão se não existir
      if (!session?.access_token) {
        console.warn('⚠️ Sessão não encontrada, tentando recriar...');
        
        // Tentar usar o token do localStorage
        const storedToken = localStorage.getItem('authToken');
        if (storedToken) {
          console.log('🔄 Tentando usar token armazenado...');
          
                     // Verificar se o token ainda é válido
           console.log('🔄 Verificando token...');
           const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(storedToken);
          
          if (!tokenError && tokenUser) {
            console.log('✅ Token válido, criando nova sessão...');
                         // Forçar refresh da sessão
             console.log('🔄 Forçando refresh da sessão...');
             const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (!refreshError && newSession?.access_token) {
              session = newSession;
              console.log('✅ Nova sessão criada com sucesso');
            }
          }
        }
      }
      
      if (error || !session?.access_token) {
        console.warn('⚠️ Sessão inválida ao tentar acessar dashboard');
        setAuthError('Sua sessão expirou. Faça login novamente.');
        return;
      }
      
      // ✅ SINCRONIZAR: Token com localStorage
      localStorage.setItem('authToken', session.access_token);
      
      console.log('✅ Sessão válida, navegando para dashboard...');
      navigate('/dashboard');
      
    } catch (error) {
      console.error('❌ Erro ao acessar dashboard:', error);
      setAuthError('Erro ao acessar dashboard. Tente novamente.');
    }
  };

  // ✅ RENDERIZAÇÃO CONDICIONAL: Botões baseados no status de autenticação
  const renderActionButtons = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          <div className="w-full bg-gray-600/30 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Verificando autenticação...
          </div>
        </div>
      );
    }

    if (isLoggedIn) {
      // ✅ USUÁRIO LOGADO: Mostrar botão para dashboard
      return (
        <div className="space-y-3">
          <button
            onClick={handleGoToDashboard}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-600 text-white font-bold py-3 px-6 rounded-lg hover:from-emerald-400 hover:to-cyan-500 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
          >
            <Shield className="w-5 h-5" />
            🚀 Ir para Dashboard
          </button>
          
          <button
            onClick={handleGoToHome}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all transform hover:scale-105 shadow-lg"
          >
            <Home className="w-5 h-5 inline mr-2" />
            Voltar ao Início
          </button>
        </div>
      );
    } else {
      // ✅ USUÁRIO NÃO LOGADO: Mostrar botão para login
      return (
        <div className="space-y-3">
          <button
            onClick={handleGoToLogin}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
          >
            <User className="w-5 h-5" />
            Fazer Login
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleGoToHome}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-600 text-white font-bold py-3 px-6 rounded-lg hover:from-emerald-400 hover:to-cyan-500 transition-all transform hover:scale-105 shadow-lg"
          >
            <Home className="w-5 h-5 inline mr-2" />
            Voltar ao Início
          </button>
        </div>
      );
    }
  };

  // ✅ MENSAGEM CONDICIONAL: Baseada no contexto e status de autenticação
  const renderStatusMessage = () => {
    if (!context) {
      return (
        <div className="bg-gray-500/20 p-4 rounded-lg border border-gray-400/20 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
            <h3 className="font-medium text-gray-200">Detectando Contexto</h3>
          </div>
          <p className="text-gray-300 text-sm">Aguarde enquanto detectamos o tipo de sucesso...</p>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="bg-blue-500/20 p-4 rounded-lg border border-blue-400/20 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
            <h3 className="font-medium text-blue-200">Verificando Status</h3>
          </div>
          <p className="text-blue-300 text-sm">
            Aguarde enquanto verificamos seu status de autenticação...
          </p>
        </div>
      );
    }

    if (context === 'payment') {
      return (
        <div className="bg-emerald-500/20 p-4 rounded-lg border border-emerald-400/20 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <h3 className="font-medium text-emerald-200">Pagamento Realizado!</h3>
          </div>
          <p className="text-emerald-300 text-sm">Sua assinatura foi ativada com sucesso no Stripe!</p>
        </div>
      );
    }

    if (isLoggedIn) {
      return (
        <div className="bg-green-500/20 p-4 rounded-lg border border-green-400/20 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5 text-green-400" />
            <h3 className="font-medium text-green-200">Conta Ativada!</h3>
          </div>
          <p className="text-green-300 text-sm">Sua conta foi criada e ativada com sucesso. Você já pode acessar o dashboard!</p>
        </div>
      );
    } else {
      return (
        <div className="bg-yellow-500/20 p-4 rounded-lg border border-yellow-400/20 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-5 h-5 text-yellow-400" />
            <h3 className="font-medium text-yellow-200">Confirmação Pendente</h3>
          </div>
          <p className="text-yellow-300 text-sm">Sua conta foi criada! Verifique seu email para confirmar e ativar o acesso.</p>
        </div>
      );
    }
  };

  // ✅ RENDERIZAR: Erro geral se houver
  const renderError = () => {
    if (error) {
      return (
        <div className="bg-red-500/20 p-4 rounded-lg border border-red-400/20 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5 text-red-400" />
            <h3 className="font-medium text-red-200">Erro</h3>
          </div>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      );
    }
    return null;
  };

  // ✅ RENDERIZAR: Erro de autenticação se houver
  const renderAuthError = () => {
    if (authError) {
      return (
        <div className="bg-red-500/20 p-4 rounded-lg border border-red-400/20 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5 text-red-400" />
            <h3 className="font-medium text-red-200">Erro de Autenticação</h3>
          </div>
          <p className="text-red-300 text-sm">{authError}</p>
        </div>
      );
    }
    return null;
  };

  // ✅ RENDERIZAR: Informações específicas do contexto
  const renderContextInfo = () => {
    if (!contextData) return null;

    if (context === 'payment') {
      return (
        <div className="bg-white/10 p-4 rounded-lg border border-cyan-400/20 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <CreditCard className="w-5 h-5 text-cyan-400" />
            <h3 className="font-medium text-cyan-200">Detalhes do Pagamento</h3>
          </div>
          
          <div className="text-left space-y-2">
            {contextData.planType && (
              <div>
                <p className="text-white font-semibold">{getPlanName(contextData.planType)}</p>
                <p className="text-cyan-300 text-sm">Plano ativado com sucesso</p>
              </div>
            )}
            
            {contextData.sessionId && (
              <div className="pt-2 border-t border-cyan-400/20">
                <p className="text-cyan-200 text-sm">
                  <span className="font-medium">ID da Sessão:</span> {contextData.sessionId.substring(0, 20)}...
                </p>
              </div>
            )}
            
            <div className="pt-2 border-t border-cyan-400/20">
              <p className="text-cyan-200 text-sm">
                <span className="font-medium">Fonte:</span> {contextData.source === 'stripe_checkout' ? 'Stripe Checkout' : 'Sistema'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (context === 'signup' && userData) {
      return (
        <div className="bg-white/10 p-4 rounded-lg border border-cyan-400/20 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <User className="w-5 h-5 text-cyan-400" />
            <h3 className="font-medium text-cyan-200">Dados da Conta</h3>
          </div>
          
          <div className="text-left space-y-2">
            <div>
              <p className="text-white font-semibold">{userData.name}</p>
              <p className="text-cyan-300 text-sm">{userData.email}</p>
            </div>
            
            {planType && (
              <div className="pt-2 border-t border-cyan-400/20">
                <p className="text-cyan-200 text-sm">
                  <span className="font-medium">Plano:</span> {getPlanName(planType)} ({getIntervalText(interval)})
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // ✅ RENDERIZAR: Próximos passos baseados no contexto
  const renderNextSteps = () => {
    if (!context) return null;

    if (context === 'payment') {
      return (
        <div className="space-y-4 mb-6">
          <h3 className="text-cyan-200 text-lg font-semibold">Próximos Passos</h3>
          
          <div className="text-left space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">
                ✓
              </div>
              <div>
                <p className="text-white font-medium">Pagamento processado</p>
                <p className="text-cyan-200 text-sm">Sua assinatura foi ativada no Stripe</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">
                2
              </div>
              <div>
                <p className="text-white font-medium">Acesse sua conta</p>
                <p className="text-cyan-200 text-sm">Faça login para começar a usar</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">
                3
              </div>
              <div>
                <p className="text-white font-medium">Explore funcionalidades</p>
                <p className="text-cyan-200 text-sm">Use todas as funcionalidades do seu plano</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (context === 'signup') {
      return (
        <div className="space-y-4 mb-6">
          <h3 className="text-cyan-200 text-lg font-semibold">Próximos Passos</h3>
          
          <div className="text-left space-y-3">
            {!isLoggedIn ? (
              // ✅ PASSOS PARA USUÁRIO NÃO LOGADO
              <>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">
                    1
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-cyan-400" />
                      <p className="text-white font-medium">Verifique seu email</p>
                    </div>
                    <p className="text-cyan-200 text-sm">Confirme sua conta para ativar o acesso</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">
                    2
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-cyan-400" />
                      <p className="text-white font-medium">Faça login</p>
                    </div>
                    <p className="text-cyan-200 text-sm">Acesse sua conta com email e senha</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="text-white font-medium">Comece a usar</p>
                    <p className="text-cyan-200 text-sm">Explore todas as funcionalidades do seu plano</p>
                  </div>
                </div>
              </>
            ) : (
              // ✅ PASSOS PARA USUÁRIO LOGADO
              <>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">
                    ✓
                  </div>
                  <div>
                    <p className="text-white font-medium">Conta confirmada</p>
                    <p className="text-cyan-200 text-sm">Sua conta foi ativada com sucesso</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">
                    ✓
                  </div>
                  <div>
                    <p className="text-white font-medium">Login realizado</p>
                    <p className="text-cyan-200 text-sm">Você já está autenticado no sistema</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="text-white font-medium">Acesse o dashboard</p>
                    <p className="text-cyan-200 text-sm">Comece a usar todas as funcionalidades</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // ✅ RENDERIZAR: Título baseado no contexto
  const renderTitle = () => {
    if (!context) {
      return (
        <>
          <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500 text-transparent bg-clip-text drop-shadow-neon">
            Processando...
          </h1>
          <p className="text-cyan-200">
            Detectando tipo de sucesso
          </p>
        </>
      );
    }

    if (context === 'payment') {
      return (
        <>
          <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 text-transparent bg-clip-text drop-shadow-neon">
            Pagamento Realizado!
          </h1>
          <p className="text-cyan-200">
            Sua assinatura foi ativada com sucesso
          </p>
        </>
      );
    }

    return (
      <>
        <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500 text-transparent bg-clip-text drop-shadow-neon">
          Conta Criada!
        </h1>
        <p className="text-cyan-200">
          Sua conta foi criada com sucesso
        </p>
      </>
    );
  };

  if (!context) {
    return (
      <>
        <LandingNavbar />
        <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 relative overflow-hidden pt-20">
          <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
              <p className="text-cyan-200">Detectando contexto...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <LandingNavbar />
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 relative overflow-hidden pt-20">
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white/10 rounded-2xl shadow-2xl backdrop-blur-lg border border-cyan-400/30 p-8 card-futuristic text-center">
              
              {/* Ícone de sucesso */}
              <div className="mb-6">
                <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                {renderTitle()}
              </div>

              {/* ✅ STATUS CONDICIONAL: Mensagem baseada no contexto e status de autenticação */}
              {renderStatusMessage()}

              {/* ✅ ERRO GERAL: Se houver */}
              {renderError()}

              {/* ✅ ERRO DE AUTENTICAÇÃO: Se houver */}
              {renderAuthError()}

              {/* ✅ INFORMAÇÕES ESPECÍFICAS: Baseadas no contexto */}
              {renderContextInfo()}

              {/* ✅ PRÓXIMOS PASSOS: Baseados no contexto */}
              {renderNextSteps()}

              {/* ✅ BOTÕES CONDICIONAIS: Baseados no status de autenticação */}
              {renderActionButtons()}

              {/* Informações adicionais */}
              <div className="mt-6 pt-6 border-t border-cyan-400/20">
                <p className="text-cyan-200 text-sm">
                  Precisa de ajuda? Entre em contato conosco
                </p>
                <p className="text-cyan-300/60 text-xs mt-1">
                  Suporte disponível 24/7
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignupSuccess;