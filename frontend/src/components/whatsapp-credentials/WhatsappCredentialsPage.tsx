import React, { useState, useEffect, useCallback } from 'react';
import { api, EvolutionCredential } from '../../utilities/api';
import { FaWhatsapp, FaEdit, FaTrash, FaSync, FaPlus, FaCircle, FaCheck, FaExclamation, FaQuestionCircle, FaHourglass, FaBullhorn, FaPhone, FaBroadcastTower, FaBan, FaLink, FaFacebook } from 'react-icons/fa';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import Navbar from '../Navbar';
import { QRCodeSVG } from 'qrcode.react';
import { ErrorModal } from '../ErrorModal';
import { useErrorModal } from '../../hooks/useErrorModal';
import { FACEBOOK_CONFIG, isFacebookConfigured, FACEBOOK_ERRORS } from '../../config/facebook';

export function WhatsappCredentialsPage() {
  const [credentials, setCredentials] = useState<EvolutionCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<EvolutionCredential | null>(null);
  // Estado para exibir modal de QR Code
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrData, setQrData] = useState<{ base64?: string; code?: string; pairingCode?: string } | null>(null);
  
  // Estados para Facebook SDK e Embedded Signup
  const [showMetaSignupModal, setShowMetaSignupModal] = useState(false);
  const [metaSignupStatus, setMetaSignupStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [fbSDKLoaded, setFbSDKLoaded] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    phone: '',
    instance_name: '',
    agent_name: ''
  });

  // Wizard: etapas do formulário de criação
  const [step, setStep] = useState(1);
  const [connectionType, setConnectionType] = useState<'ads' | 'whatsapp_business' | null>(null);
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  
  // Estados específicos para API Oficial
  const [showAdsModal, setShowAdsModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [adsFormData, setAdsFormData] = useState({
    agent_name: '',
    phone: ''
  });
  
  // Estado para informações do usuário atual
  const [currentUser, setCurrentUser] = useState<{ id: string; full_name?: string; email: string; displayName?: string; name?: string; user_metadata?: any } | null>(null);

  // Gerenciamento de números na API oficial da Meta
  const [metaPhoneData, setMetaPhoneData] = useState({
    phoneNumber: '',
    businessAccountId: '',
    accessToken: ''
  });
  const [showMetaPhoneModal, setShowMetaPhoneModal] = useState(false);
  const [metaPhoneNumbers, setMetaPhoneNumbers] = useState([]);

  // Estados para verificação de números WhatsApp
  const [verificationStep, setVerificationStep] = useState<'input' | 'pending' | 'verify' | 'success'>('input');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationError, setVerificationError] = useState<string>('');

  // Estados para modal de confirmação de SMS
  const [showSMSConfirmation, setShowSMSConfirmation] = useState(false);
  const [selectedCredentialForSMS, setSelectedCredentialForSMS] = useState<EvolutionCredential | null>(null);

  // Estado para confirmação de novo SMS
  const [pendingNewSMS, setPendingNewSMS] = useState(false);

  // Estados para modal do iframe da Meta
  const [showMetaIframeModal, setShowMetaIframeModal] = useState(false);
  const [metaConnectionStatus, setMetaConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [metaIframeUrl, setMetaIframeUrl] = useState('https://business.facebook.com/wa/manage/accounts');

  // Hook para gerenciar modais de erro
  const { modalState, showError, showWarning, showInfo, showSuccess, closeModal } = useErrorModal();

  // Monitorar fechamento do modal de aviso para executar novo SMS
  useEffect(() => {
    if (!modalState.isOpen && pendingNewSMS) {
      // Se o modal foi fechado e estava pendente novo SMS, executar
      executeNewSMS();
    }
  }, [modalState.isOpen, pendingNewSMS]);

  // Debug: Monitorar mudanças no status do Meta Signup
  useEffect(() => {
    console.log('🔄 Status do Meta Signup mudou para:', metaSignupStatus);
  }, [metaSignupStatus]);

  // Carregar Facebook SDK
  useEffect(() => {
    loadFacebookSDK();
  }, []);

  // Função para carregar Facebook SDK
            const loadFacebookSDK = () => {
            console.log('🔍 Iniciando carregamento do Facebook SDK...');
            console.log('📍 URL atual:', window.location.href);
            console.log('🔒 Protocolo:', window.location.protocol);
            console.log('🌐 Hostname:', window.location.hostname);
          
            // Verificar se as configurações estão definidas
            if (!isFacebookConfigured()) {
              console.warn('⚠️ Facebook SDK não configurado ou domínio não autorizado.');
              showError(FACEBOOK_ERRORS.CONFIGURATION_INCOMPLETE, 'Erro de Configuração');
              return;
            }
          
            // Verificar se o SDK já foi carregado
            if (window.FB) {
              setFbSDKLoaded(true);
              console.log('✅ Facebook SDK já carregado');
              return;
            }
          
            console.log('🔄 Carregando Facebook SDK...');
          
            // Carregar SDK do Facebook
            window.fbAsyncInit = function() {
              try {
                console.log('🔧 Inicializando Facebook SDK com App ID:', FACEBOOK_CONFIG.APP_ID);
                
                window.FB.init({
                  appId: FACEBOOK_CONFIG.APP_ID,
                  ...FACEBOOK_CONFIG.SDK_CONFIG,
                  version: FACEBOOK_CONFIG.API_VERSION
                });
                
                setFbSDKLoaded(true);
                console.log('✅ Facebook SDK carregado com sucesso');
                
                // Verificar status de login após carregamento
                window.FB.getLoginStatus(function(response) {
                  console.log('📱 Status de login do Facebook:', response);
                });
                
              } catch (error) {
                console.error('❌ Erro ao inicializar Facebook SDK:', error);
                setFbSDKLoaded(false);
                showError('Erro ao carregar Facebook SDK: ' + error.message, 'Erro de SDK');
              }
            };
          
            // Carregar SDK assincronamente
            (function(d, s, id) {
              var js, fjs = d.getElementsByTagName(s)[0];
              if (d.getElementById(id)) return;
              js = d.createElement(s); js.id = id;
              js.src = "https://connect.facebook.net/en_US/sdk.js";
              js.async = true;
              js.defer = true;
              js.crossOrigin = "anonymous";
              if (fjs.parentNode) {
                fjs.parentNode.insertBefore(js, fjs);
              }
            }(document, 'script', 'facebook-jssdk'));
          };

  // Listener para mensagens do Facebook SDK
  useEffect(() => {
    const handleFacebookMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith('facebook.com')) return;
      
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          console.log('📱 Mensagem do Facebook SDK:', data);
          handleFacebookSignupMessage(data);
        }
      } catch (error) {
        console.log('📱 Mensagem do Facebook SDK (raw):', event.data);
      }
    };

    window.addEventListener('message', handleFacebookMessage);
    return () => {
      window.removeEventListener('message', handleFacebookMessage);
    };
  }, []);

  // Função para lidar com mensagens do Facebook SDK
  const handleFacebookSignupMessage = (data: any) => {
    if (data.status === 'completed' || data.status === 'success') {
      setMetaSignupStatus('connected');
      showSuccess('Conta do WhatsApp Business conectada com sucesso!', 'Conexão Realizada');
      
      // Recarregar credenciais após conexão
      setTimeout(() => {
        loadCredentials();
      }, 2000);
    } else if (data.status === 'error' || data.status === 'failed') {
      setMetaSignupStatus('error');
      showError('Erro ao conectar conta do WhatsApp Business. Tente novamente.', 'Erro de Conexão');
    }
  };

  // Função para abrir modal do Facebook Signup
            const handleOpenMetaSignup = () => {
            console.log('📱 Abrindo modal do Meta Signup...');
            
            // Verificar se as configurações estão definidas
            if (!isFacebookConfigured()) {
              console.error('❌ Facebook SDK não configurado');
              showError(FACEBOOK_ERRORS.NOT_CONFIGURED, 'Erro de Configuração');
              return;
            }
            
            // Iniciar o processo diretamente
            setMetaSignupStatus('idle');
            setShowMetaSignupModal(true);
            
            // Iniciar o processo de login automaticamente após um pequeno delay
            setTimeout(() => {
              launchWhatsAppSignup();
            }, 500);
          };

  // Função para iniciar o processo de signup do Facebook
            const launchWhatsAppSignup = () => {
            console.log('🚀 Iniciando processo de conexão com a Meta...');
            
            if (!isFacebookConfigured()) {
              console.error('❌ Facebook SDK não configurado');
              setMetaSignupStatus('error');
              showError(FACEBOOK_ERRORS.NOT_CONFIGURED, 'Erro de Configuração');
              return;
            }
          
            if (!window.FB) {
              console.error('❌ Facebook SDK não carregado');
              setMetaSignupStatus('error');
              showError(FACEBOOK_ERRORS.SDK_NOT_LOADED, 'Erro de SDK');
              return;
            }
          
            setMetaSignupStatus('connecting');
          
            // Callback para resposta do Facebook
            const fbLoginCallback = (response: any) => {
              console.log('📱 Resposta do Facebook:', response);
              
              if (response.authResponse) {
                const code = response.authResponse.code;
                console.log('✅ Código de autorização recebido:', code);
                
                // Enviar código para o backend
                handleFacebookAuthCode(code);
              } else if (response.status === 'not_authorized') {
                console.log('❌ Usuário não autorizou o app');
                setMetaSignupStatus('error');
                showError('Você precisa autorizar o app para continuar. Tente novamente.', 'Autorização Necessária');
              } else if (response.status === 'unknown') {
                console.log('❌ Erro desconhecido no login');
                setMetaSignupStatus('error');
                showError('Erro desconhecido durante o login. Verifique sua conexão e tente novamente.', 'Erro de Conexão');
              } else {
                console.log('❌ Usuário cancelou login ou não autorizou completamente');
                setMetaSignupStatus('error');
                showError(FACEBOOK_ERRORS.LOGIN_CANCELLED, 'Autorização Cancelada');
              }
            };
          
            // Iniciar login do Facebook com Embedded Signup
            try {
              window.FB.login(fbLoginCallback, {
                config_id: FACEBOOK_CONFIG.CONFIG_ID,
                ...FACEBOOK_CONFIG.SIGNUP_CONFIG,
                extras: {
                  ...FACEBOOK_CONFIG.SIGNUP_CONFIG.extras,
                  setup: {
                    // Dados pré-preenchidos (opcional)
                    business_name: currentUser?.full_name || currentUser?.displayName || 'Minha Empresa',
                    email: currentUser?.email || '',
                  },
                }
              });
            } catch (error) {
              console.error('❌ Erro ao iniciar login do Facebook:', error);
              setMetaSignupStatus('error');
              showError('Erro ao iniciar o processo de login. Tente novamente.', 'Erro de Login');
            }
          };

  // Função para processar código de autorização do Facebook
  const handleFacebookAuthCode = async (code: string) => {
    try {
      console.log('🔄 Processando código de autorização...');
      
      // Enviar código para o backend processar
      const response = await api.whatsappCredentials.processFacebookAuth(code);
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Autenticação da Meta processada com sucesso:', result.data);
        
        setMetaSignupStatus('connected');
        showSuccess(result.message || 'Conta do WhatsApp Business conectada com sucesso!', 'Conexão Realizada');
        
        // Recarregar credenciais
        setTimeout(() => {
          loadCredentials();
        }, 2000);
      } else {
        console.error('❌ Erro na autenticação da Meta:', result.message);
        setMetaSignupStatus('error');
        showError(result.message || 'Erro ao processar autenticação da Meta', 'Erro de Conexão');
      }
      
    } catch (err) {
      console.error('❌ Erro ao processar código de autorização:', err);
      setMetaSignupStatus('error');
      showError('Erro ao processar autorização: ' + (err instanceof Error ? err.message : String(err)), 'Erro de Conexão');
    }
  };

  // Função para fechar modal do Facebook Signup
  const handleCloseMetaSignup = () => {
    setShowMetaSignupModal(false);
    setMetaSignupStatus('idle');
  };





  // Adicionar novo número na Meta
  const handleAddMetaPhoneNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.evolution.addPhoneNumber(metaPhoneData);
      const result = await response.json();
      
      if (result.success && result.data) {
        console.log('✅ Número adicionado com sucesso:', result.data);
        setShowMetaPhoneModal(false);
        setMetaPhoneData({ phoneNumber: '', businessAccountId: '', accessToken: '' });
        // Recarregar lista de números
        await loadMetaPhoneNumbers();
      } else {
        setError(result.message || 'Erro ao adicionar número');
      }
    } catch (err) {
      console.error('❌ Erro ao adicionar número:', err);
      setError('Erro ao adicionar número: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Verificar disponibilidade de número
  const handleCheckPhoneAvailability = async (phoneNumber: string, accessToken: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.evolution.checkPhoneAvailability({ phoneNumber, accessToken });
      const result = await response.json();
      
      if (result.success) {
        if (result.available) {
          console.log('✅ Número disponível para registro');
          // Mostrar modal para adicionar
          setMetaPhoneData(prev => ({ ...prev, phoneNumber, accessToken }));
          setShowMetaPhoneModal(true);
        } else {
          setError('Número não está disponível para registro');
        }
      } else {
        setError(result.message || 'Erro ao verificar disponibilidade');
      }
    } catch (err) {
      console.error('❌ Erro ao verificar disponibilidade:', err);
      setError('Erro ao verificar disponibilidade: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Listar números da Meta
  const loadMetaPhoneNumbers = async () => {
    if (!metaPhoneData.businessAccountId || !metaPhoneData.accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.evolution.listPhoneNumbers({
        businessAccountId: metaPhoneData.businessAccountId,
        accessToken: metaPhoneData.accessToken
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        setMetaPhoneNumbers(result.data);
        console.log('✅ Números da Meta carregados:', result.data);
      } else {
        setError(result.message || 'Erro ao carregar números');
      }
    } catch (err) {
      console.error('❌ Erro ao carregar números da Meta:', err);
      setError('Erro ao carregar números: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Remover número da Meta
  const handleRemoveMetaPhoneNumber = async (phoneNumberId: string) => {
    if (!metaPhoneData.accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.evolution.removePhoneNumber({
        phoneNumberId,
        accessToken: metaPhoneData.accessToken
      });
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Número removido com sucesso');
        // Recarregar lista
        await loadMetaPhoneNumbers();
      } else {
        setError(result.message || 'Erro ao remover número');
      }
    } catch (err) {
      console.error('❌ Erro ao remover número:', err);
      setError('Erro ao remover número: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Carregar credenciais do usuário
  const loadCredentials = async () => {
    try {
      console.log('🔄 Carregando credenciais...');
      setLoading(true);
      const response = await api.evolution.getAll();
      console.log('📡 Resposta da API de credenciais:', response);
      
      if (response.success && response.data) {
        console.log('✅ Credenciais carregadas:', response.data.length, 'itens');
        console.log('📋 Lista de credenciais:', response.data);
        
        // Atualizar credenciais no estado
        setCredentials(response.data);
        
        // Verificar se há credenciais ads que precisam de atualização de status
        const adsCredentials = response.data.filter((cred: any) => cred.connection_type === 'ads');
        if (adsCredentials.length > 0) {
          console.log(`🔄 Encontradas ${adsCredentials.length} credenciais ads`);
          
          // TEMPORARIAMENTE DESABILITADO: Verificação automática de status
          // Aguardar um pouco para não sobrecarregar a API
          /*
          setTimeout(async () => {
            try {
              const statusResponse = await api.evolution.checkAllStatus();
              if (statusResponse.success && statusResponse.data) {
                console.log('✅ Status das credenciais ads atualizado:', statusResponse.data);
                
                // Atualizar credenciais com novos status
                setCredentials(prev => 
                  prev.map(cred => {
                    if (cred.connection_type === 'ads') {
                      const statusResult = statusResponse.data!.find((result: any) => result.credential_id === cred.id);
                      return statusResult ? { ...cred, status: statusResult.status } : cred;
                    }
                    return cred;
                  })
                );
              }
            } catch (statusErr) {
              console.warn('⚠️ Erro ao atualizar status das credenciais ads:', statusErr);
            }
          }, 1000); // Aguardar 1 segundo antes de verificar status
          */
        }
      } else {
        console.error('❌ Erro ao carregar credenciais:', response.message);
        setError(response.message || 'Erro ao carregar credenciais');
      }
    } catch (err) {
      console.error('❌ Erro geral ao carregar credenciais:', err);
      setError('Erro ao carregar credenciais: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados do usuário atual
  const loadCurrentUser = async () => {
    try {
      console.log('🔄 Carregando dados do usuário atual...');
      const response = await api.user.getCurrentUser();
      console.log('📡 Resposta da API getCurrentUser:', response);
      
      if (response.success && response.data) {
        console.log('✅ Dados do usuário carregados:', response.data);
        console.log('👤 Nome do usuário:', {
          full_name: response.data.full_name,
          displayName: response.data.displayName,
          name: response.data.name,
          user_metadata: response.data.user_metadata
        });
        setCurrentUser(response.data);
      } else {
        console.error('❌ Erro na resposta da API:', response.message);
      }
    } catch (err) {
      console.error('💥 Erro ao carregar dados do usuário:', err);
    }
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    loadCredentials();
    loadCurrentUser();
  }, []);

  // Resetar form para adicionar nova credencial
  const handleAddNew = () => {
    setFormData({
      phone: '',
      instance_name: '',
      agent_name: ''
    });
    setConnectionType(null);
    setShowTypeSelection(true);
  };

  // Escolher tipo de conexão
  const handleSelectConnectionType = (type: 'ads' | 'whatsapp_business') => {
    setConnectionType(type);
    setShowTypeSelection(false);
    
    if (type === 'whatsapp_business') {
      // Mostrar formulário atual para WhatsApp Business
      setShowAddModal(true);
    } else {
      // Para anúncios, abrir modal do Meta Signup (igual ao botão "Conectar Meta")
      handleOpenMetaSignup();
    }
  };

  // Lidar com mudanças no formulário de anúncios
  const handleAdsFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAdsFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Enviar formulário de anúncios e salvar no Supabase
  const handleAdsFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setVerificationStep('input');
    setPhoneNumberId('');
    setVerificationCode('');
    try {
      // Validar dados obrigatórios
      if (!adsFormData.agent_name || !adsFormData.phone) {
        setError('Por favor, preencha todos os campos obrigatórios');
        return;
      }
      
      // Validar dados da Meta
      if (!metaPhoneData.businessAccountId || !metaPhoneData.accessToken) {
        setError('Por favor, preencha o Business Account ID e Access Token da Meta');
        return;
      }
      // Chamar backend para criar conta WhatsApp na Meta
      const payload = {
        phoneNumber: adsFormData.phone,
        businessAccountId: metaPhoneData.businessAccountId,
        accessToken: metaPhoneData.accessToken,
        wppName: adsFormData.agent_name, // nome do agente
        displayName: currentUser?.full_name || currentUser?.displayName || currentUser?.name || currentUser?.email?.split('@')[0] || 'Usuario', // nome do usuário autenticado
        timezone: 'America/Sao_Paulo',
        category: 'BUSINESS',
        businessDescription: 'Conta criada automaticamente via sistema.'
      };
      
      console.log('📤 Enviando payload para criar conta WhatsApp:', {
        phoneNumber: payload.phoneNumber,
        businessAccountId: payload.businessAccountId,
        accessToken: payload.accessToken ? `${payload.accessToken.substring(0, 10)}...` : 'undefined',
        displayName: payload.displayName
      });
      
      // Log detalhado do payload completo
      console.log('📤 Payload completo:', JSON.stringify(payload, null, 2));
      console.log('📤 Tipos dos dados:', {
        phoneNumber: typeof payload.phoneNumber,
        businessAccountId: typeof payload.businessAccountId,
        accessToken: typeof payload.accessToken,
        displayName: typeof payload.displayName
      });
      const response = await api.evolution.createWhatsAppAccount(payload);
      const result = await response.json();
                  if (result.success && result.data) {
              console.log('✅ Resposta do backend:', result.data);

              // A credencial já foi salva no backend
              if (result.data.credentialId) {
                console.log('✅ Credencial salva no backend com ID:', result.data.credentialId);
      
                // Recarregar credenciais para mostrar a nova
                await loadCredentials();
      }
      
              // Mostrar mensagem para o usuário
      setShowAdsModal(false);
      
              if (result.data.requiresVerification) {
                // Perguntar se o usuário quer solicitar SMS agora
                const shouldRequestSMS = confirm(
                  'A credencial foi criada com sucesso! Deseja solicitar o código de verificação via SMS agora?\n\n' +
                  '⚠️ Importante: A Meta API tem limites de solicitações por dia. Use com moderação.'
                );
                
                if (shouldRequestSMS) {
                  // Se precisa de verificação, abrir modal
                  setPhoneNumberId(result.data.phoneNumberId);
                  setVerificationStep('pending');
                  setShowVerificationModal(true);
                } else {
                  // Mostrar mensagem de sucesso sem solicitar SMS
                  showSuccess('Credencial criada com sucesso! Você pode solicitar o código de verificação posteriormente através do botão "Enviar SMS" no card da credencial.', 'Credencial Criada');
                }
              } else {
                // Mostrar mensagem baseada no status
                showInfo(result.data.message, 'Status da Credencial');
              }
            } else {
              // Erro específico - não salvou no Supabase
              setShowAdsModal(false);
              setError(result.error || 'Erro ao criar conta WhatsApp na Meta');
            }
    } catch (err) {
      console.error('Erro ao criar conta WhatsApp na Meta:', err);
      setError('Erro ao criar conta WhatsApp: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };
      
  // Função para verificar código de verificação
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationStep('verify');
    setVerificationError('');

    try {
      const response = await api.evolution.verifyWhatsAppCode({
        phoneNumberId: phoneNumberId,
        verificationCode: verificationCode,
        accessToken: metaPhoneData.accessToken
      });
      
      const result = await response.json();
      
      if (result.success) {
        setVerificationStep('success');
        setShowVerificationModal(false);
        setVerificationCode('');
        setPhoneNumberId('');
      
        // Recarregar credenciais para atualizar status
        await loadCredentials();
        
        // Mostrar mensagem de sucesso
        showSuccess('Número verificado com sucesso!', 'Verificação Concluída');
      } else {
        setVerificationStep('input');
        setVerificationError(result.error || 'Erro ao verificar código');
      }
    } catch (err) {
      console.error('Erro ao verificar código:', err);
      setVerificationStep('input');
      setVerificationError('Erro ao verificar código: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Função para verificar status de verificação
  const handleCheckVerificationStatus = async (phoneNumberId: string, accessToken: string) => {
    try {
      const response = await api.evolution.checkVerificationStatus({
        phoneNumberId: phoneNumberId,
        accessToken: accessToken
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Status de verificação:', result.data);
        return result.data;
      } else {
        console.error('Erro ao verificar status:', result.error);
        return null;
      }
    } catch (err) {
      console.error('Erro ao verificar status de verificação:', err);
      return null;
    }
  };

  // Função para verificar status do rate limiting
  const checkSmsRateLimit = async (phoneNumberId: string) => {
    try {
      const response = await api.evolution.getSmsRateLimitStatus(phoneNumberId);
      const result = await response.json();
      
      if (result.success && result.data) {
        const stats = result.data;
        if (stats.isBlocked) {
          const blockedUntil = new Date(stats.blockedUntil!);
          const now = new Date();
          const minutesLeft = Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000 / 60);
          
          showError(
            `Número bloqueado por muitas tentativas. Tente novamente em ${minutesLeft} minutos.`,
            'Número Bloqueado'
          );
          return false;
        }
        
        if (stats.attempts > 0) {
          const lastRequest = new Date(stats.lastRequest!);
          const now = new Date();
          const minutesSinceLast = Math.ceil((now.getTime() - lastRequest.getTime()) / 1000 / 60);
          
          if (minutesSinceLast < 5) {
            const minutesLeft = 5 - minutesSinceLast;
            showError(
              `Aguarde ${minutesLeft} minutos antes de solicitar um novo SMS.`,
              'Aguarde um Pouco'
            );
            return false;
          }
        }
      }
      
      return true;
    } catch (err) {
      console.warn('⚠️ Erro ao verificar rate limiting, continuando...', err);
      return true; // Continuar mesmo se não conseguir verificar
    }
  };

  // Função para solicitar código de verificação via SMS
  const handleRequestVerificationCode = async (phoneNumberId: string, accessToken: string) => {
    try {
      console.log('📱 Verificando rate limiting antes de solicitar SMS...');
      
      // Verificar rate limiting primeiro
      const canRequest = await checkSmsRateLimit(phoneNumberId);
      if (!canRequest) {
        return false;
      }
      
      console.log('📱 Solicitando código de verificação via SMS...');
      
      const response = await api.evolution.requestVerificationCode({
        phoneNumberId: phoneNumberId,
        accessToken: accessToken,
        codeMethod: 'SMS',
        language: 'pt_BR'
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Código de verificação solicitado com sucesso');
        
        // Salvar dados para o modal de verificação
        setPhoneNumberId(phoneNumberId);
        setMetaPhoneData(prev => ({ ...prev, accessToken }));
        setVerificationStep('input');
        
        // Mostrar modal de verificação
        setShowVerificationModal(true);
        
        // Mostrar mensagem de sucesso
        showSuccess('Código de verificação enviado via SMS! Digite o código recebido.', 'SMS Enviado');
        return true;
      } else {
        console.error('❌ Erro ao solicitar código:', result);
        
        // Verificar se é erro de rate limiting
        if (result.code === 'RATE_LIMIT_EXCEEDED') {
          let retryMessage = result.error;
          if (result.retryAfter) {
            const retryDate = new Date(result.retryAfter);
            const now = new Date();
            const minutesLeft = Math.ceil((retryDate.getTime() - now.getTime()) / 1000 / 60);
            retryMessage = `${result.error} (Tente novamente em ${minutesLeft} minutos)`;
          }
          
          showError(
            retryMessage,
            'Limite de Tentativas Excedido',
            result.metaCode,
            result.metaSubcode
          );
          return false;
        }
        
        // Exibir erro detalhado da Meta API
        let errorMessage = result.error || 'Erro desconhecido';
        
        if (result.userTitle) {
          errorMessage = `${result.userTitle}: ${result.error}`;
        }
        
        showError(
          errorMessage,
          'Erro ao Solicitar SMS',
          result.metaCode,
          result.metaSubcode
        );
        return false;
      }
    } catch (err) {
      console.error('❌ Erro ao solicitar código de verificação:', err);
      showError(
        'Erro ao solicitar código: ' + (err instanceof Error ? err.message : String(err)),
        'Erro de Conexão'
      );
      return false;
    }
  };

  // Função para solicitar SMS de verificação para credencial 'ads'
  const handleRequestSMS = async (credential: EvolutionCredential) => {
    if (!credential.wpp_number_id || !credential.wpp_access_token) {
      showWarning('Credencial não possui dados necessários para solicitar SMS. Verifique se o número foi registrado corretamente.', 'Dados Insuficientes');
      return;
    }

    // Mostrar modal de confirmação
    setSelectedCredentialForSMS(credential);
    setShowSMSConfirmation(true);
  };

  // Função para confirmar e enviar SMS
  const handleConfirmSMS = async () => {
    if (!selectedCredentialForSMS) return;

    try {
      console.log('📱 Solicitando SMS para credencial:', selectedCredentialForSMS.id);
      
      const success = await handleRequestVerificationCode(
        selectedCredentialForSMS.wpp_number_id!,
        selectedCredentialForSMS.wpp_access_token!
      );
      
      if (success) {
        // Atualizar status da credencial para indicar que SMS foi solicitado
        setCredentials(prev => prev.map(c => 
          c.id === selectedCredentialForSMS.id 
            ? { ...c, status: 'pending_verification', status_description: 'SMS enviado. Aguardando verificação.' }
            : c
        ));
      }
    } catch (err) {
      console.error('❌ Erro ao solicitar SMS:', err);
      showError('Erro ao solicitar SMS: ' + (err instanceof Error ? err.message : String(err)), 'Erro de Conexão');
    } finally {
      // Fechar modal
      setShowSMSConfirmation(false);
      setSelectedCredentialForSMS(null);
    }
  };

  // Função para solicitar novo SMS após confirmação
  const handleRequestNewSMS = () => {
    setPendingNewSMS(true);
    showWarning(
      'Tem certeza que deseja enviar um novo SMS? Esta ação não pode ser desfeita.',
      'Confirmar Novo SMS'
    );
  };

  // Função para executar novo SMS após confirmação
  const executeNewSMS = () => {
    if (pendingNewSMS && phoneNumberId && metaPhoneData.accessToken) {
      handleRequestVerificationCode(phoneNumberId, metaPhoneData.accessToken);
      setPendingNewSMS(false);
    }
  };

  // Função para abrir Meta Business Suite em nova aba
  const handleOpenMetaInNewTab = () => {
    window.open(metaIframeUrl, '_blank');
  };

  // Função para fechar modal do iframe da Meta
  const handleCloseMetaIframe = () => {
    setShowMetaIframeModal(false);
    setMetaConnectionStatus('idle');
  };

  // Carregar script do Google Calendar
  const loadGoogleCalendarScript = () => {
    console.log('Iniciando carregamento do Google Calendar...');
    
    // Limpar qualquer script anterior
    const existingScript = document.getElementById('google-calendar-script');
    if (existingScript) {
      existingScript.remove();
    }
    
    // Limpar qualquer CSS anterior
    const existingCSS = document.querySelector('link[href*="calendar.google.com"]');
    if (existingCSS) {
      existingCSS.remove();
    }

    // Carregar CSS primeiro
    const link = document.createElement('link');
    link.href = 'https://calendar.google.com/calendar/scheduling-button-script.css';
    link.rel = 'stylesheet';
    link.onload = () => {
      console.log('CSS do Google Calendar carregado');
    };
    document.head.appendChild(link);

    // Aguardar um pouco antes de carregar o script
    setTimeout(() => {
      const script = document.createElement('script');
      script.id = 'google-calendar-script';
      script.src = 'https://calendar.google.com/calendar/scheduling-button-script.js';
      script.async = true;
      
      script.onload = () => {
        console.log('Script do Google Calendar carregado');
        // Aguardar mais tempo para garantir que tudo foi inicializado
        setTimeout(() => {
          initializeGoogleCalendar();
        }, 2000);
      };

      script.onerror = () => {
        console.error('Erro ao carregar script do Google Calendar');
        showFallbackCalendar();
      };
      
      document.head.appendChild(script);
    }, 500);
  };

  // Inicializar Google Calendar
  const initializeGoogleCalendar = () => {
    console.log('Tentando inicializar Google Calendar...');
    
    const targetElement = document.getElementById('google-calendar-target');
    if (!targetElement) {
      console.error('Elemento target não encontrado');
      return;
    }

    // Verificar se o objeto calendar existe
    if (typeof (window as any).calendar !== 'undefined' && 
        (window as any).calendar && 
        (window as any).calendar.schedulingButton) {
      
      console.log('API do Google Calendar encontrada, carregando widget...');
      
      // Limpar conteúdo anterior
      targetElement.innerHTML = '';
      
      // Aplicar estilos de centralização ao container
      targetElement.style.display = 'flex';
      targetElement.style.justifyContent = 'center';
      targetElement.style.alignItems = 'center';
      targetElement.style.textAlign = 'center';
      targetElement.style.width = '100%';
      
      try {
        (window as any).calendar.schedulingButton.load({
          url: 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ3d-iuqdpQJX-z-v3vJvQNzYqRWpkOKHk8NaXxY1SQarbDp6f2McqhSloOW0R_Nyb9tkID-2UZF?gv=true',
          color: '#009688',
          label: 'Agendar Onboarding',
          target: targetElement,
        });
        
        console.log('Widget do Google Calendar carregado com sucesso');
        
        // Aplicar estilos adicionais ao botão após carregamento
        setTimeout(() => {
          const buttonElement = targetElement.querySelector('button') || targetElement.querySelector('[role="button"]');
          if (buttonElement) {
            (buttonElement as HTMLElement).style.margin = '0 auto';
            (buttonElement as HTMLElement).style.display = 'block';
            console.log('Estilos de centralização aplicados ao botão');
          }
        }, 1000);
        
      } catch (error) {
        console.error('Erro ao carregar widget do Google Calendar:', error);
        setTimeout(() => {
          tryIframeCalendar();
        }, 2000);
      }
    } else {
      console.log('API do Google Calendar não encontrada, tentando iframe...');
      setTimeout(() => {
        tryIframeCalendar();
      }, 3000);
    }
  };

  // Tentar carregar calendário via iframe
  const tryIframeCalendar = () => {
    const targetElement = document.getElementById('google-calendar-target');
    if (targetElement) {
      console.log('Carregando calendário via iframe...');
      
      // Aplicar estilos de centralização ao container
      targetElement.style.display = 'flex';
      targetElement.style.justifyContent = 'center';
      targetElement.style.alignItems = 'center';
      targetElement.style.textAlign = 'center';
      targetElement.style.width = '100%';
      
      targetElement.innerHTML = `
        <div style="width: 100%; display: flex; justify-content: center; align-items: center;">
          <iframe 
            src="https://calendar.google.com/calendar/appointments/schedules/AcZssZ3d-iuqdpQJX-z-v3vJvQNzYqRWpkOKHk8NaXxY1SQarbDp6f2McqhSloOW0R_Nyb9tkID-2UZF?gv=true"
            width="100%" 
            height="200" 
            frameborder="0"
            style="border: 0; border-radius: 8px; min-height: 200px; background: transparent; max-width: 100%; margin: 0 auto; display: block;"
            onload="console.log('iFrame do calendário carregado')"
            onerror="console.error('Erro ao carregar iFrame')"
          ></iframe>
        </div>
      `;
      
      console.log('iFrame do calendário inserido no DOM');
    }
  };

  // Mostrar calendário alternativo caso o Google Calendar falhe
  const showFallbackCalendar = () => {
    const targetElement = document.getElementById('google-calendar-target');
    if (targetElement) {
      // Tentar primeiro com iframe
      targetElement.innerHTML = `
        <div class="w-full h-full">
          <iframe 
            src="https://calendar.google.com/calendar/appointments/schedules/AcZssZ3d-iuqdpQJX-z-v3vJvQNzYqRWpkOKHk8NaXxY1SQarbDp6f2McqhSloOW0R_Nyb9tkID-2UZF?gv=true"
            width="100%" 
            height="400" 
            frameborder="0"
            style="border: 0; border-radius: 8px;"
            onload="console.log('iFrame do calendário carregado')"
            onerror="console.error('Erro ao carregar iFrame'); this.style.display='none'; this.nextElementSibling.style.display='block';"
          ></iframe>
          <div class="text-center p-8" style="display: none;">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Calendário Temporariamente Indisponível</h3>
              <p className="text-red-600 mb-4">
                Não foi possível carregar o calendário. Por favor, entre em contato diretamente:
              </p>
              <div className="space-y-2">
                <p className="text-gray-700"><strong>WhatsApp:</strong> (27) 99611-5348</p>
                <p className="text-gray-700"><strong>Email:</strong> suporte@fgtsagent.com</p>
              </div>
            </div>
            <div className="space-x-2">
              <button 
                onclick="window.loadGoogleCalendarScript()" 
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Tentar Script Novamente
              </button>
              <a 
                href="https://calendar.google.com/calendar/appointments/schedules/AcZssZ3d-iuqdpQJX-z-v3vJvQNzYqRWpkOKHk8NaXxY1SQarbDp6f2McqhSloOW0R_Nyb9tkID-2UZF?gv=true"
                target="_blank"
                class="inline-block px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
              >
                Abrir em Nova Aba
              </a>
            </div>
          </div>
        </div>
      `;
    }
  };

  // Preparar form para editar credencial existente
  const handleEdit = (credential: EvolutionCredential) => {
    setSelectedCredential(credential);
    setFormData({
      phone: credential.phone || '',
      instance_name: credential.instance_name || '',
      agent_name: credential.agent_name || ''
    });
    setShowEditModal(true);
  };

  // Preparar confirmação para excluir credencial
  const handleDelete = (credential: EvolutionCredential) => {
    setSelectedCredential(credential);
    setShowDeleteModal(true);
  };

  // Atualizar campos do formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Salvar nova credencial
  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Limpar erros anteriores
    
    try {
      // Preparar dados da credencial
      let credentialData = { 
        ...formData,
        connection_type: connectionType as 'whatsapp_business' | 'ads'
      };
      
      // Se for WhatsApp Business, gerar nome da instância automaticamente
      if (connectionType === 'whatsapp_business') {
        const userName = currentUser?.full_name || currentUser?.displayName || currentUser?.name || currentUser?.email?.split('@')[0] || 'Usuario';
        const agentName = formData.agent_name || 'Agente';
        const phone = formData.phone || '';
        
        // Gerar nome da instância: Usuario_Agente_Phone
        credentialData.instance_name = `${userName}_${agentName}_${phone}`.replace(/\s+/g, '_');
      }
      
      console.log('🔄 Criando credencial com dados:', credentialData);
      
      // Criar registro de credencial
      const createRes = await api.evolution.create(credentialData);
      
      if (createRes.success && createRes.data) {
        console.log('✅ Credencial criada com sucesso:', createRes.data);
        
        // Fechar modal de criação imediatamente
        setShowAddModal(false);
        
        // Criar uma credencial temporária para mostrar instantaneamente
        const tempCredential = {
          ...createRes.data!,
          status: 'pending',
          instance_name: credentialData.instance_name
        };
        
        // Mostrar card instantaneamente
        setCredentials(prev => [...prev, tempCredential]);
        
        // Processar setup e QR Code em background APENAS para WhatsApp Business
        if (connectionType === 'whatsapp_business') {
          (async () => {
            try {
              console.log('🔄 Configurando instância para ID:', createRes.data!.id);
              const setupRes = await api.evolution.setupInstance(createRes.data!.id);
              
        if (setupRes.success && setupRes.data) {
                console.log('✅ Instância configurada com sucesso:', setupRes.data);
                
                // Atualizar credencial com dados reais
                setCredentials(prev => 
                  prev.map(cred => 
                    cred.id === createRes.data!.id ? setupRes.data! : cred
                  )
                );
                
                // Buscar QR Code em background
                console.log('🔄 Solicitando QR Code para ID:', setupRes.data.id);
          const qrRes = await api.evolution.getQrCode(setupRes.data.id);
                
          if (qrRes.success && qrRes.data) {
                  console.log('✅ QR Code obtido com sucesso');
            setQrData(qrRes.data);
            setSelectedCredential(setupRes.data!);
            setShowQrModal(true);
                } else {
                  console.error('❌ Erro ao obter QR Code:', qrRes.message);
                  setError(qrRes.message || 'Erro ao obter QR Code');
          }
        } else {
                console.error('❌ Erro ao configurar instância:', setupRes.message);
          setError(setupRes.message || 'Erro ao configurar instância');
        }
            } catch (err) {
              console.error('❌ Erro no background:', err);
              setError('Erro ao configurar instância: ' + (err instanceof Error ? err.message : String(err)));
            }
          })();
      } else {
          // Para credenciais 'ads', apenas atualizar o status
          setCredentials(prev => 
            prev.map(cred => 
              cred.id === createRes.data!.id 
                ? { ...cred, status: 'aguardando_configuracao' }
                : cred
            )
          );
        }
        
      } else {
        console.error('❌ Erro ao criar credencial:', createRes.message);
        setError(createRes.message || 'Erro ao salvar credencial');
      }
    } catch (err) {
      console.error('❌ Erro geral:', err);
      setError('Erro ao salvar credencial: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Atualizar credencial existente
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCredential) return;
    
    setLoading(true);
    try {
      const response = await api.evolution.update(selectedCredential.id, formData);
      if (response.success && response.data) {
        setCredentials(prev => 
          prev.map(cred => cred.id === selectedCredential.id ? response.data! : cred)
        );
        setShowEditModal(false);
      } else {
        setError(response.message || 'Erro ao atualizar credencial');
      }
    } catch (err) {
      setError('Erro ao atualizar credencial: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Confirmar exclusão de credencial
  const handleConfirmDelete = async () => {
    if (!selectedCredential) return;
    
    setLoading(true);
    try {
      const response = await api.evolution.delete(selectedCredential.id);
      if (response.success) {
        setCredentials(prev => prev.filter(cred => cred.id !== selectedCredential.id));
        setShowDeleteModal(false);
      } else {
        setError(response.message || 'Erro ao excluir credencial');
      }
    } catch (err) {
      setError('Erro ao excluir credencial: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Configurar instância WhatsApp
  const handleSetupInstance = async (credential: EvolutionCredential) => {
    setLoading(true);
    try {
      const response = await api.evolution.setupInstance(credential.id);
      if (response.success && response.data) {
        setCredentials(prev => 
          prev.map(cred => cred.id === credential.id ? response.data! : cred)
        );
      } else {
        setError(response.message || 'Erro ao configurar instância');
      }
    } catch (err) {
      setError('Erro ao configurar instância: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Reiniciar instância WhatsApp
  const handleRestartInstance = async (credential: EvolutionCredential) => {
    if (credential.connection_type !== 'whatsapp_business') {
      setError('Esta funcionalidade é apenas para credenciais WhatsApp Business');
      return;
    }

    setLoading(true);
    try {
      const response = await api.evolution.restartInstance(credential.id);
      if (response.success) {
        await loadCredentials(); // Recarregar todas as credenciais para ter status atualizado
      } else {
        setError(response.message || 'Erro ao reiniciar instância');
      }
    } catch (err) {
      setError('Erro ao reiniciar instância: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Desconectar instância WhatsApp
  const handleDisconnect = async (credential: EvolutionCredential) => {
    if (credential.connection_type !== 'whatsapp_business') {
      setError('Esta funcionalidade é apenas para credenciais WhatsApp Business');
      return;
    }

    setLoading(true);
    try {
      const response = await api.evolution.disconnect(credential.id);
      if (response.success) {
        await loadCredentials();
      } else {
        setError(response.message || 'Erro ao desconectar instância');
      }
    } catch (err) {
      setError('Erro ao desconectar instância: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Exibir QR Code para reconectar instância
  const handleShowQrCode = async (credential: EvolutionCredential) => {
    if (credential.connection_type !== 'whatsapp_business') {
      setError('QR Code é apenas para credenciais WhatsApp Business. Para credenciais de ads, use "Verificar Status".');
      return;
    }

    // Limpar dados anteriores
    setQrData(null);
    setError(null);
    
    // Mostrar modal imediatamente com loading
    setSelectedCredential(credential);
    setShowQrModal(true);
    setLoading(true);
    
    try {
      console.log('🔄 Solicitando QR Code para credential:', credential.id);
      console.log('📱 Dados da credencial:', {
        id: credential.id,
        instance_name: credential.instance_name,
        phone: credential.phone,
        status: credential.status
      });
      
      const response = await api.evolution.getQrCode(credential.id);
      console.log('📱 Resposta completa do QR Code:', response);
      
      if (response.success && response.data) {
        console.log('✅ QR Code obtido com sucesso:', response.data);
        console.log('🔍 Dados do QR Code:', {
          hasBase64: !!response.data.base64,
          hasCode: !!response.data.code,
          hasPairingCode: !!response.data.pairingCode,
          base64Length: response.data.base64?.length,
          codeLength: response.data.code?.length
        });
        setQrData(response.data);
      } else {
        console.error('❌ Erro na resposta:', response.message);
        setError(response.message || 'Erro ao obter QR Code');
      }
    } catch (err) {
      console.error('💥 Erro na requisição:', err);
      setError('Erro ao obter QR Code: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Verificar status de um número específico (Meta API)
  const handleCheckStatus = async (credential: EvolutionCredential) => {
    if (credential.connection_type !== 'ads') {
      setError('Esta funcionalidade é apenas para credenciais de ads');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.evolution.checkStatus(credential.id);
      
      if (response.success && response.data) {
        // Atualizar a credencial na lista com o novo status
        setCredentials(prev => 
          prev.map(cred => 
            cred.id === credential.id 
              ? { ...cred, status: response.data!.status }
              : cred
          )
        );
        
        console.log('✅ Status verificado:', response.data);
      } else {
        setError(response.message || 'Erro ao verificar status');
      }
    } catch (err) {
      console.error('❌ Erro ao verificar status:', err);
      setError('Erro ao verificar status: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Verificar status da Evolution API (WhatsApp Business)
  const handleCheckEvolutionStatus = async (credential: EvolutionCredential) => {
    if (credential.connection_type !== 'whatsapp_business') {
      setError('Esta funcionalidade é apenas para credenciais WhatsApp Business');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fazer verificação real do status via Evolution API
      const response = await api.evolution.checkEvolutionStatus(credential.id);
      
      if (response.success && response.data) {
        // Atualizar a credencial na lista com o novo status
        setCredentials(prev => 
          prev.map(cred => 
            cred.id === credential.id 
              ? { ...cred, status: response.data!.status }
              : cred
          )
        );
        
        console.log('✅ Status da Evolution API verificado:', response.data);
        showSuccess('Status verificado com sucesso!', 'Verificação Realizada');
      } else {
        setError(response.message || 'Erro ao verificar status da Evolution API');
      }
    } catch (err) {
      console.error('❌ Erro ao verificar status da Evolution API:', err);
      setError('Erro ao verificar status: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Verificar status de todos os números
  const handleCheckAllStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      // Separar credenciais por tipo
      const adsCredentials = credentials.filter(cred => cred.connection_type === 'ads');
      const whatsappBusinessCredentials = credentials.filter(cred => cred.connection_type === 'whatsapp_business');

      console.log(`🔄 Verificando status de ${adsCredentials.length} credenciais ads e ${whatsappBusinessCredentials.length} credenciais WhatsApp Business`);

      // Verificar status das credenciais ads via Meta API
      if (adsCredentials.length > 0) {
        try {
          const response = await api.evolution.checkAllStatus();
          
          if (response.success && response.data) {
            // Atualizar credenciais ads com os novos status
            setCredentials(prev => 
              prev.map(cred => {
                if (cred.connection_type === 'ads') {
                  const statusResult = response.data!.find((result: any) => result.credential_id === cred.id);
                  return statusResult ? { ...cred, status: statusResult.status } : cred;
                }
                return cred;
              })
            );
            
            console.log('✅ Status das credenciais ads verificado:', response.data);
          } else {
            console.warn('⚠️ Erro ao verificar status das credenciais ads:', response.message);
          }
        } catch (error) {
          console.error('❌ Erro ao verificar status das credenciais ads:', error);
        }
      }

      // Verificar status das credenciais WhatsApp Business via Evolution API
      if (whatsappBusinessCredentials.length > 0) {
        try {
          // Recarregar credenciais para obter status atualizado da Evolution API
          await loadCredentials();
          console.log('✅ Status das credenciais WhatsApp Business atualizado');
        } catch (error) {
          console.error('❌ Erro ao verificar status das credenciais WhatsApp Business:', error);
        }
      }

      console.log('✅ Status de todos os números verificado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao verificar status de todos os números:', error);
      setError('Erro ao verificar status: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  // Renderizar badge de status com a cor apropriada
  const StatusBadge = ({ status, size = 'sm' }: { status?: string, size?: 'sm' | 'lg' }) => {
    if (!status) return null;
    
    const getStatusConfig = (status: string) => {
      switch (status.toLowerCase()) {
        // Status Evolution API (Baileys)
        case 'connected':
        case 'open':
          return { color: 'bg-green-100 text-green-800 border-green-200', label: 'Conectado' };
        case 'connecting':
          return { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Conectando' };
        case 'disconnected':
          return { color: 'bg-red-100 text-red-800 border-red-200', label: 'Desconectado' };
        
        // Status de configuração
        case 'aguardando_configuracao':
          return { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Aguardando Configuração' };
        case 'configuracao_pendente':
          return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Configuração Pendente' };
        
        // Status da Meta WhatsApp Business API
        case 'verified':
          return { color: 'bg-green-100 text-green-800 border-green-200', label: 'Verificado' };
        case 'approved':
          return { color: 'bg-green-100 text-green-800 border-green-200', label: 'Aprovado' };
        case 'pending':
          return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pendente' };
        case 'in_review':
          return { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Em Revisão' };
        case 'rejected':
          return { color: 'bg-red-100 text-red-800 border-red-200', label: 'Rejeitado' };
        case 'declined':
          return { color: 'bg-red-100 text-red-800 border-red-200', label: 'Recusado' };
        case 'disabled':
          return { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Desabilitado' };
        case 'suspended':
          return { color: 'bg-red-100 text-red-800 border-red-200', label: 'Suspenso' };
        case 'unverified':
          return { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Não Verificado' };
        
        default:
          return { color: 'bg-gray-100 text-gray-800 border-gray-200', label: status };
      }
    };
    
    const config = getStatusConfig(status);
    const classes = size === 'sm' 
      ? 'py-1 px-2 text-xs rounded'
      : 'py-1.5 px-3 text-sm rounded-md';
    
    return (
      <span className={`${config.color} ${classes} font-medium border`}>
        {config.label}
      </span>
    );
  };

  const getStatusDisplay = (status?: string) => {
    if (!status) return <FaQuestionCircle className="text-gray-400" />;
    
    switch (status.toLowerCase()) {
      // Status Evolution API (Baileys)
      case 'connected':
      case 'open':
      case 'verified':
      case 'approved':
        return <FaCheck className="text-green-500" />;
      case 'connecting':
      case 'pending':
      case 'in_review':
        return <FaHourglass className="text-blue-500" />;
      case 'disconnected':
      case 'rejected':
      case 'declined':
      case 'suspended':
        return <FaExclamation className="text-red-500" />;
      case 'aguardando_configuracao':
      case 'unverified':
        return <FaHourglass className="text-orange-500" />;
      case 'configuracao_pendente':
        return <FaExclamation className="text-yellow-500" />;
      case 'disabled':
        return <FaBan className="text-gray-500" />;
      default:
        return <FaQuestionCircle className="text-gray-400" />;
    }
  };

  // Obter ícone baseado no status
  const StatusIcon = ({ status }: { status?: string }) => {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
        {getStatusDisplay(status)}
      </div>
    );
  };

  // Badge para exibir o tipo de conexão
  const ConnectionTypeBadge = ({ connectionType }: { connectionType?: 'whatsapp_business' | 'ads' }) => {
    if (!connectionType) return null;
    
    const getTypeConfig = (type: 'whatsapp_business' | 'ads') => {
      switch (type) {
        case 'whatsapp_business':
          return { 
            color: 'bg-green-500/20 text-green-300 border-green-500/30', 
            label: 'Business',
            icon: <FaWhatsapp className="mr-1 text-xs" />
          };
        case 'ads':
          return { 
            color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', 
            label: 'API Oficial',
            icon: <FaBroadcastTower className="mr-1 text-xs" />
          };
        default:
          return { 
            color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', 
            label: 'Indefinido',
            icon: <FaQuestionCircle className="mr-1 text-xs" />
          };
      }
    };
    
    const config = getTypeConfig(connectionType);
    
    return (
      <span className={`${config.color} py-0.5 px-1.5 text-xs rounded border flex items-center font-medium whitespace-nowrap`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  return (
    <>
      <Navbar />
      <div className="p-3 sm:p-6 bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 min-h-screen">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-cyan-200 to-blue-300">
            Credenciais WhatsApp
          </h1>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
            <button
              onClick={handleCheckAllStatus}
              disabled={loading}
              className="px-3 sm:px-4 py-2 bg-blue-600/20 text-blue-300 rounded-lg hover:bg-blue-600/30 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 text-sm sm:text-base"
            >
              <FaSync className={loading ? 'animate-spin' : ''} />
              <span>Verificar Todos</span>
            </button>
            <button
              onClick={handleOpenMetaSignup}
              className="px-3 sm:px-4 py-2 bg-purple-600/20 text-purple-300 rounded-lg hover:bg-purple-600/30 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
            >
              <FaFacebook className="mr-2" />
              <span>Conectar Meta</span>
            </button>
            <button
              onClick={handleAddNew}
              className="px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 flex items-center justify-center text-sm sm:text-base"
            >
              <FaPlus className="mr-2" /> Nova Credencial
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-600/20 backdrop-blur-sm border border-red-500 rounded-lg shadow-sm text-red-200">
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-xs text-red-300 hover:text-red-100"
            >
              Fechar
            </button>
          </div>
        )}

        {loading && credentials.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : credentials.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-8 text-center">
            <FaWhatsapp className="mx-auto text-4xl text-cyan-400 mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">Nenhuma credencial configurada</h3>
            <p className="text-cyan-100 mb-6">Adicione sua primeira credencial do WhatsApp para começar a usar a integração.</p>
            <button
              onClick={handleAddNew}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 flex items-center mx-auto"
            >
              <FaPlus className="mr-2" /> Adicionar Credencial
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {(() => {
              console.log('🔄 Renderizando lista de credenciais:', {
                totalCredentials: credentials.length,
                credentials: credentials.map(c => ({ id: c.id, instance_name: c.instance_name, status: c.status }))
              });
              return credentials.map((credential) => (
              <div
                key={credential.id}
                className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg border border-cyan-800/30 hover:border-cyan-600/50 transition-all duration-300 overflow-hidden"
              >
                {/* Header compacto com nome, telefone, tipo e status */}
                <div className="p-3 border-b border-cyan-800/30">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        credential.connection_type === 'ads' 
                          ? 'bg-purple-600/20 text-purple-400' 
                          : 'bg-emerald-600/20 text-emerald-400'
                      }`}>
                        {credential.connection_type === 'ads' ? (
                          <FaBroadcastTower className="text-sm" />
                        ) : (
                          <FaWhatsapp className="text-sm" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-white truncate">{credential.agent_name || credential.instance_name || 'Sem nome'}</h3>
                        <p className="text-cyan-300 text-xs truncate">{credential.phone || 'Sem número'}</p>
                      </div>
                    </div>
                    
                    {/* Lado direito: Tipo e Status */}
                    <div className="flex flex-col items-end space-y-1 ml-3">
                      <ConnectionTypeBadge connectionType={credential.connection_type} />
                      <StatusBadge status={credential.status} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Body compacto */}
                <div className="p-3">
                  {/* Status da conexão - mais compacto */}
                  <div className="p-2 rounded-lg bg-white/5 border border-cyan-800/20 mb-3">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="text-xs text-cyan-300 font-medium">STATUS DA CONEXÃO</p>
                        <p className="text-white font-medium text-sm">
                          {credential.status === 'connected' || credential.status === 'open' ? 'Conectado' : 
                           credential.status === 'connecting' ? 'Conectando...' : 
                           credential.status === 'disconnected' ? 'Desconectado' : 'Aguardando Conexão'}
                        </p>
                        {/* Exibir status_description quando disponível */}
                        {credential.status_description && (
                          <p className="text-xs text-cyan-200 mt-1 opacity-80">
                            {credential.status_description}
                          </p>
                        )}
                        
                        {/* Mensagem informativa para credenciais 'ads' não verificadas */}
                        {credential.connection_type === 'ads' && 
                         credential.wpp_number_id && 
                         credential.wpp_access_token && 
                         credential.status !== 'CONNECTED' && 
                         credential.status !== 'connected' && 
                         credential.status !== 'VERIFIED' && 
                         credential.status !== 'verified' && (
                          <div className="mt-2 p-2 rounded-lg bg-blue-800/20 border border-blue-700/30">
                            <p className="text-xs text-blue-200 font-medium mb-1">ℹ️ Número criado com sucesso!</p>
                            <p className="text-xs text-blue-100">
                              O número foi registrado na Meta API. Para completar a configuração, 
                              solicite o código de verificação via SMS.
                            </p>
                          </div>
                        )}
                        
                        {/* Mensagem de sucesso para credenciais 'ads' verificadas */}
                        {credential.connection_type === 'ads' && 
                         credential.wpp_number_id && 
                         credential.wpp_access_token && 
                         (credential.status === 'CONNECTED' || 
                          credential.status === 'connected' || 
                          credential.status === 'VERIFIED' || 
                          credential.status === 'verified') && (
                          <div className="mt-2 p-2 rounded-lg bg-green-800/20 border border-green-700/30">
                            <p className="text-xs text-green-200 font-medium mb-1">✅ Número verificado e pronto!</p>
                            <p className="text-xs text-green-100">
                              O número foi verificado com sucesso na Meta API e está pronto para uso.
                            </p>
                          </div>
                        )}
                        
                        {/* Mensagem para credenciais 'ads' sem dados da Meta API */}
                        {credential.connection_type === 'ads' && 
                         (!credential.wpp_number_id || !credential.wpp_access_token) && (
                          <div className="mt-2 p-2 rounded-lg bg-yellow-800/20 border border-yellow-700/30">
                            <p className="text-xs text-yellow-200 font-medium mb-1">⚠️ Configuração incompleta</p>
                            <p className="text-xs text-yellow-100">
                              Esta credencial precisa ser configurada com os dados da Meta API 
                              (Business Account ID e Access Token).
                            </p>
                          </div>
                        )}
                      </div>
                      <StatusIcon status={credential.status} />
                    </div>
                  </div>
                  
                  {/* Info grid mais compacto */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <p className="text-xs text-cyan-300 mb-1">Agente</p>
                      <p className="font-medium text-white truncate text-xs">{credential.agent_name || '-'}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <p className="text-xs text-cyan-300 mb-1">Criado em</p>
                      <p className="font-medium text-white truncate text-xs">
                        {credential.created_at ? new Date(credential.created_at).toLocaleDateString('pt-BR') : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Botões de ação - grid mais compacto */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleEdit(credential)}
                      className="px-2 py-1.5 rounded-md bg-white/10 text-white text-xs hover:bg-white/20 transition-colors flex items-center justify-center"
                    >
                      <FaEdit className="mr-1" /> Editar
                    </button>
                      
                      {/* Botão Reiniciar - apenas para WhatsApp Business */}
                      {credential.connection_type === 'whatsapp_business' && (
                    <button
                      onClick={() => handleRestartInstance(credential)}
                      className="px-2 py-1.5 rounded-md bg-white/10 text-white text-xs hover:bg-white/20 transition-colors flex items-center justify-center"
                    >
                      <FaSync className="mr-1" /> Reiniciar
                    </button>
                      )}
                      
                      {/* Botão Conectar/Desconectar - apenas para WhatsApp Business */}
                      {credential.connection_type === 'whatsapp_business' && (
                    <button
                      onClick={() => credential.status?.toLowerCase() === 'connected' || credential.status?.toLowerCase() === 'open'
                        ? handleDisconnect(credential)
                        : handleShowQrCode(credential)
                      }
                      className={`px-2 py-1.5 rounded-md text-xs flex items-center justify-center ${
                        credential.status?.toLowerCase() === 'connected' || credential.status?.toLowerCase() === 'open'
                          ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                      }`}
                    >
                      {credential.status?.toLowerCase() === 'connected' || credential.status?.toLowerCase() === 'open'
                        ? 'Desconectar'
                        : 'Conectar'}
                    </button>
                      )}
                      
                      {/* Botão SMS - apenas para credenciais 'ads' não verificadas */}
                      {(() => {
                        const shouldShowSMSButton = credential.connection_type === 'ads' && 
                          credential.wpp_number_id && 
                          credential.wpp_access_token && 
                          credential.status !== 'CONNECTED' && 
                          credential.status !== 'connected' && 
                          credential.status !== 'VERIFIED' && 
                          credential.status !== 'verified';
                        
                        console.log(`🔍 Debug SMS Button para credencial ${credential.id}:`, {
                          connection_type: credential.connection_type,
                          wpp_number_id: credential.wpp_number_id,
                          wpp_access_token: credential.wpp_access_token ? 'presente' : 'ausente',
                          status: credential.status,
                          shouldShow: shouldShowSMSButton
                        });
                        
                        return shouldShowSMSButton ? (
                          <button
                            onClick={() => handleRequestSMS(credential)}
                            className="px-2 py-1.5 rounded-md bg-green-500/20 text-green-300 text-xs hover:bg-green-500/30 transition-colors flex items-center justify-center"
                            title="Solicitar código de verificação via SMS"
                          >
                            <FaPhone className="mr-1" /> Enviar SMS
                          </button>
                        ) : null;
                      })()}
                      
                      {/* Botão Verificar Status - função específica para cada tipo */}
                      <button
                        onClick={() => credential.connection_type === 'ads' 
                          ? handleCheckStatus(credential)
                          : handleCheckEvolutionStatus(credential)
                        }
                        className="px-2 py-1.5 rounded-md bg-blue-500/20 text-blue-300 text-xs hover:bg-blue-500/30 transition-colors flex items-center justify-center"
                      >
                        <FaSync className="mr-1" /> Verificar Status
                      </button>
                      
                    <button
                      onClick={() => handleDelete(credential)}
                      className="px-2 py-1.5 rounded-md bg-red-500/20 text-red-300 text-xs hover:bg-red-500/30 transition-colors flex items-center justify-center"
                    >
                      <FaTrash className="mr-1" /> Excluir
                    </button>
                  </div>
                </div>
              </div>
              ));
            })()}
          </div>
        )}

        {/* Modal de Seleção de Tipo de Conexão */}
        <Transition appear show={showTypeSelection} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setShowTypeSelection(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-lg bg-gradient-to-b from-cyan-900 to-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700/50">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold leading-6 text-cyan-100 mb-2"
                    >
                      Escolha o Tipo de Conexão
                    </Dialog.Title>
                    <p className="text-gray-300 text-sm mb-6">
                      Selecione como você deseja usar o WhatsApp com nossa plataforma:
                    </p>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {/* Opção WhatsApp Business */}
                      <button
                        onClick={() => handleSelectConnectionType('whatsapp_business')}
                        className="group relative p-6 rounded-lg border-2 border-cyan-700/50 hover:border-cyan-500 bg-gradient-to-r from-cyan-800/20 to-blue-800/20 hover:from-cyan-700/30 hover:to-blue-700/30 transition-all duration-300 text-left"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                              <FaWhatsapp className="text-2xl text-green-400" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-white mb-2">
                              WhatsApp Business Próprio
                            </h4>
                            <p className="text-gray-300 text-sm leading-relaxed">
                              Use seu próprio número do WhatsApp Business para atendimento direto aos clientes. 
                              Ideal para suporte, vendas e relacionamento com clientes.
                            </p>
                            <div className="mt-3 flex items-center text-cyan-300 text-sm">
                              <FaCheck className="mr-2" />
                              Configuração rápida e fácil
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Opção Anúncios */}
                      <button
                        onClick={() => handleSelectConnectionType('ads')}
                        className="group relative p-6 rounded-lg border-2 border-cyan-700/50 hover:border-cyan-500 bg-gradient-to-r from-purple-800/20 to-pink-800/20 hover:from-purple-700/30 hover:to-pink-700/30 transition-all duration-300 text-left"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                              <FaExclamation className="text-2xl text-purple-400" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-white mb-2">
                              API Oficial para Anúncios
                            </h4>
                            <p className="text-gray-300 text-sm leading-relaxed">
                              Use a API oficial do WhatsApp para campanhas de marketing e anúncios em massa. 
                              Conecte sua conta do WhatsApp Business através do Facebook.
                            </p>
                            <div className="mt-3 flex items-center text-purple-300 text-sm">
                              <FaFacebook className="mr-2" />
                              Conectar via Facebook
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                    
                    <div className="flex justify-end mt-6">
                      <button
                        type="button"
                        onClick={() => setShowTypeSelection(false)}
                        className="px-4 py-2 rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* Modal de Adição */}
        <Transition appear show={showAddModal} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setShowAddModal(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gradient-to-b from-cyan-900 to-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700/50">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-cyan-100 mb-4"
                    >
                      Nova Credencial WhatsApp Business
                    </Dialog.Title>
                    <form onSubmit={handleSaveNew}>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Nome do Agente
                        </label>
                        <input
                          type="text"
                          name="agent_name"
                          value={formData.agent_name}
                          onChange={handleChange}
                          className="w-full p-2 rounded-md bg-slate-800 border border-cyan-800 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          placeholder="Ex: Pedro Fgts"
                          required
                        />
                      </div>
                      {connectionType !== 'whatsapp_business' && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Nome da Instância
                        </label>
                        <input
                          type="text"
                          name="instance_name"
                          value={formData.instance_name}
                          onChange={handleChange}
                          className="w-full p-2 rounded-md bg-slate-800 border border-cyan-800 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          placeholder="Ex: atendimento1"
                          required
                        />
                      </div>
                      )}
{/* Mensagem informativa removida conforme solicitado */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Número de Telefone
                        </label>
                        <input
                          type="text"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full p-2 rounded-md bg-slate-800 border border-cyan-800 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          placeholder="Ex: 5511999999999"
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowAddModal(false)}
                          className="px-4 py-2 rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-cyan-600 text-white hover:from-emerald-600 hover:to-cyan-700 transition-colors"
                          disabled={loading}
                        >
                          {loading ? 'Criando...' : 'Criar'}
                        </button>
                      </div>
                    </form>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* Modal de Edição */}
        <Transition appear show={showEditModal} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setShowEditModal(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gradient-to-b from-cyan-900 to-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700/50">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-cyan-100 mb-4"
                    >
                      Editar Credencial
                    </Dialog.Title>
                    <form onSubmit={handleUpdate}>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Nome do Agente
                        </label>
                        <input
                          type="text"
                          name="agent_name"
                          value={formData.agent_name}
                          onChange={handleChange}
                          className="w-full p-2 rounded-md bg-slate-800 border border-cyan-800 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          placeholder="Ex: Pedro Fgts"
                          required
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Nome da Instância
                        </label>
                        <input
                          type="text"
                          name="instance_name"
                          value={formData.instance_name}
                          onChange={handleChange}
                          className="w-full p-2 rounded-md bg-slate-800 border border-cyan-800 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          placeholder="Ex: atendimento1"
                          required
                        />
                      </div>
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Número de Telefone
                        </label>
                        <input
                          type="text"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full p-2 rounded-md bg-slate-800 border border-cyan-800 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          placeholder="Ex: 5511999999999"
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowEditModal(false)}
                          className="px-4 py-2 rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-cyan-600 text-white hover:from-emerald-600 hover:to-cyan-700 transition-colors"
                          disabled={loading}
                        >
                          {loading ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </form>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* Modal de Exclusão */}
        <Transition appear show={showDeleteModal} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-50"
            onClose={() => setShowDeleteModal(false)}
          >
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gradient-to-b from-red-900 to-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-red-700/50">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-white mb-4"
                    >
                      Confirmar Exclusão
                    </Dialog.Title>
                    <div className="mb-6">
                      <p className="text-gray-300 mb-2">
                        Tem certeza que deseja excluir esta credencial?
                      </p>
                      <p className="text-white font-medium">
                        {selectedCredential?.agent_name || selectedCredential?.instance_name || 'Sem nome'}
                      </p>
                      <p className="text-red-300 text-sm mt-4">
                        Esta ação não pode ser desfeita e removerá permanentemente esta instância do WhatsApp.
                      </p>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowDeleteModal(false)}
                        className="px-4 py-2 rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDelete}
                        className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                        disabled={loading}
                      >
                        {loading ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* Modal de QR Code */}
        <Transition appear show={showQrModal} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-50"
            onClose={() => setShowQrModal(false)}
          >
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gradient-to-b from-cyan-900 to-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700/50">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-cyan-100 mb-4"
                    >
                      Conectar WhatsApp
                    </Dialog.Title>
                    <div className="flex flex-col items-center mb-6">
                      {(() => {
                        console.log('🔍 Renderizando QR Code modal:', {
                          hasQrData: !!qrData,
                          hasBase64: !!qrData?.base64,
                          hasCode: !!qrData?.code,
                          isLoading: loading,
                          hasError: !!error,
                          qrData: qrData
                        });
                        
                        if (qrData?.base64) {
                          console.log('📱 Exibindo QR Code como imagem base64');
                          return (
                        <div className="bg-white p-4 rounded-lg shadow-inner">
                          <img
                            src={qrData.base64.startsWith('data:') ? qrData.base64 : `data:image/png;base64,${qrData.base64}`}
                            alt="QR Code para conexão"
                            className="w-64 h-64"
                          />
                        </div>
                          );
                        } else if (qrData?.code) {
                          console.log('📱 Exibindo QR Code como SVG');
                          return (
                        <div className="bg-white p-4 rounded-lg shadow-inner">
                          <QRCodeSVG value={qrData.code} size={256} style={{ width: '100%', height: '100%' }} />
                        </div>
                          );
                        } else if (loading) {
                          console.log('⏳ Exibindo loading');
                          return (
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-400 mb-4"></div>
                          <p className="text-cyan-300 text-lg font-medium">Gerando QR Code...</p>
                          <p className="text-gray-400 text-sm mt-2">Isso pode levar até 10 segundos</p>
                        </div>
                          );
                        } else if (error) {
                          console.log('❌ Exibindo erro:', error);
                          return (
                        <div className="text-center">
                          <div className="bg-red-900/50 p-6 rounded-lg mb-4 border border-red-700">
                            <FaExclamation className="text-4xl text-red-400 mx-auto mb-2" />
                            <p className="text-red-300 font-medium mb-2">Erro ao gerar QR Code</p>
                            <p className="text-red-200 text-sm">{error}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => selectedCredential && handleShowQrCode(selectedCredential)}
                            className="px-4 py-2 rounded-md bg-cyan-600 text-white hover:bg-cyan-700 transition-colors flex items-center gap-2 mx-auto"
                            disabled={loading}
                          >
                            <FaSync className={loading ? 'animate-spin' : ''} />
                            Tentar Novamente
                          </button>
                        </div>
                          );
                        } else {
                          console.log('❓ Exibindo estado vazio');
                          return (
                        <div className="text-center">
                          <div className="bg-gray-800 p-8 rounded-lg mb-4">
                            <FaQuestionCircle className="text-6xl text-gray-500 mx-auto mb-2" />
                            <p className="text-gray-400">QR Code não disponível</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => selectedCredential && handleShowQrCode(selectedCredential)}
                            className="px-4 py-2 rounded-md bg-cyan-600 text-white hover:bg-cyan-700 transition-colors flex items-center gap-2 mx-auto"
                            disabled={loading}
                          >
                            <FaSync className={loading ? 'animate-spin' : ''} />
                            {loading ? 'Atualizando...' : 'Atualizar QR Code'}
                          </button>
                        </div>
                          );
                        }
                      })()}
                      
                      {qrData?.pairingCode && (
                        <div className="mt-4 text-center">
                          <p className="text-white">Ou use o código de pareamento:</p>
                          <p className="text-xl font-mono font-bold text-cyan-300 mt-2 tracking-widest bg-slate-800 p-2 rounded">
                            {qrData.pairingCode}
                          </p>
                        </div>
                      )}
                      
                      <p className="text-gray-300 text-sm mt-4 text-center">
                        Escaneie este QR Code com seu WhatsApp para conectar o número{' '}
                        <span className="font-medium text-white">{selectedCredential?.phone || ''}</span>
                      </p>
                      
                      {(qrData?.base64 || qrData?.code) && (
                        <button
                          type="button"
                          onClick={() => selectedCredential && handleShowQrCode(selectedCredential)}
                          className="mt-3 px-3 py-1 text-sm rounded-md bg-slate-700 text-gray-300 hover:bg-slate-600 transition-colors flex items-center gap-2"
                          disabled={loading}
                        >
                          <FaSync className={loading ? 'animate-spin' : ''} />
                          Atualizar
                        </button>
                      )}
                    </div>
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => setShowQrModal(false)}
                        className="px-6 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-cyan-600 text-white hover:from-emerald-600 hover:to-cyan-700 transition-colors"
                      >
                        Fechar
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* Modal de Formulário para API Oficial */}
        <Transition appear show={showAdsModal} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setShowAdsModal(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gradient-to-b from-purple-900 to-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-purple-700/50">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold leading-6 text-purple-100 mb-4"
                    >
                      Nova Credencial WhatsApp Business
                    </Dialog.Title>
                    
                    <form onSubmit={handleAdsFormSubmit}>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="ads_agent_name" className="block text-sm font-medium text-purple-200 mb-2">
                            Nome do Agente
                          </label>
                          <input
                            type="text"
                            id="ads_agent_name"
                            name="agent_name"
                            value={adsFormData.agent_name}
                            onChange={handleAdsFormChange}
                            placeholder="Ex: Pedro Fgts"
                            className="w-full px-3 py-2 bg-slate-800 border border-purple-700/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="ads_phone" className="block text-sm font-medium text-purple-200 mb-2">
                            Número de Telefone
                          </label>
                          <input
                            type="tel"
                            id="ads_phone"
                            name="phone"
                            value={adsFormData.phone}
                            onChange={handleAdsFormChange}
                            placeholder="Ex: 5511999999999"
                            className="w-full px-3 py-2 bg-slate-800 border border-purple-700/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="ads_business_account_id" className="block text-sm font-medium text-purple-200 mb-2">
                            Business Account ID
                          </label>
                          <input
                            type="text"
                            id="ads_business_account_id"
                            name="businessAccountId"
                            value={metaPhoneData.businessAccountId}
                            onChange={(e) => setMetaPhoneData(prev => ({ ...prev, businessAccountId: e.target.value }))}
                            placeholder="Ex: 123456789012345"
                            className="w-full px-3 py-2 bg-slate-800 border border-purple-700/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="ads_access_token" className="block text-sm font-medium text-purple-200 mb-2">
                            Access Token
                          </label>
                          <input
                            type="password"
                            id="ads_access_token"
                            name="accessToken"
                            value={metaPhoneData.accessToken}
                            onChange={(e) => setMetaPhoneData(prev => ({ ...prev, accessToken: e.target.value }))}
                            placeholder="Ex: EAABwzLixnjYBO..."
                            className="w-full px-3 py-2 bg-slate-800 border border-purple-700/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-3 mt-6">
                        <button
                          type="button"
                          onClick={() => setShowAdsModal(false)}
                          className="px-4 py-2 rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition-colors"
                          disabled={loading}
                        >
                          {loading ? 'Processando...' : 'Criar'}
                        </button>
                      </div>
                    </form>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* Modal de Verificação de Código WhatsApp */}
        <Transition appear show={showVerificationModal} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setShowVerificationModal(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gradient-to-b from-blue-900 to-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-blue-700/50">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-blue-100 mb-4 text-center"
                    >
                      Verificar Número WhatsApp
                    </Dialog.Title>
                    
                    <div className="mb-4">
                      <p className="text-gray-300 text-sm mb-3 text-center">
                        Um código de verificação foi enviado via SMS para o número registrado. 
                        Digite o código para completar a verificação:
                      </p>
                      
                      {verificationError && (
                        <div className="bg-red-800/20 border border-red-700/50 p-3 rounded-lg mb-4">
                          <p className="text-red-200 text-sm">{verificationError}</p>
                        </div>
                      )}
                    </div>
                    
                    <form onSubmit={handleVerifyCode}>
                      <div className="mb-4">
                        <label htmlFor="verificationCode" className="block text-sm font-medium text-blue-200 mb-2">
                          Código de Verificação
                        </label>
                        <input
                          type="text"
                          id="verificationCode"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Digite o código de 6 dígitos"
                          maxLength={6}
                          required
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <button
                          type="button"
                          onClick={handleRequestNewSMS}
                          className="px-3 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors text-sm"
                        >
                          📱 Solicitar SMS
                        </button>
                        
                        <div className="flex space-x-3">
                          <button
                            type="button"
                            onClick={() => setShowVerificationModal(false)}
                            className="px-4 py-2 rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-md bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-colors"
                            disabled={verificationStep === 'verify'}
                          >
                            {verificationStep === 'verify' ? 'Verificando...' : 'Verificar'}
                          </button>
                        </div>
                      </div>
                    </form>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* Modal de Calendário do Google */}
        <Transition appear show={showCalendar} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setShowCalendar(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gradient-to-b from-emerald-900 to-slate-900 p-4 text-left align-middle shadow-xl transition-all border border-emerald-700/50">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-emerald-100 mb-3 text-center"
                    >
                      Agendar Configuração do WhatsApp
                    </Dialog.Title>
                    
                    <div className="mb-3">
                      <p className="text-gray-300 text-xs mb-3 text-center">
                        Para configurar a API oficial do WhatsApp para anúncios, nossa equipe especializada precisa fazer 
                        a configuração personalizada com você. Escolha um horário conveniente:
                      </p>
                      
                      {adsFormData.agent_name && (
                        <div className="bg-emerald-800/20 p-2 rounded-lg mb-3">
                          <p className="text-emerald-200 text-xs">
                            <strong>Agente:</strong> {adsFormData.agent_name}
                          </p>
                          {adsFormData.phone && (
                            <p className="text-emerald-200 text-xs">
                              <strong>Telefone:</strong> {adsFormData.phone}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Container para o Google Calendar - Forçar centralização */}
                    <div className="min-h-[200px] flex items-center justify-center">
                      <div 
                        id="google-calendar-target" 
                        className="w-full flex justify-center"
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          textAlign: 'center'
                        }}
                      >
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto mb-3"></div>
                          <p className="text-emerald-200 mb-3 text-xs">Carregando calendário...</p>
                          <button
                            type="button"
                            onClick={() => {
                              console.log('Botão recarregar clicado');
                              loadGoogleCalendarScript();
                            }}
                            className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                          >
                            Recarregar Calendário
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-center mt-3">
                      <button
                        type="button"
                        onClick={() => setShowCalendar(false)}
                        className="px-4 py-1.5 text-sm rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                      >
                        Fechar
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* Modal de Confirmação de SMS */}
        <Transition appear show={showSMSConfirmation} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setShowSMSConfirmation(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gradient-to-b from-cyan-900 to-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-cyan-700/50">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-cyan-100 mb-4"
                    >
                      Confirmar Envio de SMS
                    </Dialog.Title>
                    <div className="mb-6">
                      <p className="text-gray-300 mb-2">
                        Tem certeza que deseja enviar um SMS para esta credencial?
                      </p>
                      <p className="text-white font-medium">
                        {selectedCredentialForSMS?.agent_name || selectedCredentialForSMS?.instance_name || 'Sem nome'}
                      </p>
                      <div className="mt-4 p-3 bg-yellow-800/20 border border-yellow-700/50 rounded-lg">
                        <p className="text-yellow-200 text-sm font-medium mb-1">⚠️ Importante:</p>
                        <p className="text-yellow-100 text-xs">
                          • Esta ação não pode ser desfeita<br/>
                          • Um SMS será enviado para o número registrado<br/>
                          • A Meta API tem limites de solicitações por dia<br/>
                          • Use com moderação para evitar bloqueios
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowSMSConfirmation(false)}
                        className="px-4 py-2 rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmSMS}
                        className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
                        disabled={loading}
                      >
                        {loading ? 'Enviando...' : 'Enviar SMS'}
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* Modal do iframe da Meta */}
        <Transition appear show={showMetaIframeModal} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={handleCloseMetaIframe}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-lg bg-gradient-to-b from-purple-900 to-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-purple-700/50">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold leading-6 text-purple-100 mb-4 flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <FaLink className="mr-2 text-purple-400" />
                        Conectar Conta do WhatsApp Business
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleOpenMetaInNewTab}
                          className="px-3 py-1 text-sm bg-purple-600/20 text-purple-300 rounded hover:bg-purple-600/30 transition-colors flex items-center"
                        >
                          ↗
                          Abrir em Nova Aba
                        </button>
                        <button
                          onClick={handleCloseMetaIframe}
                          className="text-purple-300 hover:text-purple-100 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </Dialog.Title>
                    
                    <div className="mb-4">
                      <div className="bg-purple-800/20 border border-purple-700/30 rounded-lg p-4 mb-4">
                        <h4 className="text-purple-200 font-medium mb-2">📋 Instruções:</h4>
                        <ol className="text-purple-100 text-sm space-y-1 list-decimal list-inside">
                          <li>Faça login na sua conta do Facebook Business</li>
                          <li>Navegue até a seção "WhatsApp Business"</li>
                          <li>Clique em "Adicionar número de telefone"</li>
                          <li>Siga o processo de verificação da Meta</li>
                          <li>Após a conexão, volte aqui e clique em "Verificar Todos"</li>
                        </ol>
                      </div>
                      
                      {metaConnectionStatus === 'connecting' && (
                        <div className="bg-blue-800/20 border border-blue-700/30 rounded-lg p-3 mb-4">
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-400 mr-2"></div>
                            <span className="text-blue-200 text-sm">Conectando com a Meta...</span>
                          </div>
                        </div>
                      )}
                      
                      {metaConnectionStatus === 'connected' && (
                        <div className="bg-green-800/20 border border-green-700/30 rounded-lg p-3 mb-4">
                          <div className="flex items-center">
                            <FaCheck className="text-green-400 mr-2" />
                            <span className="text-green-200 text-sm">Conta conectada com sucesso!</span>
                          </div>
                        </div>
                      )}
                      
                      {metaConnectionStatus === 'error' && (
                        <div className="bg-red-800/20 border border-red-700/30 rounded-lg p-3 mb-4">
                          <div className="flex items-center">
                            <FaExclamation className="text-red-400 mr-2" />
                            <span className="text-red-200 text-sm">Erro na conexão. Tente novamente.</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="relative">
                      <iframe
                        src={metaIframeUrl}
                        className="w-full h-96 border-0 rounded-lg bg-white"
                        title="Meta WhatsApp Business"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                        allow="camera; microphone; geolocation"
                      />
                      
                      {/* Overlay para caso o iframe não carregue */}
                      <div className="absolute inset-0 bg-gray-800/50 flex items-center justify-center rounded-lg" style={{ display: 'none' }}>
                        <div className="text-center">
                          <FaExclamation className="text-4xl text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-300">Não foi possível carregar o iframe da Meta</p>
                          <button
                            onClick={handleOpenMetaInNewTab}
                            className="mt-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                          >
                            Abrir em Nova Aba
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-between items-center">
                      <p className="text-purple-200 text-sm">
                        💡 <strong>Dica:</strong> Se o iframe não carregar, use o botão "Abrir em Nova Aba"
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleCloseMetaIframe}
                          className="px-4 py-2 rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                        >
                          Fechar
                        </button>
                        <button
                          onClick={handleCheckAllStatus}
                          className="px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                        >
                          Verificar Conexões
                        </button>
                      </div>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* Modal do Meta Signup */}
        <Transition appear show={showMetaSignupModal} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={handleCloseMetaSignup}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gradient-to-b from-purple-900 to-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-purple-700/50">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-purple-100 mb-4 flex items-center"
                    >
                      <FaFacebook className="mr-2 text-purple-400" />
                      Conectar Conta do WhatsApp Business
                    </Dialog.Title>
                    
                    <div className="mb-6">
                      <p className="text-gray-300 text-sm mb-4">
                        Conecte sua conta do WhatsApp Business através do Facebook para usar a API oficial da Meta.
                      </p>
                      
                      {metaSignupStatus === 'connecting' && (
                        <div className="bg-blue-800/20 border border-blue-700/30 rounded-lg p-4 mb-4">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400 mx-auto mb-3"></div>
                            <p className="text-blue-200 text-sm mb-2">Conectando com o Facebook...</p>
                            <p className="text-blue-100 text-xs">Aguarde enquanto o Facebook carrega o processo de autorização.</p>
                          </div>
                        </div>
                      )}
                      
                      {metaSignupStatus === 'connected' && (
                        <div className="bg-green-800/20 border border-green-700/30 rounded-lg p-3 mb-4">
                          <div className="flex items-center">
                            <FaCheck className="text-green-400 mr-2" />
                            <span className="text-green-200 text-sm">Conta conectada com sucesso!</span>
                          </div>
                        </div>
                      )}
                      
                      {metaSignupStatus === 'error' && (
                        <div className="bg-red-800/20 border border-red-700/30 rounded-lg p-3 mb-4">
                          <div className="flex items-center">
                            <FaExclamation className="text-red-400 mr-2" />
                            <span className="text-red-200 text-sm">Erro na conexão. Tente novamente.</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={handleCloseMetaSignup}
                        className="px-4 py-2 rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                      >
                        Fechar
                      </button>
                      {metaSignupStatus === 'error' && (
                        <button
                          type="button"
                          onClick={launchWhatsAppSignup}
                          className="px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center"
                        >
                          <FaFacebook className="mr-2" />
                          Tentar Novamente
                        </button>
                      )}
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* Modal de Erro Customizado */}
        <ErrorModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          title={modalState.title}
          message={modalState.message}
          type={modalState.type}
          metaCode={modalState.metaCode}
          metaSubcode={modalState.metaSubcode}
        />
      </div>
    </>
  );
} 