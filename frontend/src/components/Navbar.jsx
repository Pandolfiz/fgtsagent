import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { FaBars, FaTimes, FaUser, FaCog, FaSignOutAlt, FaBell, FaGlobe, FaUsers, FaRobot, FaComments, FaWhatsapp, FaKey, FaTrophy } from 'react-icons/fa';
import supabase from '../lib/supabaseClient';
import { useSessionPersistence } from '../hooks/useSessionPersistence';
import NotificationButton from './NotificationButton';
import { ChevronUpDownIcon } from '@heroicons/react/24/solid'
import { cachedFetch } from '../utils/authCache'

export default function Navbar({ fullWidth }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [auth, setAuth] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [responsiveName, setResponsiveName] = useState('');
  const [authError, setAuthError] = useState(false); // ✅ NOVO: Flag para evitar loops após erro 401
  
  // ✅ Hook de persistência de sessão (removido forceClearSession para evitar conflitos)
  // const { forceClearSession } = useSessionPersistence();

  const brand = { label: 'FgtsAgent', icon: <FaRobot /> }
  const links = [
    { label: 'Dashboard', icon: <FaGlobe />, href: '/dashboard' },
    { label: 'Leads', icon: <FaUsers />, href: '/leads' },
    { label: 'Ads', icon: <FaTrophy />, href: '/ads' },
    { label: 'Agente', icon: <FaRobot />, href: '/agents' },
    { label: 'Chat', icon: <FaComments />, href: '/chat' },
    { label: 'WhatsApp', icon: <FaWhatsapp />, href: '/whatsapp-credentials' },
    { label: 'V8', icon: <FaKey />, href: '/partner-credentials' }
  ]

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''

  // ✅ CORRIGIDO: Hook para detectar o tamanho da tela (apenas uma declaração)
  const [screenSize, setScreenSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 1024; // Default para desktop
  });

  // Função para truncar o nome responsivamente
  const getResponsiveName = (fullName) => {
    if (!fullName) return 'Usuário';

    const words = fullName.trim().split(' ');
    if (words.length <= 1) return fullName;

    // Em telas pequenas, mostrar apenas a primeira palavra
    if (screenSize < 768) {
      return words[0];
    }

    // Em telas médias, mostrar até 2 palavras
    if (screenSize < 1024) {
      return words.slice(0, 2).join(' ');
    }

    // Em telas grandes, mostrar o nome completo
    return fullName;
  };

  useEffect(() => {
    let isMounted = true;

    // Listener para redimensionamento da janela com debounce
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setScreenSize(window.innerWidth);
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    async function fetchUserProfile() {
      // ✅ CORRIGIDO: Não tentar novamente se já houve erro 401
      if (authError) {
        console.log('[Navbar] Pulando fetchUserProfile - erro 401 anterior');
        return;
      }
      
      try {
        setIsLoading(true);
        // Tentar obter tokens de várias fontes
        let authToken = null;

        // 1. Verificar localStorage (tokens do Supabase)
        const storedTokens = localStorage.getItem('supabase_tokens');
        if (storedTokens) {
          try {
            const tokens = JSON.parse(storedTokens);
            if (tokens && tokens.access_token) {
              authToken = tokens.access_token;
              console.log('Token encontrado no localStorage');
            }
          } catch (e) {
            console.error('Erro ao ler tokens do localStorage:', e);
          }
        }

        // 2. Verificar cookies
        const jsAuthToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('js-auth-token='));
        if (jsAuthToken) {
          authToken = jsAuthToken.split('=')[1];
          console.log('Token encontrado no cookie js-auth-token');
        }

        // 3. Verificar token específico do Supabase em cookies
        const supabaseToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('supabase-auth-token='));
        if (supabaseToken) {
          authToken = supabaseToken.split('=')[1];
          console.log('Token encontrado no cookie supabase-auth-token');
        }

        // 4. Verificar token genérico em cookies
        const genericToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('authToken='));
        if (genericToken) {
          authToken = genericToken.split('=')[1];
          console.log('Token encontrado no cookie authToken');
        }

        // Tentar fazer a requisição para obter o perfil usando cache
        const data = await cachedFetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Incluir token de autorização se disponível
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
          },
          credentials: 'include' // Incluir cookies na requisição
        });



        // Se a resposta for bem-sucedida, processar os dados do usuário
        if (data && data.success) {




          // Verificar e extrair o nome do usuário da resposta
          if (data.success && data.user) {
            // Priorizar campos específicos de nome em ordem de preferência
            const userName = data.user.full_name ||
                            data.user.displayName ||
                            data.user.name ||
                            (data.user.user_metadata && data.user.user_metadata.full_name) ||
                            (data.user.firstName && data.user.lastName ? `${data.user.firstName} ${data.user.lastName}` : null) ||
                            (data.user.first_name && data.user.last_name ? `${data.user.first_name} ${data.user.last_name}` : null) ||
                            data.user.email?.split('@')[0] ||
                            'Usuário';


            if (isMounted) {
              setDisplayName(userName);
              setAuth(true);
            }
          } else {
            console.log('Resposta da API não contém dados de usuário válidos');
            setAuth(false);
          }
        } else {
          console.log('Falha ao obter perfil do usuário');
          if (isMounted) setAuth(false);
        }
      } catch (error) {
        console.error('Erro ao buscar perfil do usuário:', error);
        if (isMounted) {
          setAuth(false);
          // ✅ CORRIGIDO: Marcar erro 401 para evitar loops
          if (error.message && error.message.includes('401')) {
            setAuthError(true);
            console.log('[Navbar] Erro 401 detectado - parando tentativas futuras');
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchUserProfile();

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    };
  }, []);

  // useEffect para atualizar o nome responsivo quando screenSize ou displayName mudarem
  useEffect(() => {
    setResponsiveName(getResponsiveName(displayName));
  }, [screenSize, displayName]);

  // Função para fazer logout (INTELIGENTE)
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Iniciando logout inteligente...');

      // ✅ PASSO 0: Marcar que estamos fazendo logout
      localStorage.setItem('isLoggingOut', 'true');

      // ✅ PASSO 1: Preservar dados LGPD antes da limpeza
      const lgpdConsent = localStorage.getItem('cookieConsent');
      const lgpdConsentDate = localStorage.getItem('cookieConsentDate');
      const lgpdConsentCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('lgpd_consent='));

      // ✅ PASSO 2: Verificar se token ainda é válido antes de tentar logout via API
      console.log('🔄 Verificando se token ainda é válido...');
      let tokenIsValid = false;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        tokenIsValid = !!(session?.access_token);
        console.log('🔍 Token válido:', tokenIsValid);
      } catch (error) {
        console.log('⚠️ Erro ao verificar sessão:', error.message);
        tokenIsValid = false;
      }

      // ✅ PASSO 3: Fazer logout via Supabase (sempre funciona)
      console.log('🔄 Fazendo logout via Supabase...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erro ao fazer logout via Supabase:', error);
      }

      // ✅ PASSO 4: Logout via API apenas se token for válido
      if (tokenIsValid) {
        console.log('🔄 Token válido, fazendo logout via API...');
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
          });
          console.log('✅ Logout via API bem-sucedido');
        } catch (apiError) {
          console.log('⚠️ Logout via API falhou:', apiError.message);
        }
      } else {
        console.log('⏭️ Token inválido, pulando logout via API');
      }

      // ✅ PASSO 5: Limpeza local seletiva (preservando LGPD)
      console.log('🔄 Limpeza seletiva de dados...');
      
      // Limpar apenas dados de autenticação
      const authKeys = ['authToken', 'supabase-auth', 'supabase.auth.token'];
      authKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // Limpar cookies de autenticação (preservando LGPD)
      const authCookies = [
        'supabase-auth-token', 'js-auth-token', 'sb-refresh-token', 
        'sb-access-token', 'authToken', 'refreshToken'
      ];
      authCookies.forEach(cookieName => {
        document.cookie = `${cookieName}=; path=/; max-age=0; SameSite=Lax`;
      });

      // ✅ PASSO 6: Restaurar dados LGPD se existiam
      if (lgpdConsent) {
        localStorage.setItem('cookieConsent', lgpdConsent);
        if (lgpdConsentDate) {
          localStorage.setItem('cookieConsentDate', lgpdConsentDate);
        }
        console.log('✅ Dados LGPD preservados');
      }
      
      if (lgpdConsentCookie) {
        document.cookie = lgpdConsentCookie;
        console.log('✅ Cookie LGPD preservado');
      }

      // ✅ PASSO 7: Limpar flag de logout e redirecionar
      console.log('✅ Logout concluído, redirecionando...');
      localStorage.removeItem('isLoggingOut'); // Limpar flag de logout
      setTimeout(() => {
        window.location.href = '/login?success=logout&message=Logout realizado com sucesso';
      }, 500); // Aumentado para 500ms para evitar conflitos

    } catch (error) {
      console.error('Erro durante o logout:', error);
      
      // ✅ FALLBACK: Limpeza de emergência
      console.log('⚠️ Erro no logout, forçando limpeza...');
      localStorage.removeItem('isLoggingOut'); // Limpar flag de logout
      localStorage.clear();
      sessionStorage.clear();
      
      setTimeout(() => {
        window.location.href = '/login?error=logout_error&message=Erro no logout, mas sessão foi limpa';
      }, 100);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <nav className={`bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 text-white ${fullWidth ? 'px-3 py-2' : 'px-6 py-3'} flex items-center justify-between relative`}>
      {/* Brand */}
      <div className="flex items-center space-x-2 mr-8">
        {/* Logo com animação */}
        <span
          className="text-2xl text-cyan-400 filter drop-shadow-[0_0_6px_rgba(14,165,233,0.7)] hover:animate-spin"
        >
          {brand.icon}
        </span>
        {/* Texto do brand com gradient */}
        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
          {brand.label}
        </span>
      </div>
      {/* Desktop Links */}
      <ul className="hidden md:flex items-center space-x-4">
        {links.map(link => {
          const isActive = currentPath === link.href
          return (
            <li key={link.href}>
              <a
                href={link.href}
                className={
                  `flex items-center justify-between space-x-2 px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 transition-colors duration-200 shadow-inner ` +
                  (isActive
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white border-transparent'
                    : 'hover:bg-white/10 hover:border-cyan-400')
                }
              >
                <span className="text-lg">{link.icon}</span>
                <span className="font-medium">{link.label}</span>
              </a>
            </li>
          )
        })}
      </ul>
      {/* Container do Hamburger móvel e Dropdown usuário */}
      <div className="flex items-center gap-3">
        {/* Botão de Notificações */}
        <NotificationButton />
        
        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(open => !open)}
          className="md:hidden flex items-center justify-center px-3 py-2 rounded-lg bg-white/10 border border-cyan-800/50 text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 transition-colors duration-200 hover:bg-white/15"
        >
          {mobileMenuOpen ? <FaTimes className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
        </button>
        {/* Dropdown do perfil do usuário */}
        <div className="relative">
          <Menu>
            <div>
              <Menu.Button className="inline-flex items-center justify-between space-x-2 px-3 py-2 rounded-lg bg-white/10 border border-cyan-800/50 text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 transition-colors duration-200 hover:bg-white/15">
                <span className="mr-2">
                  {isLoading ? (
                    <span className="animate-pulse">Carregando...</span>
                  ) : (
                    <span className="font-medium">{responsiveName || displayName || 'Usuário'}</span>
                  )}
                </span>
                <ChevronUpDownIcon className="h-5 w-5" />
              </Menu.Button>
            </div>
            <Menu.Items className="absolute right-0 z-50 mt-1 w-56 rounded-lg bg-gradient-to-br from-emerald-950/95 via-cyan-950/95 to-blue-950/95 backdrop-blur-sm border border-cyan-800/50 shadow-lg focus:outline-none">
              {[
                { icon: <FaUser className="mr-2 h-5 w-5" />, label: 'Perfil', onClick: () => navigate('/profile') },
                // { icon: <FaCog className="mr-2 h-5 w-5" />, label: 'Configurações', onClick: () => navigate('/settings') },
                { icon: <FaSignOutAlt className="mr-2 h-5 w-5" />, label: 'Sair', onClick: handleLogout }
              ].map(item => (
                <Menu.Item key={item.label}>
                  {({ active }) => (
                    <button
                      onClick={item.onClick}
                      className={`flex w-full items-center px-4 py-2 rounded-lg text-base transition-colors duration-200 ${
                        active ? 'bg-white/10' : 'hover:bg-white/10'
                      } text-cyan-100`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  )}
                </Menu.Item>
              ))}
            </Menu.Items>
          </Menu>
        </div>
      </div>
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-gradient-to-br from-emerald-950/95 via-cyan-950/95 to-blue-950/95 border-t border-cyan-900/50 z-50">
          <ul className="p-2 space-y-2">
            {links.map((link) => {
              const isActive = currentPath === link.href;
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className={`flex items-center space-x-2 px-4 py-3 rounded-lg ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white'
                        : 'bg-white/5 text-cyan-100 hover:bg-white/10'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="text-lg">{link.icon}</span>
                    <span className="font-medium">{link.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  )
}