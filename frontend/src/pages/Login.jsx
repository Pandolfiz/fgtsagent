import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import NeuralNetworkBackground from '../NeuralNetworkBackground.jsx';
import LandingNavbar from '../components/LandingNavbar.jsx';
import supabase from '../lib/supabaseClient';
import tokenManager from '../utils/tokenManager';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Redirecionamento após login
  const getRedirect = () => {
    // Verificar primeiro o parâmetro 'redirect' na URL
    const searchParams = new URLSearchParams(location.search);
    const urlRedirect = searchParams.get('redirect');

    if (urlRedirect) {
      return urlRedirect;
    }

    // Se não tiver na URL, verificar no localStorage
    const redirectTo = localStorage.getItem('redirectAfterLogin');
    if (redirectTo) {
      localStorage.removeItem('redirectAfterLogin');
      return redirectTo;
    }

    // Caso não tenha redirecionamento especificado, ir para o dashboard
    return '/dashboard';
  };

  // Checar se há mensagens na URL - Executado na montagem do componente
  useEffect(() => {
    // Extrair parâmetros da URL
    const searchParams = new URLSearchParams(location.search);
    const errorParam = searchParams.get('error');
    const messageParam = searchParams.get('message');
    const successParam = searchParams.get('success');

    // Verificar se foi redirecionado por sessão expirada
    if (errorParam === 'session_expired') {
      setError('Sua sessão expirou. Por favor, faça login novamente.');
    } else if (errorParam === 'auth_required') {
      setError('Você precisa estar autenticado para acessar esta página.');
    } else if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }

    // Mensagem informativa
    if (messageParam) {
      setInfo(decodeURIComponent(messageParam));
    }

    // Mensagem de sucesso
    if (successParam === 'true' && messageParam) {
      setSuccess(decodeURIComponent(messageParam));
    }
  }, [location]);

  // Login handler simplificado: usar apenas Supabase
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('Autenticando...');
    setSuccess('');
    setShowConfirmation(false);
    setLoading(true);
    
    try {
      // ✅ UNIFICADO: Usar apenas Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Erro no login:', error);
        
        // Tratar erros específicos
        if (error.message.includes('Email not confirmed')) {
          setShowConfirmation(true);
          setInfo('');
          setLoading(false);
          return;
        }
        
        if (error.message.includes('Invalid login credentials')) {
          setError('Email ou senha inválidos. Verifique e tente novamente.');
        } else {
          setError(error.message || 'Falha ao realizar login');
        }
        
        setInfo('');
        setLoading(false);
        return;
      }

      // ✅ LOGIN BEM-SUCEDIDO: Usar TokenManager unificado
      if (data.session) {
        console.log('✅ Login com Supabase bem-sucedido!');
        
        // Armazenar token de forma consistente via TokenManager
        tokenManager.setToken(data.session.access_token);
        
        setSuccess('Login bem-sucedido! Redirecionando...');
        setInfo('');
        
        // Redirecionar após delay
        const timeoutId = setTimeout(() => {
          clearTimeout(timeoutId);
          navigate(getRedirect());
        }, 1200);
        
      } else {
        throw new Error('Sessão não retornada pelo Supabase');
      }
      
    } catch (error) {
      console.error('Erro inesperado no login:', error);
      setError('Erro de conexão. Tente novamente.');
      setInfo('');
    } finally {
      setLoading(false);
    }
  };

  // Reenviar confirmação (mantém o fetch customizado)
  const handleResend = async (e) => {
    e.preventDefault();
    setInfo('Reenviando email de confirmação...');
    setError('');
    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email })
      });
      if (response.ok) {
        setInfo('Email de confirmação reenviado!');
      } else {
        setError('Falha ao reenviar email.');
      }
    } catch {
      setError('Erro de conexão.');
    }
  };

  return (
    <>
      <LandingNavbar />
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 animate-gradient-move overflow-hidden pt-20">
        <NeuralNetworkBackground />
      <div className="relative z-10 w-full max-w-md mx-auto p-8 rounded-2xl card-futuristic shadow-2xl backdrop-blur-lg border border-cyan-400/30">
        <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-6 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500 text-transparent bg-clip-text drop-shadow-neon leading-tight">Entrar</h1>
        {error && <div className="text-red-400 text-center text-sm animate-pulse mb-2">{error}</div>}
        {info && <div className="text-cyan-300 text-center text-sm animate-pulse mb-2">{info}</div>}
        {success && <div className="text-green-400 text-center text-sm animate-pulse mb-2">{success}</div>}
        {showConfirmation && (
          <div className="bg-yellow-100/10 border border-yellow-400/30 text-yellow-300 rounded-lg p-3 mb-3 text-center">
            <p>Você ainda não confirmou seu email. Por favor, verifique sua caixa de entrada.</p>
            <form onSubmit={handleResend} className="mt-2 flex flex-col items-center gap-2">
              <button type="submit" className="px-4 py-2 rounded bg-yellow-400/80 text-yellow-900 font-bold hover:bg-yellow-300 transition">Reenviar email de confirmação</button>
            </form>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-cyan-200 mb-1">Email</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-cyan-400"><i className="fas fa-envelope" /></span>
              <input
                type="email"
                placeholder="E-mail"
                className="pl-10 pr-3 py-3 rounded-lg bg-white/10 text-white placeholder-cyan-200 border border-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition w-full"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-cyan-200 mb-1">Senha</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-cyan-400"><i className="fas fa-lock" /></span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha"
                className="pl-10 pr-10 py-3 rounded-lg bg-white/10 text-white placeholder-cyan-200 border border-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition w-full"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button type="button" className="absolute right-2 text-cyan-300 hover:text-cyan-100" tabIndex={-1} onClick={() => setShowPassword(v => !v)}>
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center mb-2">
            <label className="flex items-center gap-2 text-cyan-200">
              <input type="checkbox" className="accent-cyan-400" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
              Lembrar-me
            </label>
            <Link to="/reset-password" className="text-cyan-300 hover:underline text-sm">Esqueceu a senha?</Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 px-8 py-3 rounded-lg bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 text-white font-bold shadow-lg hover:from-cyan-800 hover:via-cyan-600 hover:to-blue-700 transition border border-cyan-400/30 drop-shadow-neon disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : <><i className="fas fa-sign-in-alt mr-2" />Entrar</>}
          </button>
        </form>

        <div className="mt-6 text-center text-cyan-200">
          Não tem conta?{' '}
          <Link to="/signup" className="font-bold text-cyan-300 hover:underline">Criar Conta</Link>
        </div>
      </div>
      </div>
    </>
  );
}