import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar.jsx';
import NeuralNetworkBackground from '../NeuralNetworkBackground.jsx';
import supabase from '../lib/supabaseClient';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    special: false
  });
  const navigate = useNavigate();

  // ✅ FUNÇÃO: Calcular força da senha em tempo real
  const calculatePasswordStrength = (password) => {
    setPasswordStrength({
      length: password.length >= 8 && password.length <= 128,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password)
    });
  };

  // ✅ FUNÇÃO: Validar senha forte
  const validatePassword = (password) => {
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres');
      return false;
    }
    
    if (password.length > 128) {
      setError('A senha deve ter no máximo 128 caracteres');
      return false;
    }
    
    if (!/[a-z]/.test(password)) {
      setError('A senha deve conter pelo menos 1 letra minúscula');
      return false;
    }
    
    if (!/[A-Z]/.test(password)) {
      setError('A senha deve conter pelo menos 1 letra maiúscula');
      return false;
    }
    
    if (!/\d/.test(password)) {
      setError('A senha deve conter pelo menos 1 número');
      return false;
    }
    
    if (!/[@$!%*?&]/.test(password)) {
      setError('A senha deve conter pelo menos 1 caractere especial (@$!%*?&)');
      return false;
    }
    
    return true;
  };

  // Função para formatar o telefone enquanto o usuário digita
  const formatPhone = (value) => {
    // Remove tudo que não seja número
    const numbersOnly = value.replace(/\D/g, '');

    // Aplica a máscara de telefone brasileiro
    if (numbersOnly.length <= 2) {
      return numbersOnly;
    } else if (numbersOnly.length <= 6) {
      return `(${numbersOnly.slice(0, 2)}) ${numbersOnly.slice(2)}`;
    } else if (numbersOnly.length <= 10) {
      return `(${numbersOnly.slice(0, 2)}) ${numbersOnly.slice(2, 6)}-${numbersOnly.slice(6)}`;
    } else {
      return `(${numbersOnly.slice(0, 2)}) ${numbersOnly.slice(2, 7)}-${numbersOnly.slice(7, 11)}`;
    }
  };

  // Handler para o campo de telefone
  const handlePhoneChange = (e) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!agree) {
      setError('Você precisa aceitar os Termos de Serviço e a Política de Privacidade.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    
    // ✅ VALIDAÇÃO DE SENHA FORTE
    if (!validatePassword(password)) {
      return;
    }

    // Validar formato do telefone (deve ter pelo menos 14 caracteres incluindo formatação)
    if (phone && phone.replace(/\D/g, '').length < 10) {
      setError('Número de telefone inválido. Use o formato (XX) XXXXX-XXXX');
      return;
    }

    setLoading(true);
    try {
      // ✅ ARMAZENAR: Dados do usuário no localStorage para uso no login automático
      try {
        const userDataForStorage = {
          firstName: name.split(' ')[0] || name,
          lastName: name.split(' ').slice(1).join(' ') || '',
          email: email,
          fullName: name,
          phone: phone,
          password: password, // ✅ ARMAZENAR: Senha para auto-login
          signupTimestamp: new Date().toISOString()
        };
        
        localStorage.setItem('signup_user_data', JSON.stringify(userDataForStorage));
        console.log('✅ Signup: Dados do usuário armazenados para login automático:', userDataForStorage);
        
        // ✅ LIMPAR: Dados sensíveis após armazenar (incluindo senha)
        setTimeout(() => {
          localStorage.removeItem('signup_user_data');
          console.log('🔒 Signup: Dados sensíveis removidos do localStorage');
        }, 300000); // 5 minutos
        
      } catch (error) {
        console.error('❌ Signup: Erro ao armazenar dados do usuário:', error);
      }
      
      // Chamar API do backend para registro incluindo o telefone
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, phone, password })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || 'Falha ao registrar a conta');

      // Verificar se o autologin foi realizado
      if (data.autoLogin && data.session) {
        // Login automático realizado no servidor, atualizar o estado de sessão do supabase
        // para garantir que o frontend está ciente da sessão
        try {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: data.session.accessToken,
            refresh_token: data.session.refreshToken
          });

          if (!setSessionError) {
            // Sessão definida com sucesso, redirecionar para o dashboard
            console.log('Login automático realizado com sucesso');
            navigate('/dashboard');
            return;
          }
        } catch (sessionErr) {
          console.error('Erro ao definir sessão no frontend:', sessionErr);
        }
      }

      // Se não houver autologin ou se falhar, redirecionar para login
      navigate(`/login?message=${encodeURIComponent(data.message)}&success=true`);
    } catch (err) {
      setError(err.message || 'Erro de conexão. Tente novamente.');
    }
    setLoading(false);
  };

  return (
    <>
      <LandingNavbar />
      <div className="relative h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 animate-gradient-move overflow-hidden pt-20 pb-4">
        <NeuralNetworkBackground />
        <div className="relative z-10 w-full max-w-md mx-auto p-3 px-4 py-3 rounded-2xl card-futuristic shadow-2xl backdrop-blur-lg border border-cyan-400/30">
        <h1 className="text-xl md:text-2xl font-extrabold text-center mb-2 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500 text-transparent bg-clip-text drop-shadow-neon leading-tight">Criar Conta</h1>
        {error && <div className="text-red-400 text-center text-xs animate-pulse mb-1">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-1">
          <div>
            <label className="block text-cyan-200 mb-0.5 text-sm">Nome completo</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-cyan-400"><i className="fas fa-user" /></span>
              <input
                type="text"
                placeholder="Nome completo"
                className="pl-10 pr-3 py-1.5 text-sm rounded-lg bg-white/10 text-white placeholder-cyan-200 border border-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition w-full"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-cyan-200 mb-0.5 text-sm">Email</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-cyan-400"><i className="fas fa-envelope" /></span>
              <input
                type="email"
                placeholder="E-mail"
                className="pl-10 pr-3 py-1.5 text-sm rounded-lg bg-white/10 text-white placeholder-cyan-200 border border-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition w-full"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-cyan-200 mb-0.5 text-sm">Telefone</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-cyan-400"><i className="fas fa-phone" /></span>
              <input
                type="tel"
                placeholder="(XX) XXXXX-XXXX"
                className="pl-10 pr-3 py-1.5 text-sm rounded-lg bg-white/10 text-white placeholder-cyan-200 border border-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition w-full"
                value={phone}
                onChange={handlePhoneChange}
              />
            </div>
          </div>
          <div>
            <label className="block text-cyan-200 mb-0.5 text-sm">Senha</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-cyan-400"><i className="fas fa-lock" /></span>
              <input
                type="password"
                placeholder="Mínimo 8 caracteres com requisitos especiais"
                className="pl-10 pr-3 py-1.5 text-sm rounded-lg bg-white/10 text-white placeholder-cyan-200 border border-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition w-full"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  calculatePasswordStrength(e.target.value);
                }}
                minLength={8}
                required
              />
            </div>
            
            {/* ✅ INDICADOR DE FORÇA DA SENHA */}
            {password && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-cyan-200">Requisitos da senha:</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className={`flex items-center gap-1 ${passwordStrength.length ? 'text-green-400' : 'text-red-400'}`}>
                    {passwordStrength.length ? '✓' : '✗'} 8-128 caracteres
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.lowercase ? 'text-green-400' : 'text-red-400'}`}>
                    {passwordStrength.lowercase ? '✓' : '✗'} 1 minúscula
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.uppercase ? 'text-green-400' : 'text-red-400'}`}>
                    {passwordStrength.uppercase ? '✓' : '✗'} 1 maiúscula
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.number ? 'text-green-400' : 'text-red-400'}`}>
                    {passwordStrength.number ? '✓' : '✗'} 1 número
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.special ? 'text-green-400' : 'text-red-400'}`}>
                    {passwordStrength.special ? '✓' : '✗'} 1 especial (@$!%*?&)
                  </div>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-cyan-200 mb-0.5 text-sm">Confirmar senha</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-cyan-400"><i className="fas fa-lock" /></span>
              <input
                type="password"
                placeholder="Confirme sua senha forte"
                className="pl-10 pr-3 py-1.5 text-sm rounded-lg bg-white/10 text-white placeholder-cyan-200 border border-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition w-full"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <label className="flex items-start gap-2 text-cyan-200 text-xs">
            <input type="checkbox" className="accent-cyan-400 mt-0.5 flex-shrink-0" checked={agree} onChange={e => setAgree(e.target.checked)} required />
            <span>
              Concordo com os <a href="/terms" target="_blank" className="text-cyan-300 hover:underline">Termos</a> e <a href="/privacy" target="_blank" className="text-cyan-300 hover:underline">Política</a>
            </span>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 px-6 py-2 text-sm rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold shadow-lg hover:from-emerald-400 hover:to-cyan-400 transition border border-emerald-300/30 drop-shadow-neon disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Criando conta...' : <><i className="fas fa-user-plus mr-2" />Criar Conta</>}
          </button>
        </form>
        <div className="mt-3 text-center text-cyan-200 text-sm">
          Já tem uma conta?{' '}
          <Link to="/login" className="font-bold text-cyan-300 hover:underline">Fazer login</Link>
        </div>
      </div>
      </div>
    </>
  );
}