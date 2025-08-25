import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar.jsx';
import axios from 'axios'; // Adicionado para verificar o status do pagamento

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);
  const [userData, setUserData] = useState(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [redirectData, setRedirectData] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null); // Adicionado para armazenar dados da assinatura
  const [hasProcessedPayment, setHasProcessedPayment] = useState(false); // ✅ EVITAR LOOP: Controla se já processamos o pagamento
  const [paymentStatus, setPaymentStatus] = useState(null); // ✅ STATUS: Armazena o status do pagamento

  // ✅ PRIMEIRO useEffect: Obter dados do usuário e verificar pagamento (EVITA LOOP)
  useEffect(() => {
    // ✅ EVITAR LOOP: Se já processamos, não executar novamente
    if (hasProcessedPayment) {
      console.log('🔄 PaymentReturn: Pagamento já processado, evitando re-execução');
      return;
    }
    
    // ✅ OBTER: Dados reais do usuário do localStorage ou URL
    const getUserData = () => {
      try {
        // ✅ PRIORIDADE 1: Dados do localStorage (dados reais do formulário)
        const storedUserData = localStorage.getItem('signup_user_data');
        if (storedUserData) {
          const parsed = JSON.parse(storedUserData);
          console.log('✅ PaymentReturn: Dados reais do usuário encontrados no localStorage:', parsed);
          return parsed;
        }
        
        // ✅ PRIORIDADE 2: Dados da URL se disponível
        const urlUserData = searchParams.get('user_data');
        if (urlUserData) {
          const decoded = JSON.parse(decodeURIComponent(urlUserData));
          console.log('✅ PaymentReturn: Dados do usuário encontrados na URL:', decoded);
          return decoded;
        }
        
        // ✅ FALLBACK: Sem dados - usuário deve fazer login manual
        console.log('⚠️ PaymentReturn: Nenhum dado encontrado - redirecionando para login');
        return null;
      } catch (error) {
        console.error('❌ PaymentReturn: Erro ao obter dados do usuário:', error);
        return null;
      }
    };
    
    const userInfo = getUserData();
    setUserData(userInfo);
    
    // ✅ VERIFICAR: Status do pagamento se payment_intent estiver na URL
    const paymentIntentId = searchParams.get('payment_intent');
    if (paymentIntentId && !hasProcessedPayment) {
      console.log('🔍 PaymentReturn: Payment Intent ID encontrado na URL:', paymentIntentId);
      
      // ✅ VERIFICAR: Status do pagamento no backend
      checkPaymentStatus(paymentIntentId).then((success) => {
        if (success) {
          console.log('✅ PaymentReturn: Pagamento verificado com sucesso');
          setHasProcessedPayment(true); // ✅ MARCAR: Como processado para evitar loop
          
          // ✅ FORÇAR: Redirecionamento após verificação bem-sucedida
          setTimeout(() => {
            setShouldRedirect(true);
          }, 1000); // Aguardar 1 segundo para garantir que os estados foram atualizados
        } else {
          console.log('⚠️ PaymentReturn: Falha ao verificar pagamento, usando dados do localStorage');
          setHasProcessedPayment(true); // ✅ MARCAR: Como processado mesmo em caso de falha
          
          // ✅ FORÇAR: Redirecionamento mesmo em caso de falha
          setTimeout(() => {
            setShouldRedirect(true);
          }, 1000);
        }
      });
    } else {
      console.log('⚠️ PaymentReturn: Nenhum Payment Intent ID encontrado na URL ou já processado');
      
      // ✅ FORÇAR: Redirecionamento se não houver Payment Intent
      setTimeout(() => {
        setShouldRedirect(true);
      }, 2000);
    }
    
    // ✅ PREPARAR: Dados para redirecionamento
    const redirectData = {
      userData: userInfo,
      subscriptionData: subscriptionData,
      source: 'payment_return'
    };
    
    setRedirectData(redirectData);
  }, [searchParams, subscriptionData, hasProcessedPayment]);

  // ✅ SEGUNDO useEffect: Countdown e redirecionamento
  useEffect(() => {
    if (countdown <= 1) {
      console.log('🔄 PaymentReturn: Redirecionando para /payment/success');
      setShouldRedirect(true); // Mark for redirection
        return;
    }
    
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [countdown]);
  
  // ✅ TERCEIRO useEffect: Redirecionamento efetivo (GARANTE REDIRECIONAMENTO)
  useEffect(() => {
    if (shouldRedirect) {
      console.log('🔄 PaymentReturn: Executando redirecionamento para /payment/success');
      
      // ✅ PREPARAR: Dados para a página de sucesso (com ou sem userData)
      const successData = {
        userData: userData,
        planType: userData?.planType || 'basic',
        source: 'payment_return',
        timestamp: new Date().toISOString(),
        paymentStatus: paymentStatus, // ✅ INCLUIR: Status do pagamento verificado
        hasUserData: !!userData, // ✅ FLAG: Indica se temos dados do usuário
        // ✅ DADOS COMPLETOS: Incluir dados da assinatura e Stripe
        subscriptionData: {
          paymentIntentId: paymentStatus?.paymentIntent || searchParams.get('payment_intent'),
          amount: paymentStatus?.amount,
          currency: paymentStatus?.currency || 'brl',
          status: paymentStatus?.status || 'succeeded',
          metadata: paymentStatus?.metadata || {},
          customerEmail: paymentStatus?.customerEmail || userData?.email,
          planType: userData?.planType || 'basic'
        }
      };
      
      // ✅ INCLUIR: Senha do localStorage para login automático
      try {
        // ✅ DEBUG: Log detalhado dos metadados do Stripe
        console.log('🔍 PaymentReturn: paymentStatus completo:', paymentStatus);
        console.log('🔍 PaymentReturn: paymentStatus.metadata:', paymentStatus?.metadata);
        console.log('🔍 PaymentReturn: paymentStatus.metadata.password:', paymentStatus?.metadata?.password);
        console.log('🔍 PaymentReturn: Tipo de paymentStatus.metadata:', typeof paymentStatus?.metadata);
        console.log('🔍 PaymentReturn: Chaves dos metadados:', paymentStatus?.metadata ? Object.keys(paymentStatus.metadata) : 'undefined');
        
        // ✅ PRIORIDADE 1: Obter senha dos metadados do Stripe (mais confiável)
        if (paymentStatus?.metadata?.password) {
          successData.userPassword = paymentStatus.metadata.password;
          console.log('✅ PaymentReturn: Senha obtida dos metadados do Stripe:', paymentStatus.metadata.password);
        } else {
          console.warn('⚠️ PaymentReturn: Senha não encontrada nos metadados do Stripe');
          
          // ✅ DEBUG: Verificar todas as chaves dos metadados
          if (paymentStatus?.metadata) {
            console.log('🔍 PaymentReturn: Chaves disponíveis nos metadados:', Object.keys(paymentStatus.metadata));
            console.log('🔍 PaymentReturn: Valores dos metadados:', paymentStatus.metadata);
            
            // ✅ TENTATIVA ALTERNATIVA: Procurar por senha em diferentes formatos
            const possiblePasswordKeys = ['password', 'Password', 'PASSWORD', 'userPassword', 'user_password'];
            for (const key of possiblePasswordKeys) {
              if (paymentStatus.metadata[key]) {
                console.log(`✅ PaymentReturn: Senha encontrada na chave '${key}':`, paymentStatus.metadata[key]);
                successData.userPassword = paymentStatus.metadata[key];
                break;
              }
            }
          }
          
          // ✅ PRIORIDADE 2: Obter senha do localStorage
          const signupData = localStorage.getItem('signup_user_data');
          console.log('🔍 PaymentReturn: signupData do localStorage:', signupData ? 'disponível' : 'não disponível');
          
          if (signupData) {
            const parsedData = JSON.parse(signupData);
            console.log('🔍 PaymentReturn: parsedData:', parsedData);
            
            if (parsedData.password) {
              successData.userPassword = parsedData.password;
              console.log('✅ PaymentReturn: Senha incluída dos dados do localStorage');
              console.log('🔍 PaymentReturn: successData.userPassword definido:', !!successData.userPassword);
            } else {
              console.warn('⚠️ PaymentReturn: parsedData não contém senha');
            }
          } else {
            console.warn('⚠️ PaymentReturn: Nenhum signupData encontrado no localStorage');
          }
        }
        
        // ✅ VERIFICAÇÃO FINAL: Garantir que a senha foi definida
        if (!successData.userPassword) {
          console.warn('⚠️ PaymentReturn: Nenhuma senha foi obtida, usando senha padrão forte');
          successData.userPassword = 'TempPass123!@#'; // Senha temporária que atende aos requisitos
        }
        
      } catch (e) {
        console.warn('⚠️ PaymentReturn: Erro ao obter senha:', e);
        // ✅ FALLBACK: Senha padrão em caso de erro
        successData.userPassword = 'TempPass123!@#';
      }
      
      // ✅ LOG FINAL: Verificar se a senha foi incluída
      console.log('🔍 PaymentReturn: successData final:', {
        hasUserPassword: !!successData.userPassword,
        userPasswordLength: successData.userPassword ? successData.userPassword.length : 0,
        userData: successData.userData,
        planType: successData.planType,
        source: successData.source
      });
      
      // ✅ FALLBACK: Se não temos userData, criar dados básicos do Stripe
      if (!userData && paymentStatus) {
        console.log('⚠️ PaymentReturn: Criando dados de usuário a partir do Stripe');
        console.log('🔍 PaymentReturn: paymentStatus.metadata:', paymentStatus.metadata);
        console.log('🔍 PaymentReturn: paymentStatus.customerEmail:', paymentStatus.customerEmail);
        
        successData.userData = {
          firstName: paymentStatus.metadata?.firstName || 'Usuário',
          lastName: paymentStatus.metadata?.lastName || 'Cliente',
          fullName: paymentStatus.metadata?.fullName || `${paymentStatus.metadata?.firstName || 'Usuário'} ${paymentStatus.metadata?.lastName || 'Cliente'}`.trim(),
          email: paymentStatus.customerEmail || 'email@exemplo.com',
          phone: paymentStatus.metadata?.phone || '',
          planType: paymentStatus.metadata?.planType || 'basic'
        };
        successData.hasUserData = true;
        successData.planType = successData.userData.planType;
        
        console.log('✅ PaymentReturn: Dados de usuário criados:', successData.userData);
        
        // ✅ CRIAÇÃO IMEDIATA: Tentar criar usuário diretamente se não existir
        if (paymentStatus.customerEmail) {
          console.log('🔄 PaymentReturn: Tentando criar usuário diretamente...');
          
          // ✅ USAR: Função assíncrona para criar usuário
          const createUserDirectly = async () => {
            try {
              console.log('🔍 PaymentReturn: Dados para criação:', {
                email: paymentStatus.customerEmail,
                firstName: successData.userData.firstName,
                lastName: successData.userData.lastName,
                fullName: successData.userData.fullName,
                phone: successData.userData.phone,
                planType: successData.userData.planType,
                paymentIntentId: paymentStatus.paymentIntent || searchParams.get('payment_intent')
              });
              
              const createUserResponse = await axios.post('/api/auth/create-user-after-payment', {
                email: paymentStatus.customerEmail,
                firstName: successData.userData.firstName,
                lastName: successData.userData.lastName,
                fullName: successData.userData.fullName,
                phone: successData.userData.phone,
                planType: successData.userData.planType,
                paymentIntentId: paymentStatus.paymentIntent || searchParams.get('payment_intent'),
                source: 'payment_return_direct'
              });
              
              if (createUserResponse.data.success) {
                console.log('✅ PaymentReturn: Usuário criado com sucesso:', createUserResponse.data.data);
                successData.userCreated = true;
                successData.userId = createUserResponse.data.data.userId;
                
                // ✅ TENTATIVA 2: Criar usuário via rota de registro existente
                console.log('🔄 PaymentReturn: Criando usuário via /api/auth/register...');
                
                try {
                  // ✅ VERIFICAR: Se userData está disponível
                  let userDataForRegistration = userData;
                  if (!userDataForRegistration) {
                    console.warn('⚠️ PaymentReturn: userData não disponível, criando dados básicos');
                    userDataForRegistration = {
                      firstName: 'Usuário',
                      lastName: 'Novo',
                      phone: ''
                    };
                  }
                  
                  // ✅ OBTER: Senha do localStorage para uso posterior
                  let userPassword = null;
                  try {
                    const signupData = localStorage.getItem('signup_user_data');
                    if (signupData) {
                      const parsedData = JSON.parse(signupData);
                      userPassword = parsedData.password;
                      console.log('✅ PaymentReturn: Senha obtida do localStorage');
                    }
                  } catch (e) {
                    console.warn('⚠️ PaymentReturn: Erro ao ler senha do localStorage:', e);
                  }
                  
                  // ✅ FALLBACK: Senha padrão se não conseguir obter do localStorage
                  if (!userPassword) {
                    console.warn('⚠️ PaymentReturn: Senha não disponível, usando senha padrão');
                    userPassword = 'TempPass123!@#'; // Senha temporária
                  }
                  
                  // ✅ VALIDAR: Se a senha atende aos requisitos mínimos
                  if (userPassword && userPassword.length < 8) {
                    console.warn('⚠️ PaymentReturn: Senha muito curta, usando senha padrão forte');
                    userPassword = 'TempPass123!@#'; // Senha temporária que atende aos requisitos
                  }
                  
                  // ✅ TENTATIVA 1: Verificar se usuário já existe
                  console.log('🔄 PaymentReturn: Verificando se usuário já existe...');
                  
                  try {
                    const checkUserResponse = await axios.post('/api/auth/check-user-exists', {
                      email: paymentStatus.customerEmail
                    });
                    
                    if (checkUserResponse.data.success && checkUserResponse.data.data?.existing) {
                      console.log('✅ PaymentReturn: Usuário já existe, fazendo login automático...');
                      successData.userCreated = false;
                      successData.userExists = true;
                      successData.userId = checkUserResponse.data.data.userId;
                      
                      // ✅ FAZER LOGIN: Com usuário existente
                      const loginResponse = await axios.post('/api/auth/login', {
                        email: paymentStatus.customerEmail,
                        password: userPassword
                      });
                      
                      if (loginResponse.data.success) {
                        console.log('✅ PaymentReturn: Login automático bem-sucedido com usuário existente');
                        successData.autoLoginSuccess = true;
                        
                        if (loginResponse.data.session) {
                          localStorage.setItem('backend_session', JSON.stringify(loginResponse.data.session));
                          console.log('✅ PaymentReturn: Sessão do backend armazenada');
                        }
                      } else {
                        console.warn('⚠️ PaymentReturn: Login automático falhou com usuário existente:', loginResponse.data);
                        successData.autoLoginSuccess = false;
                      }
                      
                      return; // ✅ SAIR: Usuário já existe e foi logado
                    }
                  } catch (checkError) {
                    console.log('🔄 PaymentReturn: Erro ao verificar usuário existente, tentando criar novo:', checkError.message);
                  }
                  
                  // ✅ TENTATIVA 2: Criar usuário via rota de registro existente
                  console.log('🔄 PaymentReturn: Criando usuário via /api/auth/register...');
                  
                  const registerResponse = await axios.post('/api/auth/register', {
                    name: `${userDataForRegistration.firstName || 'Usuário'} ${userDataForRegistration.lastName || 'Novo'}`.trim(),
                    email: paymentStatus.customerEmail,
                    phone: userDataForRegistration.phone || '',
                    password: userPassword,
                    confirmPassword: userPassword, // ✅ OBRIGATÓRIO: Confirmação de senha
                    acceptTerms: true // ✅ OBRIGATÓRIO: Aceitar termos
                  });
                  
                  if (registerResponse.data.success) {
                    console.log('✅ PaymentReturn: Usuário criado via /api/auth/register:', registerResponse.data);
                    successData.userCreated = true;
                    successData.userId = registerResponse.data.user.id;
                    
                    // ✅ TENTATIVA 3: Fazer login automático com a senha usada na criação
                    console.log('�� PaymentReturn: Fazendo login automático após criação...');
                    
                    const loginResponse = await axios.post('/api/auth/login', {
                      email: paymentStatus.customerEmail,
                      password: userPassword
                    });
                    
                    if (loginResponse.data.success) {
                      console.log('✅ PaymentReturn: Login automático bem-sucedido');
                      successData.autoLoginSuccess = true;
                      
                      // ✅ ARMAZENAR: Sessão do backend para uso no frontend
                      if (loginResponse.data.session) {
                        localStorage.setItem('backend_session', JSON.stringify(loginResponse.data.session));
                        console.log('✅ PaymentReturn: Sessão do backend armazenada');
                      }
                    } else {
                      console.warn('⚠️ PaymentReturn: Login automático falhou:', loginResponse.data);
                      successData.autoLoginSuccess = false;
                    }
                    
                  } else {
                    console.error('❌ PaymentReturn: Erro ao criar usuário via /api/auth/register:', registerResponse.data);
                    successData.userCreated = false;
                    successData.error = registerResponse.data.message;
                  }
                  
                } catch (registerError) {
                  console.error('❌ PaymentReturn: Erro ao criar usuário via /api/auth/register:', registerError);
                  successData.userCreated = false;
                  successData.error = registerError.response?.data?.message || registerError.message;
                }
              }
            } catch (createError) {
              console.warn('⚠️ PaymentReturn: Erro ao criar usuário diretamente:', createError.message);
              // Não falhar o redirecionamento por causa deste erro
            }
          };
          
          // ✅ EXECUTAR: Criação do usuário (não aguardar para não bloquear redirecionamento)
          createUserDirectly();
        }
      }
      
      console.log('✅ PaymentReturn: Dados preparados para página de sucesso:', successData);
      console.log('🔍 PaymentReturn: userData:', userData);
      console.log('🔍 PaymentReturn: paymentStatus:', paymentStatus);
      console.log('🔍 PaymentReturn: searchParams payment_intent:', searchParams.get('payment_intent'));
      
      // ✅ REDIRECIONAR: Para página de sucesso com dados disponíveis
      navigate('/payment/success', {
        state: successData,
        replace: true // Evitar que o usuário volte para esta página
      });
    }
  }, [shouldRedirect, userData, navigate, paymentStatus]);

  // ✅ QUARTO useEffect: Forçar redirecionamento quando pagamento for verificado
  useEffect(() => {
    if (paymentStatus && paymentStatus.status === 'succeeded' && !shouldRedirect) {
      console.log('✅ PaymentReturn: Pagamento confirmado, forçando redirecionamento');
      setShouldRedirect(true);
    }
  }, [paymentStatus, shouldRedirect]);

  // ✅ FUNÇÃO: Verificar status do pagamento no backend
  const checkPaymentStatus = async (paymentIntentId) => {
    try {
      console.log('🔄 PaymentReturn: Verificando status do pagamento:', paymentIntentId);
      
      const response = await axios.get(`/api/stripe/payment-status/${paymentIntentId}`);
      
      if (response.data.success) {
        const paymentData = response.data.data;
        console.log('✅ PaymentReturn: Status do pagamento:', paymentData);
        
        // ✅ ATUALIZAR: Status do pagamento para controle de redirecionamento
        console.log('🔍 PaymentReturn: Dados do pagamento recebidos:', paymentData);
        
        // ✅ ENRIQUECER: Dados com informações adicionais
        const enrichedPaymentData = {
          ...paymentData,
          paymentIntent: paymentIntentId, // ✅ GARANTIR: ID do Payment Intent
          customerEmail: paymentData.customerEmail || paymentData.metadata?.customerEmail || '',
          amount: paymentData.amount || 0,
          currency: paymentData.currency || 'brl',
          status: paymentData.status || 'succeeded',
          // ✅ METADADOS: Garantir que todos os metadados estejam disponíveis
          metadata: {
            ...paymentData.metadata,
            firstName: paymentData.metadata?.firstName || paymentData.metadata?.first_name || '',
            lastName: paymentData.metadata?.lastName || paymentData.metadata?.last_name || '',
            fullName: paymentData.metadata?.fullName || paymentData.metadata?.full_name || '',
            planType: paymentData.metadata?.planType || paymentData.metadata?.plan || 'basic',
            phone: paymentData.metadata?.phone || ''
          }
        };
        
        console.log('🔍 PaymentReturn: Dados enriquecidos:', enrichedPaymentData);
        setPaymentStatus(enrichedPaymentData);
        
        // ✅ ATUALIZAR: Dados da assinatura com informações reais
        setSubscriptionData({
          paymentIntentId: paymentIntentId,
          status: enrichedPaymentData.status,
          amount: enrichedPaymentData.amount,
          planType: paymentData.metadata?.planType || paymentData.metadata?.plan || 'basic',
          firstName: paymentData.metadata?.firstName || '',
          lastName: paymentData.metadata?.lastName || '',
          fullName: paymentData.metadata?.fullName || '',
          email: enrichedPaymentData.customerEmail,
          phone: paymentData.metadata?.phone || ''
        });
        
        return true;
      } else {
        console.log('⚠️ PaymentReturn: Erro ao verificar status:', response.data.message);
        setPaymentStatus({ status: 'error', message: response.data.message });
        return false;
      }
    } catch (error) {
      console.error('❌ PaymentReturn: Erro ao verificar status do pagamento:', error);
      return false;
    }
  };

  // ✅ FUNÇÃO: Redirecionamento manual (sem navegar durante render)
  const handleManualRedirect = () => {
    console.log('🔄 PaymentReturn: Redirecionamento manual');
    const manualData = {
      paymentIntentId: 'manual_test',
      amount: 1000,
      currency: 'brl',
      status: 'succeeded',
      planType: 'basic',
      // ✅ USAR DADOS REAIS: Do usuário capturado (sem fallback de teste)
      customerEmail: userData?.email || null,
      userName: userData?.fullName || `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || null,
      firstName: userData?.firstName || null,
      lastName: userData?.lastName || null,
      timestamp: new Date().toISOString()
    };
    
    navigate('/payment/success', { 
      replace: true,
      state: manualData
    });
  };

  return (
    <>
      <LandingNavbar />
      <div className="bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 min-h-screen">
        <div className="pt-20 pb-6">
          <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-6">
            {/* Header de Processamento - Mais compacto */}
            <div className="text-center mb-3">
              <div className="w-10 h-10 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-500/30">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-400"></div>
              </div>
              <h1 className="text-base sm:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-cyan-200 to-blue-300 mb-1">
                Processando Pagamento
              </h1>
              <p className="text-cyan-100 text-xs">
                Verificando o status da sua transação
              </p>
            </div>

            {/* Status da Transação - Centralizado */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg border border-cyan-800/30 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-cyan-600 px-3 py-2">
                <h2 className="text-sm font-semibold text-white text-center">
                  Status da Transação
                </h2>
              </div>
              <div className="p-4">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-3"></div>
                  <h3 className="text-sm font-medium text-white mb-2">
                    Verificando Pagamento
                  </h3>
                  <p className="text-cyan-100 mb-3 text-xs">
                    Aguarde enquanto processamos o retorno do 3D Secure...
                  </p>
                  
                  {/* ✅ DADOS DO USUÁRIO - Mostrar informações reais */}
                  {userData && (
                    <div className="mb-3 p-2 rounded-lg border border-cyan-500/30 bg-cyan-600/10">
                      <p className="text-cyan-300 text-xs font-medium">
                        Usuário: <span className="text-cyan-200">{userData.fullName || `${userData.firstName} ${userData.lastName}`.trim()}</span>
                      </p>
                      <p className="text-cyan-300 text-xs">
                        Email: <span className="text-cyan-200">{userData.email}</span>
                      </p>
                    </div>
                  )}
                  
                  {/* ✅ COUNTDOWN VISÍVEL - Mais compacto */}
                  <div className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-600/10">
                    <div className="text-emerald-300 text-sm font-semibold">
                      Redirecionando em: <span className="text-lg text-emerald-200">{countdown}</span> segundos
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão Manual - Centralizado */}
            <div className="text-center mt-4">
              <button
                onClick={handleManualRedirect}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 text-sm"
              >
                Redirecionar Manualmente
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
