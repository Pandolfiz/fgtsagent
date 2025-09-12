import React, { useEffect, useState } from 'react';
import { FaRobot, FaChartLine, FaHandHoldingUsd, FaUsers, FaShieldAlt, FaChartPie, FaCheck, FaWhatsapp, FaEnvelope, FaChartBar, FaCoins } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/HomePerformance.css';

// Animações para destaque do plano premium
const style = <style>{`
@keyframes pulse-fast {
  0%, 100% { box-shadow: 0 0 0 0 #00bcd480, 0 0 0 4px #0097a740; }
  50% { box-shadow: 0 0 32px 8px #00bcd4, 0 0 0 8px #0097a780; }
}
.animate-pulse-fast {
  animation: pulse-fast 1.2s cubic-bezier(0.4,0,0.6,1) infinite;
}
@keyframes pulse-slow {
  0%, 100% { box-shadow: 0 0 0 0 #00bcd440, 0 0 0 4px #0097a720; }
  50% { box-shadow: 0 0 32px 8px #00bcd4, 0 0 0 8px #0097a740; }
}
.animate-pulse-slow {
  animation: pulse-slow 2.2s cubic-bezier(0.4,0,0.6,1) infinite;
}
`}</style>;

// Dados sincronizados com os produtos e preços do Stripe
// Produtos no Stripe (ATUALIZADOS):
// - prod_StLe32rSb1vwni: FGTS Agent - Plano Básico (R$ 100,00/mês)
// - prod_StTGwa0T0ZPLjJ: FGTS Agent - Plano Pro (R$ 299,99/mês)
// - prod_StTJjcT9YTpvCz: FGTS Agent - Plano Premium (R$ 499,99/mês)

const features = [
  { icon: <FaRobot size={40} />, title: 'Vendas 24/7', text: 'Nosso agente atende leads a qualquer hora, sem falhas.' },
  { icon: <FaChartLine size={40} />, title: 'Conversão Inteligente', text: 'IA avançada que identifica leads qualificados automaticamente.' },
  { icon: <FaHandHoldingUsd size={40} />, title: 'ROI Garantido', text: 'Aumente suas vendas com Inteligência Artificial.' },
  { icon: <FaUsers size={40} />, title: 'Escalabilidade Total', text: 'De 10 a 10.000 leads, nossa plataforma cresce com você.' },
  { icon: <FaShieldAlt size={40} />, title: 'Segurança Máxima', text: 'Dados protegidos com criptografia de nível bancário.' },
  { icon: <FaChartPie size={40} />, title: 'Analytics Avançado', text: 'Relatórios detalhados para otimizar suas campanhas de marketing.' }
];

// Dados dos planos baseados no Stripe (PREÇOS ATUALIZADOS COM OPÇÕES ANUAIS)
const plans = [
  // PLANO BÁSICO COMENTADO PARA USO FUTURO
  // {
  //   name: 'Plano Básico',
  //   price: 'R$ 100,00',
  //   period: '/mês',
  //   annualPrice: 'R$ 90,00',
  //   annualPeriod: '/mês',
  //   annualBilling: 'Anual cobrado mensalmente',
  //   annualSavings: 'Economia de R$ 120,00/ano',
  //   description: 'Indicado para operações pequenas com até 100 leads por mês',
  //   stripeProductId: 'prod_StLe32rSb1vwni',
  //   stripePriceId: 'price_1RxYwzH8jGtRbIKFzM62Xmkj',
  //   annualPriceId: 'price_1RxYwzH8jGtRbIKFOZFuYVGV',
  //   features: [
  //     'Agente de IA por mensagens',
  //     'Consultas ilimitadas de saldo FGTS',
  //     'Dashboard básico',
  //     'Integração WhatsApp Business',
  //     'Relatórios simples',
  //     'Suporte por email',
  //     'Atendimento 24/7',
  //     'Simulador básico de propostas'
  //   ],
  //   icon: <FaWhatsapp size={32} />,
  //   popular: false,
  //   buttonText: 'Testar 7 dias Grátis'
  // },
  // {
  //   name: 'Plano Pro',
  //   price: 'R$ 299,99',
  //   period: '/mês',
  //   annualPrice: 'R$ 274,99',
  //   annualPeriod: '/mês',
  //   annualBilling: 'Anual cobrado mensalmente',
  //   annualSavings: 'Economia de R$ 300,00/ano',
  //   description: 'Indicado para escritórios com até 500 leads por mês',
  //   stripeProductId: 'prod_StTGwa0T0ZPLjJ',
  //   stripePriceId: 'price_1RxgK6H8jGtRbIKF79rax6aZ',
  //   annualPriceId: 'price_1RxgLiH8jGtRbIKFSdpy1d3E',
  //   features: [
  //     'Agente de IA que ouve/envia audios',
  //     'Consultas ilimitadas de saldo FGTS',
  //     'Notificações em tempo real',
  //     'WhatsApp + Web',
  //     'Dashboard e Relatórios avançados',
  //     'Simulador de propostas',
  //     'Suporte prioritário',
  //     'API oficial whatsapp para anúncios',
  //     'Criação de propostas limitadas'    ],
  //   icon: <FaChartBar size={32} />,
  //   popular: true,
  //   buttonText: 'Escolher Pro'
  // },
  {
    name: 'Plano Premium',
    price: 'R$ 400,00',
    period: '/mês',
    annualPrice: 'R$ 360,00',
    annualPeriod: '/mês',
    annualBilling: 'Anual cobrado mensalmente',
    annualSavings: 'Economia de R$ 730,00/ano',
    description: 'Cobrança baseada em uso - ideal para todos os volumes fluxo de leads',
    // Informações adicionais para cobrança variável
    variablePricing: {
      includedTokens: '8.000.000 tokens inclusos',
      additionalCost: 'R$ 100,00 para cada 8 milhões adicionais',
      billingNote: 'Cobrança automática baseada no uso real'
    },
    stripeProductId: 'prod_T2SfTzFRqv8X2m',
    stripePriceId: 'price_1S6NkGH8jGtRbIKFsPlv2Sf8',
    annualPriceId: 'price_1S6NtsH8jGtRbIKFSbzxuKQk',
    features: [
      'Agente de IA para vendas de saque aniversário FGTS',
      '8.000.000 tokens grátis/mês',
      'Menos de R$1 por lead atendido',
      'API oficial Whatsapp para anúncios sem banimento',
      'API alternativas de Whatsapp para envio de mensagens',
      'Consulta de saldo, simulação de propostas e criação de propostas Ilimitadas',
      'Contas ilimitadas de WhatsApp + Web',
      'Disparo de mensagens em massa',
      'Dashboard avançados',
      'Tracking de leads por anúncio',
      'Integração V8 digital',
      'Muito mais barato que uma equipe de atendimento'
    ],
    icon: <FaCoins size={32} />,
    popular: true,
    premium: true,
    tokenBased: true,
    buttonText: 'Testar 7 diasgrátis com descontos'
  }
];

export default function Home({ isLoggedIn }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState('yearly'); // Padrão para maximizar conversão

  // Fecha o menu ao clicar fora
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e) {
    if (!document.getElementById('mobile-menu')?.contains(e.target) && !document.getElementById('menu-btn')?.contains(e.target)) {
      setMenuOpen(false);
    }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Navbar futurista */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 animate-gradient-move backdrop-blur-sm shadow-lg border-b border-cyan-400/30">
        <div className="container mx-auto flex items-center justify-between py-3 px-6">
          <div className="flex items-center gap-3">
            <FaRobot className="text-cyan-300 animate-pulse" size={32} />
            <span className="text-2xl font-extrabold title-gradient tracking-widest drop-shadow-neon">FgtsAgent</span>
          </div>
          {/* Menu desktop */}
          <div className="hidden md:flex gap-6 items-center">
            <a href="#features" className="text-readable hover:text-readable-cyan transition font-semibold">Funcionalidades</a>
            <a href="#planos" className="text-readable hover:text-readable-cyan transition font-semibold">Planos</a>
            <a href="#clientes" className="text-readable hover:text-readable-cyan transition font-semibold">Clientes</a>
            <a href="#parceiro" className="text-readable hover:text-readable-cyan transition font-semibold">Parceiro</a>
            {!isLoggedIn ? (
              <Link to="/login" className="ml-4 px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold shadow-lg hover:from-emerald-400 hover:to-cyan-400 transition border-2 border-emerald-300/40">Entrar</Link>
            ) : (
              <Link to="/dashboard" className="ml-4 px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold shadow-lg hover:from-emerald-400 hover:to-cyan-400 transition border-2 border-emerald-300/40">Dashboard</Link>
            )}
          </div>
          {/* Menu mobile */}
          <div className="md:hidden flex items-center">
            <button id="menu-btn" onClick={() => setMenuOpen(!menuOpen)} className="text-cyan-200 focus:outline-none">
              <motion.svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                animate={{ rotate: menuOpen ? 90 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                <motion.path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={!menuOpen ? "M4 6h16M4 12h16M4 18h16" : "M6 18L18 6M6 6l12 12"}
                  initial={false}
                  animate={{ pathLength: menuOpen ? 1 : 1 }}
                />
              </motion.svg>
            </button>
          </div>
        </div>
        {/* Dropdown mobile sofisticado */}
        <AnimatePresence>
          {menuOpen && (
            <>
              {/* Overlay escurecido, começa abaixo do navbar (top-16 para ~64px de navbar) */}
              <motion.div
                key="overlay"
                className="fixed left-0 right-0 top-16 bottom-0 bg-black/60 backdrop-blur-sm z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => setMenuOpen(false)}
              />
              {/* Menu lateral, começa abaixo do navbar */}
              <motion.div
                key="menu"
                id="mobile-menu"
                className="fixed top-16 right-0 h-[calc(100vh-64px)] w-4/5 max-w-xs bg-gradient-to-br from-blue-950/95 via-cyan-950/95 to-blue-900/95 backdrop-blur-sm z-50 shadow-2xl flex flex-col pt-8 px-8 gap-6 border-l-4 border-cyan-400/50 shadow-cyan-400/20"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                {/* Logo no topo do menu */}
                <motion.div
                  className="flex items-center gap-3 mb-6 pb-6 border-b border-cyan-400/20"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <FaRobot className="text-cyan-300 animate-pulse" size={24} />
                  <span className="text-xl font-extrabold title-gradient tracking-wider">FgtsAgent</span>
                </motion.div>

                {/* Links de navegação com ícones */}
                <motion.a
                  href="#features"
                  className="flex items-center gap-3 text-readable hover:text-readable-cyan transition font-semibold py-3 px-4 rounded-lg hover:bg-cyan-900/30 group"
                  onClick={() => setMenuOpen(false)}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <FaRobot className="text-cyan-400 group-hover:text-cyan-300 transition-colors" size={18} />
                  Funcionalidades
                </motion.a>

                <motion.a
                  href="#planos"
                  className="flex items-center gap-3 text-readable hover:text-readable-cyan transition font-semibold py-3 px-4 rounded-lg hover:bg-cyan-900/30 group"
                  onClick={() => setMenuOpen(false)}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <FaChartBar className="text-cyan-400 group-hover:text-cyan-300 transition-colors" size={18} />
                  Planos
                </motion.a>

                <motion.a
                  href="#clientes"
                  className="flex items-center gap-3 text-readable hover:text-readable-cyan transition font-semibold py-3 px-4 rounded-lg hover:bg-cyan-900/30 group"
                  onClick={() => setMenuOpen(false)}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <FaUsers className="text-cyan-400 group-hover:text-cyan-300 transition-colors" size={18} />
                  Clientes
                </motion.a>

                <motion.a
                  href="#parceiro"
                  className="flex items-center gap-3 text-readable hover:text-readable-cyan transition font-semibold py-3 px-4 rounded-lg hover:bg-cyan-900/30 group"
                  onClick={() => setMenuOpen(false)}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <FaHandHoldingUsd className="text-cyan-400 group-hover:text-cyan-300 transition-colors" size={18} />
                  Parceiro
                </motion.a>

                {/* Botão de ação */}
                {!isLoggedIn ? (
                  <motion.div
                    className="mt-auto pt-6 border-t border-cyan-400/20"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Link
                      to="/login"
                      className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold shadow-lg hover:from-emerald-400 hover:to-cyan-400 transition border-2 border-emerald-300/50 drop-shadow-neon block text-center"
                      onClick={() => setMenuOpen(false)}
                    >
                      Entrar
                    </Link>
                  </motion.div>
                ) : (
                  <motion.div
                    className="mt-auto pt-6 border-t border-cyan-400/20"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Link
                      to="/dashboard"
                      className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold shadow-lg hover:from-emerald-400 hover:to-cyan-400 transition border-2 border-emerald-300/50 drop-shadow-neon block text-center"
                      onClick={() => setMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                  </motion.div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>
      <div className="pt-24"> {/* Espaço para a navbar fixa */}
      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center py-32">
        <motion.h1
          className="text-6xl md:text-7xl font-extrabold mb-6 title-gradient drop-shadow-neon leading-tight pb-4"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          FgtsAgent
        </motion.h1>
        <motion.p
          className="text-2xl md:text-3xl text-readable-bright mb-10 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Agente Inteligente para Antecipação de Saque-Aniversário FGTS
        </motion.p>
        <motion.div
          className="flex flex-col md:flex-row gap-4 justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {!isLoggedIn ? (
            <>
              <Link to="/signup" className="px-8 py-3 rounded-lg bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 text-white font-bold shadow-lg hover:from-cyan-800 hover:via-cyan-600 hover:to-blue-700 transition border border-cyan-400/30 drop-shadow-neon">Criar Conta</Link>
              <Link to="/login" className="px-8 py-3 rounded-lg border border-cyan-400 text-cyan-200 font-bold hover:bg-cyan-900 transition">Login</Link>
            </>
          ) : (
            <Link to="/dashboard" className="px-8 py-3 rounded-lg bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 text-white font-bold shadow-lg hover:from-cyan-800 hover:via-cyan-600 hover:to-blue-700 transition border border-cyan-400/30 drop-shadow-neon">Ir para Dashboard</Link>
          )}
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-20">
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-center mb-12 title-gradient drop-shadow-neon leading-tight pb-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Por que escolher o FgtsAgent?
        </motion.h2>
        <motion.div
          className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1 } }
          }}
        >
          {features.map((f, i) => (
            <motion.div
              key={i}
              className="bg-white/10 rounded-2xl p-8 text-center shadow-lg transition border border-cyan-400/40 w-full h-full feature-card-optimized"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <div className="mb-4 text-cyan-300 flex justify-center feature-icon-optimized">{f.icon}</div>
              <h5 className="font-bold text-lg text-readable-bright mb-2">{f.title}</h5>
              <p className="text-readable">{f.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Planos de Assinatura */}
      <section id="planos" className="relative z-10 py-20">
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-center mb-6 title-gradient drop-shadow-neon leading-tight pb-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Plano Premium - Cobrança por Tokens
        </motion.h2>
        <motion.p
          className="text-center text-readable text-lg mb-12 max-w-2xl mx-auto px-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
        </motion.p>

        {/* Seletor de Intervalo de Pagamento */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >

          <div className="flex justify-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2 border border-cyan-400/30 shadow-xl">
              <div className="flex gap-2">
                {/* Opção Mensal */}
                <button
                  onClick={() => setSelectedInterval('monthly')}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    selectedInterval === 'monthly'
                      ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 transform scale-105'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold">Mensal</span>
                  </div>
                </button>
                
                {/* Opção Anual (Destacada) */}
                <button
                              onClick={() => setSelectedInterval('yearly')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 relative ${
              selectedInterval === 'yearly'
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25 transform scale-105'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold">Anual</span>
                    <span className="text-xs opacity-80">2 meses grátis</span>
                    
                    {/* Badge de economia */}
                            {selectedInterval === 'yearly' && (
          <div className="absolute -top-2 -right-2 bg-emerald-400 text-black text-xs px-2 py-1 rounded-full font-bold animate-pulse">
            💰
          </div>
        )}
                  </div>
                </button>
              </div>
            </div>
          </div>
          
          {/* Dica de economia */}
          {selectedInterval === 'yearly' && (
            <motion.div
              className="mt-4 max-w-md mx-auto"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-emerald-300 text-sm font-medium">
                ✨ Economia de R$ 730,00/ano!
              </p>
            </motion.div>
          )}
          {selectedInterval === 'monthly' && (
            <motion.div
              className="mt-4 max-w-md mx-auto"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
            </motion.div>
          )}
        </motion.div>

        <motion.div
          className="container mx-auto flex justify-center px-4 max-w-2xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.2 } }
          }}
        >
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              className={`bg-white/10 rounded-2xl p-8 text-center shadow-lg transition backdrop-blur-sm border relative flex flex-col h-full plan-card-optimized w-full max-w-md mx-auto
                ${plan.popular ? 'border-emerald-400/60 bg-emerald-900/10' : ''}
                ${plan.premium ? 'border-blue-500/80 bg-blue-900/20 ring-2 ring-blue-400/40 z-20' : 'border-cyan-400/40'}
              `}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              style={plan.premium ? { boxShadow: '0 0 16px 4px #00bcd4' } : {}}
            >
                {/* Tag CONVERSÃO MÁXIMA - sempre no topo central */}
                {plan.premium && (
                  <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-30">
                    <span className="bg-blue-500 text-white px-7 py-2 rounded-full text-base font-extrabold shadow-lg border-2 border-white/20 whitespace-nowrap plan-tag-optimized">
                      CONVERSÃO MÁXIMA
                    </span>
                  </div>
                )}
                
                {/* Tag MAIS POPULAR - apenas no plano anual, canto superior direito diagonal */}
                {plan.popular && selectedInterval === 'yearly' && (
                  <div className="absolute -top-3 -right-10 z-30">
                    <span 
                      className="bg-emerald-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg plan-tag-optimized whitespace-nowrap"
                      style={{ transform: 'rotate(30deg)' }}
                    >
                      Ganhe 2 meses grátis
                    </span>
                  </div>
                )}

              <div className="mb-6">
                <div className={`mb-4 flex justify-center ${plan.popular ? 'text-emerald-300' : plan.premium ? 'text-blue-300' : 'text-cyan-300'}`}>
                  {plan.icon}
                </div>
                <h3 className="text-2xl font-bold title-gradient mb-2">{plan.name}</h3>
                <p className="text-readable text-sm mb-4">{plan.description}</p>

                {/* Preços com contraste mensal vs anual */}
                <div className="mb-6">
                  {selectedInterval === 'monthly' ? (
                    /* Preço mensal em destaque */
                    <div className="mb-4">
                      <div className="mb-2">
                        <span className={`text-4xl font-extrabold ${plan.popular ? 'text-emerald-300' : plan.premium ? 'text-blue-300' : 'text-cyan-300'}`}>
                          {plan.price}
                        </span>
                        <span className="text-white/60 text-lg ml-1">{plan.period}</span>
                      </div>
                      
                      {/* Informações de cobrança variável para mensal */}
                      {plan.variablePricing && (
                        <div className="bg-white/5 rounded-lg p-3 border border-cyan-400/20">
                          <div className="text-center">
                            <p className="text-cyan-300 text-sm font-semibold mb-1">
                              {plan.variablePricing.includedTokens}
                            </p>
                            <p className="text-white/80 text-xs">
                              {plan.variablePricing.additionalCost}
                            </p>
                            <p className="text-cyan-400 text-xs mt-1">
                              {plan.variablePricing.billingNote}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Preço anual em destaque (padrão) */
                    <>
                      {/* Preço mensal riscado */}
                      <div className="mb-2">
                        <span className="text-lg text-white/50 line-through">
                          {plan.price}
                        </span>
                        <span className="text-white/40 text-sm ml-1">/mês</span>
                      </div>
                      
                      {/* Preço anual em destaque */}
                      <div className="mb-4">
                        <span className={`text-4xl font-extrabold ${plan.popular ? 'text-emerald-300' : plan.premium ? 'text-blue-300' : 'text-cyan-300'}`}>
                          {plan.annualPrice}
                        </span>
                        <span className="text-white/60 text-lg ml-1">{plan.annualPeriod}</span>
                      </div>
                      
                      {/* Informações de cobrança variável para anual */}
                      {plan.variablePricing && (
                        <div className="bg-white/5 rounded-lg p-3 border border-emerald-400/20 mb-3">
                          <div className="text-center">
                            <p className="text-emerald-300 text-sm font-semibold mb-1">
                              {plan.variablePricing.includedTokens} + 20M bônus
                            </p>
                            <p className="text-white/80 text-xs">
                              {plan.variablePricing.additionalCost}
                            </p>
                            <p className="text-emerald-400 text-xs mt-1">
                              {plan.variablePricing.billingNote}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Informações do plano anual */}
                      <div className="text-center">
                        <p className="text-white/70 text-xs mb-1">{plan.annualBilling}</p>
                        <p className="text-emerald-400 text-sm font-semibold">{plan.annualSavings}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-grow mb-8 text-left">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center mb-3">
                    <FaCheck className={`mr-3 ${plan.popular ? 'text-emerald-400' : plan.premium ? 'text-blue-400' : 'text-cyan-400'} flex-shrink-0`} size={16} />
                    <span className="text-readable text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                <Link
                  to={`/signup?plan=${selectedInterval === 'yearly' ? plan.annualPriceId : plan.stripePriceId}&interval=${selectedInterval}`}
                  className={`w-full py-3 px-6 rounded-lg font-bold shadow-lg transition border-2 plan-button-optimized ${
                    plan.popular
                      ? 'bg-emerald-500 text-white border-emerald-400/50 hover:bg-emerald-400'
                      : plan.premium
                      ? 'bg-blue-600 text-white border-cyan-300/80 hover:bg-blue-500'
                      : 'bg-transparent text-cyan-300 border-cyan-400/50 hover:bg-cyan-900/50'
                  } block text-center`}
                  data-price-id={selectedInterval === 'yearly' ? plan.annualPriceId : plan.stripePriceId}
                  data-product-id={plan.stripeProductId}
                  data-interval={selectedInterval}
                >
                  {selectedInterval === 'yearly' ? plan.buttonText : 'Testar 7 dias grátis'}
                </Link>
                
                {/* Indicador de economia ou informação */}
                <div className="mt-2 text-center">
                  {selectedInterval === 'yearly' ? (
                    <span className="text-emerald-400 text-xs font-medium">
                      💰 {plan.annualSavings}
                    </span>
                  )
                : null}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.5 }}
        >
          <p className="text-readable mb-4">
            Todos os planos incluem 7 dias de teste grátis
          </p>
          
          {/* Destaque para economia anual */}
          <div className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-400/30 rounded-lg p-4 mb-4 max-w-2xl mx-auto">
            <h3 className="text-emerald-300 font-semibold mb-2">
              {selectedInterval === 'yearly' ? '💡 Dica de Economia' : '💡 Flexibilidade Total'}
            </h3>
            <p className="text-readable text-sm mb-2">
              {selectedInterval === 'yearly' ? (
                <>
                  Escolha o plano anual e economize{' '}
                  <span className="text-emerald-400 font-bold">R$ 40,00/mês</span> + ganhe{' '}
                  <span className="text-emerald-400 font-bold">20 milhões de tokens bônus</span>!
                </>
              ) : (
                <>
                  Comece com o plano mensal e{' '}
                  <span className="text-cyan-400 font-bold">pague apenas pelo que usar</span>!
                </>
              )}
            </p>
            <p className="text-cyan-200 text-xs">
              {selectedInterval === 'yearly'
                ? 'Taxa fixa: R$ 360,00/mês + 8M tokens inclusos + 20M bônus + R$ 100,00 para cada 8M adicionais'
                : 'Taxa fixa: R$ 400,00/mês + 8M tokens inclusos + R$ 100,00 para cada 8M adicionais'
              }
            </p>
          </div>
          
          <p className="text-readable-cyan text-sm">
            Precisa de algo personalizado? <span className="underline cursor-pointer hover:text-cyan-200">Entre em contato</span>
          </p>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 text-white text-center shadow-inner">
        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-8 title-gradient drop-shadow-neon leading-tight pb-4"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Pronto para revolucionar seu atendimento FGTS?
        </motion.h2>

        {/* Frames de Conversas de Exemplo */}
        <motion.div
          className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 px-4 mb-12 max-w-6xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          {/* Frame 1 - Conversa de Consulta de Saldo */}
          <motion.div
            className="p-6 conversation-frame-whatsapp whatsapp-background"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
              <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center conversation-avatar">
                <FaRobot className="text-white text-lg" />
              </div>
              <div className="flex-1">
                <span className="text-cyan-300 font-semibold text-lg">FgtsAgent</span>
                <div className="text-white/60 text-sm">online</div>
              </div>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              <div className="bg-gray-700/80 rounded-lg p-3 ml-2 mr-8 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Olá! Quero sacar minha antecipação de saque-aniversário FGTS</p>
                  <span className="text-gray-400 text-xs ml-2">12:55</span>
                </div>
              </div>
              <div className="bg-teal-600/90 rounded-lg p-3 ml-8 mr-2 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Olá, como vai? prazer em te conhecer, como você se chama? para consultar seu saldo preciso do seu CPF, pode me informar?</p>
                  <span className="text-teal-200 text-xs ml-2">12:56 ✓✓</span>
                </div>
              </div>
              <div className="bg-gray-700/80 rounded-lg p-3 ml-2 mr-8 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Luiz,123.456.789-00</p>
                  <span className="text-gray-400 text-xs ml-2">12:58</span>
                </div>
              </div>
              <div className="bg-teal-600/90 rounded-lg p-3 ml-8 mr-2 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Luiz, ótima notícia! Você tem R$ 15.847,32 disponível para saque-aniversário, gostaria de prosseguir com a proposta?</p>
                  <span className="text-teal-200 text-xs ml-2">13:00 ✓✓</span>
                </div>
              </div>
              <div className="bg-gray-700/80 rounded-lg p-3 ml-2 mr-8 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">sim</p>
                  <span className="text-gray-400 text-xs ml-2">13:10</span>
                </div>
              </div>
              <div className="bg-teal-600/90 rounded-lg p-3 ml-8 mr-2 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Perfeito! Para criar a proposta, preciso de mais algumas informações:<br/>1️⃣ Nome Completo<br/>2️⃣ RG ou CNH<br/>3️⃣ Data de Nascimento<br/>4️⃣ Email<br/>5️⃣Nome da mãe<br/>6️⃣ CEP<br/>7️⃣ Estado civil<br/>8️⃣ Chave PIX</p>
                  <span className="text-teal-200 text-xs ml-2">13:11 ✓✓</span>
                </div>
              </div>
              <div className="bg-gray-700/80 rounded-lg p-3 ml-2 mr-8 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Luiz Cláudio Braga,123.456,1990-01-01,luiz@email.com,Beatriz Braga,solteiro, 12345678, pix é o cpf</p>
                  <span className="text-gray-400 text-xs ml-2">13:20</span>
                </div>
              </div>
              <div className="bg-teal-600/90 rounded-lg p-3 ml-8 mr-2 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Certo, confirma se o dados estão certos:<br/>1️⃣ Nome Completo: Luiz Cláudio Braga<br/>2️⃣ RG ou CNH: 123.456<br/>3️⃣ Data de Nascimento: 1990-01-01<br/>4️⃣ Email: luiz@email.com<br/>5️⃣Nome da mãe: Beatriz Braga<br/>6️⃣ CEP: 12345678<br/>7️⃣ Estado civil: solteiro<br/>8️⃣ Chave PIX: 123.456.789-00</p>
                  <span className="text-teal-200 text-xs ml-2">13:21 ✓✓</span>
                </div>
              </div>
              <div className="bg-gray-700/80 rounded-lg p-3 ml-2 mr-8 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Tudo certo, quanto tempo para o pagamento?</p>
                  <span className="text-gray-400 text-xs ml-2">13:22</span>
                </div>
              </div>
              <div className="bg-teal-600/90 rounded-lg p-3 ml-8 mr-2 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">💰 O dinheiro cai na sua conta automaticamente, assim que você concluir a formalização da proposta.<br/> Link da proposta: [link]<br/>Número do contrato: [número do contrato]<br/> Agora é só clicar no link, enviar a foto do RG ou CNH e uma selfie, assim que a identidade for aprovada, o pagamento é realizado na hora.</p>
                  <span className="text-teal-200 text-xs ml-2">13:23 ✓✓</span>
                </div>
              </div>
              <div className="bg-gray-700/80 rounded-lg p-3 ml-2 mr-8 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Beleza, vou fazer agora 😊</p>
                  <span className="text-gray-400 text-xs ml-2">13:24</span>
                </div>
              </div>
              <div className="bg-teal-600/90 rounded-lg p-3 ml-8 mr-2 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Pagamento realizado com sucesso! Agradecemos pela preferência! Salve nosso contato para novos saques!</p>
                  <span className="text-teal-200 text-xs ml-2">13:27 ✓✓</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Frame 2 - Conversa de Simulação (copiado do Frame 1, incluindo todas as mensagens) */}
          <motion.div
            className="p-6 conversation-frame-whatsapp whatsapp-background"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
              <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center conversation-avatar">
                <FaRobot className="text-white text-lg" />
              </div>
              <div className="flex-1">
                <span className="text-cyan-300 font-semibold text-lg">FgtsAgent</span>
                <div className="text-white/60 text-sm">online</div>
              </div>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              <div className="bg-gray-700/80 rounded-lg p-3 ml-2 mr-8 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Olá! Quero sacar minha antecipação de saque-aniversário FGTS</p>
                  <span className="text-gray-400 text-xs ml-2">13:09</span>
                </div>
              </div>
              <div className="bg-teal-600/90 rounded-lg p-3 ml-8 mr-2 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Olá, tudo bem? prazer em te conhecer, como você se chama?<br/>Para consultar seu saldo preciso do seu CPF, poderia me informar?</p>
                  <span className="text-teal-200 text-xs ml-2">13:10 ✓✓</span>
                </div>
              </div>
              <div className="bg-gray-700/80 rounded-lg p-3 ml-2 mr-8 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Tudo ótimo, me chamo Pedro 123.456.789-00</p>
                  <span className="text-gray-400 text-xs ml-2">13:10</span>
                </div>
              </div>
              <div className="bg-teal-600/90 rounded-lg p-3 ml-8 mr-2 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Pedro, o sistema está indicando que você ainda não autorizou o banco parceiro no app do FGTS <br/> Entre no app do FGTS e autorize o banco [Banco parceiro] para que eu possa fazer a simulação.</p>
                  <span className="text-gray-400 text-xs ml-2">13:11</span>
                </div>
              </div>
              <div className="bg-teal-600/90 rounded-lg p-3 ml-8 mr-2 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm"> Se precisar de ajuda, é só falar que eu te guio</p>
                  <span className="text-gray-400 text-xs ml-2">13:11</span>
                </div>
              </div>
              <div className="bg-gray-700/80 rounded-lg p-3 ml-2 mr-8 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Pronto</p>
                  <span className="text-gray-400 text-xs ml-2">13:15</span>
                </div>
              </div>
              <div className="bg-teal-600/90 rounded-lg p-3 ml-8 mr-2 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Pedro, ótima notícia! Você tem R$ 3.273,56 disponível para saque-aniversário, você pode usar esse valor como quiser! <br/> Gostaria de prosseguir com a proposta?</p>
                  <span className="text-gray-400 text-xs ml-2">13:17</span>
                </div>
              </div>
              <div className="bg-gray-700/80 rounded-lg p-3 ml-2 mr-8 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">quero sacar</p>
                  <span className="text-gray-400 text-xs ml-2">13:18</span>
                </div>
              </div>
              <div className="bg-teal-600/90 rounded-lg p-3 ml-8 mr-2 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Perfeito! Para criar a proposta, preciso de mais algumas informações:<br/>1️⃣ Nome Completo<br/>2️⃣ RG ou CNH<br/>3️⃣ Data de Nascimento<br/>4️⃣ Email<br/>5️⃣Nome da mãe<br/>6️⃣ CEP<br/>7️⃣ Estado civil<br/>8️⃣ Chave PIX</p>
                  <span className="text-teal-200 text-xs ml-2">13:19 ✓✓</span>
                </div>
              </div>
              <div className="bg-gray-700/80 rounded-lg p-3 ml-2 mr-8 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Pedro nascimento,123.456,1999-01-01,luiz@email.com,Jussara nascimento,solteiro, 12345678, pix é o cpf</p>
                  <span className="text-gray-400 text-xs ml-2">13:20</span>
                </div>
              </div>
              <div className="bg-teal-600/90 rounded-lg p-3 ml-8 mr-2 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Certo, confirma se o dados estão certos:<br/>1️⃣ Nome Completo: Pedro nascimento <br/>2️⃣ RG ou CNH: 123.456<br/>3️⃣ Data de Nascimento: 1999-01-01<br/>4️⃣ Email: pedro@email.com<br/>5️⃣Nome da mãe: Jussara nascimento<br/>6️⃣ CEP: 12345678<br/>7️⃣ Estado civil: solteiro<br/>8️⃣ Chave PIX: 123.456.789-00</p>
                  <span className="text-teal-200 text-xs ml-2">13:21 ✓✓</span>
                </div>
              </div>
              <div className="bg-gray-700/80 rounded-lg p-3 ml-2 mr-8 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Tudo certo, quanto tempo para o pagamento?</p>
                  <span className="text-gray-400 text-xs ml-2">13:22</span>
                </div>
              </div>
              <div className="bg-teal-600/90 rounded-lg p-3 ml-8 mr-2 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">💰 O dinheiro cai na sua conta automaticamente, assim que você concluir a formalização da proposta.<br/> Link da proposta: [link]<br/>Número do contrato: [número do contrato]<br/> Agora é só clicar no link, enviar a foto do documento informado e uma selfie, assim que a identidade for aprovada, o pagamento é realizado na hora.</p>
                  <span className="text-teal-200 text-xs ml-2">13:23 ✓✓</span>
                </div>
              </div>
              <div className="bg-gray-700/80 rounded-lg p-3 ml-2 mr-8 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">to sem meu documento</p>
                  <span className="text-gray-400 text-xs ml-2">13:24</span>
                </div>
              </div>
              <div className="bg-teal-600/90 rounded-lg p-3 ml-8 mr-2 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Tudo bem, Pedro, a proposta fica em aberto até o senhor finalizar a formalização. <br/> Se quiser posso te lembrar daqui a pouco para finalizar a formalização.</p>
                  <span className="text-teal-200 text-xs ml-2">13:25 ✓✓</span>
                </div>
              </div>
              <div className="bg-gray-700/80 rounded-lg p-3 ml-2 mr-8 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">fiz</p>
                  <span className="text-gray-400 text-xs ml-2">14:17</span>
                </div>
              </div>
              <div className="bg-teal-600/90 rounded-lg p-3 ml-8 mr-2 conversation-message">
                <div className="flex justify-between items-end">
                  <p className="text-white text-sm">Pagamento realizado com sucesso! Agradecemos pela preferência! Salve nosso contato para novos saques!</p>
                  <span className="text-teal-200 text-xs ml-2">14:20 ✓✓</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.6 }}
        >
          {!isLoggedIn ? (
            <Link
              to="/signup"
              className="px-10 py-4 rounded-lg bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 text-white font-bold shadow-lg hover:from-cyan-800 hover:via-cyan-600 hover:to-blue-700 transition border border-cyan-400/30 drop-shadow-neon"
            >
              Testar 7 dias grátis
            </Link>
          ) : (
            <Link to="/dashboard" className="px-10 py-4 rounded-lg bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 text-white font-bold shadow-lg hover:from-cyan-800 hover:via-cyan-600 hover:to-blue-700 transition border border-cyan-400/30 drop-shadow-neon">Acessar o Dashboard</Link>
          )}
        </motion.div>
      </section>

      {/* Depoimentos */}
      <section id="clientes" className="relative z-10 py-20 text-white">
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-center mb-12 title-gradient drop-shadow-neon leading-tight pb-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          O que dizem nossos clientes
        </motion.h2>
        <motion.div
          className="container mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          {[{
            name: 'Ana Paula',
            text: 'O FgtsAgent revolucionou nosso atendimento! Automatização e agilidade que nunca vi antes.',
            company: '',
            avatar: '/img/testimonials/woman1.jpg'
          }, {
            name: 'Carlos Silva',
            text: 'A integração omnichannel e os relatórios em tempo real facilitaram muito a gestão dos leads.',
            company: '',
            avatar: '/img/testimonials/man1.jpg'
          }, {
            name: 'Juliana Souza',
            text: 'A parceria com a V8 Digital trouxe ainda mais inovação e segurança para nosso negócio!',
            company: '',
            avatar: '/img/testimonials/woman2.jpg'
          }, {
            name: 'Roberto Oliveira',
            text: 'Conseguimos aumentar em 40% o número de propostas aprovadas desde que começamos a usar o FgtsAgent.',
            company: '',
            avatar: '/img/testimonials/man2-new.jpg'
          }].map((d, i) => (
            <motion.div
              key={i}
              className="bg-white/10 rounded-2xl p-6 sm:p-8 text-center shadow-lg transition border border-cyan-400/40 flex flex-col items-center h-full justify-between testimonial-card-optimized"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <div className="flex flex-col items-center">
                <img
                  src={d.avatar}
                  alt={`Foto de ${d.name}`}
                  loading="lazy"
                  className="w-16 h-16 rounded-full mb-4 border-4 border-cyan-400 shadow-md object-cover testimonial-avatar-optimized"
                  style={{ objectPosition: 'center top' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=00bcd4&color=fff&size=256`;
                  }}
                />
                <p className="text-white/90 italic mb-4">"{d.text}"</p>
              </div>
              <div>
                <span className="font-bold text-cyan-300 block testimonial-name-optimized">{d.name}</span>
                <span className="text-cyan-100 text-sm">{d.company}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Parceiro */}
      <section id="parceiro" className="relative z-10 py-12 text-white text-center flex flex-col items-center">
        <span className="mb-4 text-lg animate-fade-in">Uma solução em parceria com</span>
        <a href="https://www.v8digital.online/" target="_blank" rel="noopener noreferrer" className="inline-block animate-fade-in-delay">
          <img
            src="/_next/static/media/v8-logo-white.8e870e75.svg"
            alt="Logo V8 Digital"
            className="h-16 md:h-20 drop-shadow-neon hover:scale-105 transition"
            style={{ filter: 'drop-shadow(0 0 8px #00bcd4)' }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://placehold.co/300x100/00bcd4/white?text=V8+DIGITAL";
            }}
          />
        </a>
      </section>

      {/* Efeito neon no rodapé */}
      <footer className="relative z-10 py-8 text-center text-cyan-200 animate-fade-in">
        <div className="container mx-auto px-4">
          {/* Links legais */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <Link
              to="/terms-of-use"
              className="text-cyan-300 hover:text-cyan-100 transition-colors underline decoration-cyan-300/50 hover:decoration-cyan-100"
            >
              Termos de Uso
            </Link>
            <span className="hidden sm:inline text-cyan-400">•</span>
            <Link
              to="/privacy-policy"
              className="text-cyan-300 hover:text-cyan-100 transition-colors underline decoration-cyan-300/50 hover:decoration-cyan-100"
            >
              Política de Privacidade
            </Link>
          </div>

          {/* Copyright */}
          <span className="drop-shadow-neon">
            FgtsAgent &copy; {new Date().getFullYear()} &mdash; Tecnologia para o futuro do crédito
          </span>
        </div>
      </footer>
      </div>
      {/* Fundo degradê animado - mesmo gradiente do navbar */}
      <div className="fixed inset-0 w-full h-full z-[-20] bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 animate-gradient-move" style={{backgroundSize: '400% 400%'}} aria-hidden="true" />
    </div>
  );
}