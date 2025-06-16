import React, { useEffect, useState } from 'react';
import { FaRobot, FaChartLine, FaHandHoldingUsd, FaUsers, FaShieldAlt, FaChartPie, FaCheck, FaWhatsapp, FaEnvelope, FaChartBar } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import NeuralNetworkBackground from '../NeuralNetworkBackground.jsx';

// Dados sincronizados com os produtos e preços do Stripe
// Produtos no Stripe:
// - prod_STalRE6RzVNTUu: FGTS Agent - Plano Básico (R$ 99,99/mês)
// - prod_STalhjSBTyHza7: FGTS Agent - Plano Pro (R$ 199,99/mês)  
// - prod_STalNWvSe9GqRs: FGTS Agent - Plano Premium (R$ 499,99/mês)

const features = [
  { icon: <FaRobot size={40} />, title: 'Automação 24/7', text: 'Nosso agente atende leads a qualquer hora, sem falhas.' },
  { icon: <FaChartLine size={40} />, title: 'Aumente suas Vendas', text: 'Fluxo inteligente que converte mais clientes com menos esforço.' },
  { icon: <FaHandHoldingUsd size={40} />, title: 'Especialista em FGTS', text: 'Cria propostas e simula antecipação de saque-aniversário FGTS automaticamente.' },
  { icon: <FaUsers size={40} />, title: 'Integração Omnichannel', text: 'Atendimento via WhatsApp, e-mail e web, garantindo proximidade com o cliente.' },
  { icon: <FaShieldAlt size={40} />, title: 'Segurança & Compliance', text: 'Dados protegidos e conformidade com regulamentações do setor financeiro.' },
  { icon: <FaChartPie size={40} />, title: 'Analytics em Tempo Real', text: 'Dashboards que mostram desempenho de leads, propostas e conversão.' }
];

// Dados dos planos baseados no Stripe
const plans = [
  {
    name: 'FGTS Agent - Plano Básico',
    price: 'R$ 99,99',
    period: '/mês',
    description: 'Plano básico com operações limitadas de saldo FGTS e dashboard',
    stripeProductId: 'prod_STalRE6RzVNTUu',
    stripePriceId: 'price_1RYdaBRrfRhcM17zE4rOKO9U',
    features: [
      'Consultas limitadas de saldo FGTS',
      'Dashboard básico',
      'Integração WhatsApp',
      'Relatórios simples',
      'Suporte por email'
    ],
    icon: <FaWhatsapp size={32} />,
    popular: false,
    buttonText: 'Começar Agora'
  },
  {
    name: 'FGTS Agent - Plano Pro',
    price: 'R$ 199,99',
    period: '/mês',
    description: 'Plano profissional com consultas ilimitadas, notificações em tempo real e relatórios avançados',
    stripeProductId: 'prod_STalhjSBTyHza7',
    stripePriceId: 'price_1RYdaFRrfRhcM17zecmj0hhT',
    features: [
      'Consultas ilimitadas de FGTS',
      'Notificações em tempo real',
      'WhatsApp + Email + Web',
      'Relatórios avançados',
      'Simulador de propostas',
      'Suporte prioritário',
      'Integrações personalizadas'
    ],
    icon: <FaChartBar size={32} />,
    popular: true,
    buttonText: 'Mais Popular'
  },
  {
    name: 'FGTS Agent - Plano Premium',
    price: 'R$ 499,99',
    period: '/mês',
    description: 'Plano premium com todas as funcionalidades, API dedicada e suporte prioritário',
    stripeProductId: 'prod_STalNWvSe9GqRs',
    stripePriceId: 'price_1RYdaJRrfRhcM17zJsOCBmmi',
    features: [
      'Todas as funcionalidades',
      'API dedicada',
      'Múltiplos agentes IA',
      'Dashboard executivo',
      'Suporte prioritário 24/7',
      'Gerente de conta dedicado',
      'White-label disponível',
      'SLA garantido'
    ],
    icon: <FaUsers size={32} />,
    popular: false,
    buttonText: 'Contatar Vendas'
  }
];

export default function Home({ isLoggedIn }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [menuOpen, setMenuOpen] = useState(false);

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
      <nav className="fixed top-0 left-0 w-full z-50 bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 animate-gradient-move backdrop-blur-md shadow-lg border-b border-cyan-400/30">
        <div className="container mx-auto flex items-center justify-between py-3 px-6">
          <div className="flex items-center gap-3">
            <FaRobot className="text-cyan-300 animate-pulse" size={32} />
            <span className="text-2xl font-extrabold text-cyan-200 tracking-widest drop-shadow-neon">FgtsAgent</span>
          </div>
          {/* Menu desktop */}
          <div className="hidden md:flex gap-6 items-center">
            <a href="#features" className="text-cyan-100 hover:text-cyan-300 transition font-semibold">Funcionalidades</a>
            <a href="#planos" className="text-cyan-100 hover:text-cyan-300 transition font-semibold">Planos</a>
            <a href="#clientes" className="text-cyan-100 hover:text-cyan-300 transition font-semibold">Clientes</a>
            <a href="#parceiro" className="text-cyan-100 hover:text-cyan-300 transition font-semibold">Parceiro</a>
            {!isLoggedIn ? (
              <Link to="/login" className="ml-4 px-5 py-2 rounded-full bg-cyan-400 text-white font-bold shadow-lg hover:bg-cyan-300 transition border-2 border-cyan-300/40">Entrar</Link>
            ) : (
              <Link to="/dashboard" className="ml-4 px-5 py-2 rounded-full bg-cyan-400 text-white font-bold shadow-lg hover:bg-cyan-300 transition border-2 border-cyan-300/40">Dashboard</Link>
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
                className="fixed left-0 right-0 top-16 bottom-0 bg-black/60 z-40"
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
                className="fixed top-16 right-0 h-[calc(100vh-64px)] w-4/5 max-w-xs bg-gradient-to-br from-cyan-900/95 via-blue-900/95 to-purple-900/95 z-50 shadow-2xl flex flex-col pt-8 px-8 gap-6 border-l border-cyan-400/30"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <motion.a href="#features" className="text-cyan-100 hover:text-cyan-300 transition font-semibold" onClick={() => setMenuOpen(false)} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>Funcionalidades</motion.a>
                <motion.a href="#planos" className="text-cyan-100 hover:text-cyan-300 transition font-semibold" onClick={() => setMenuOpen(false)} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>Planos</motion.a>
                <motion.a href="#clientes" className="text-cyan-100 hover:text-cyan-300 transition font-semibold" onClick={() => setMenuOpen(false)} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>Clientes</motion.a>
                <motion.a href="#parceiro" className="text-cyan-100 hover:text-cyan-300 transition font-semibold" onClick={() => setMenuOpen(false)} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>Parceiro</motion.a>
                {!isLoggedIn ? (
                  <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                    <Link to="/login" className="mt-2 px-5 py-2 rounded-full bg-cyan-400 text-white font-bold shadow-lg hover:bg-cyan-300 transition border-2 border-cyan-300/40 block text-center" onClick={() => setMenuOpen(false)}>Entrar</Link>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                    <Link to="/dashboard" className="mt-2 px-5 py-2 rounded-full bg-cyan-400 text-white font-bold shadow-lg hover:bg-cyan-300 transition border-2 border-cyan-300/40 block text-center" onClick={() => setMenuOpen(false)}>Dashboard</Link>
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
          className="text-6xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500 text-transparent bg-clip-text drop-shadow-neon leading-tight pb-4"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          FgtsAgent
        </motion.h1>
        <motion.p
          className="text-2xl md:text-3xl text-white/80 mb-10 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          Agente Inteligente para Antecipação de Saque-Aniversário FGTS
        </motion.p>
        <motion.div
          className="flex flex-col md:flex-row gap-4 justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
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
          className="text-3xl md:text-4xl font-bold text-center mb-12 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500 text-transparent bg-clip-text drop-shadow-neon leading-tight pb-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
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
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          {features.map((f, i) => (
            <motion.div
              key={i}
              className="bg-white/10 rounded-2xl p-8 text-center shadow-xl hover:scale-105 transition backdrop-blur-lg border border-cyan-400/40 drop-shadow-neon card-futuristic w-full h-full"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.1 }}
            >
              <div className="mb-4 text-cyan-300 flex justify-center">{f.icon}</div>
              <h5 className="font-bold text-lg text-white mb-2 drop-shadow">{f.title}</h5>
              <p className="text-white/80">{f.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Planos de Assinatura */}
      <section id="planos" className="relative z-10 py-20">
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-center mb-6 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500 text-transparent bg-clip-text drop-shadow-neon leading-tight pb-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Escolha seu Plano
        </motion.h2>
        <motion.p
          className="text-center text-white/80 text-lg mb-12 max-w-2xl mx-auto px-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Transforme seu negócio de FGTS com nossos planos flexíveis
        </motion.p>
        
        <motion.div
          className="container mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 px-4"
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
              className={`bg-white/10 rounded-2xl p-8 text-center shadow-xl transition backdrop-blur-lg border drop-shadow-neon card-futuristic relative ${
                plan.popular 
                  ? 'border-emerald-400/60 scale-105 bg-gradient-to-b from-emerald-900/20 to-cyan-900/20' 
                  : 'border-cyan-400/40 hover:scale-105'
              }`}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.1 }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-black px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                    MAIS POPULAR
                  </span>
                </div>
              )}
              
              <div className="mb-6">
                <div className={`mb-4 flex justify-center ${plan.popular ? 'text-emerald-300' : 'text-cyan-300'}`}>
                  {plan.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-white/70 text-sm mb-4">{plan.description}</p>
                
                <div className="mb-6">
                  <span className={`text-4xl font-extrabold ${plan.popular ? 'text-emerald-300' : 'text-cyan-300'}`}>
                    {plan.price}
                  </span>
                  <span className="text-white/60 text-lg">{plan.period}</span>
                </div>
              </div>
              
              <div className="mb-8 text-left">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center mb-3">
                    <FaCheck className={`mr-3 ${plan.popular ? 'text-emerald-400' : 'text-cyan-400'} flex-shrink-0`} size={16} />
                    <span className="text-white/90 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              
                             <Link
                 to={`/signup?plan=${plan.stripePriceId}`}
                 className={`w-full py-3 px-6 rounded-lg font-bold shadow-lg transition border-2 ${
                   plan.popular
                     ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white border-emerald-400/50 hover:from-emerald-400 hover:to-cyan-400'
                     : 'bg-transparent text-cyan-300 border-cyan-400/50 hover:bg-cyan-900/50'
                 } drop-shadow-neon block text-center`}
                 data-price-id={plan.stripePriceId}
                 data-product-id={plan.stripeProductId}
               >
                 {plan.buttonText}
               </Link>
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
          <p className="text-white/70 mb-4">
            Todos os planos incluem 14 dias de teste grátis
          </p>
          <p className="text-cyan-300 text-sm">
            Precisa de algo personalizado? <span className="underline cursor-pointer hover:text-cyan-200">Entre em contato</span>
          </p>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 text-white text-center shadow-inner">
        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-8 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500 text-transparent bg-clip-text drop-shadow-neon leading-tight pb-4"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          Pronto para revolucionar seu atendimento FGTS?
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          {!isLoggedIn ? (
            <Link
              to="/signup"
              className="px-10 py-4 rounded-lg bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 text-white font-bold shadow-lg hover:from-cyan-800 hover:via-cyan-600 hover:to-blue-700 transition border border-cyan-400/30 drop-shadow-neon"
            >
              Solicite uma Demonstração
            </Link>
          ) : (
            <Link to="/dashboard" className="px-10 py-4 rounded-lg bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 text-white font-bold shadow-lg hover:from-cyan-800 hover:via-cyan-600 hover:to-blue-700 transition border border-cyan-400/30 drop-shadow-neon">Acessar o Dashboard</Link>
          )}
        </motion.div>
      </section>

      {/* Depoimentos */}
      <section id="clientes" className="relative z-10 py-20 text-white">
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-center mb-12 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500 text-transparent bg-clip-text drop-shadow-neon leading-tight pb-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
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
              className="bg-white/10 rounded-2xl p-6 sm:p-8 text-center shadow-xl hover:scale-105 transition backdrop-blur-lg border border-cyan-400/40 drop-shadow-neon card-futuristic flex flex-col items-center h-full justify-between"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.1 }}
            >
              <div className="flex flex-col items-center">
                <img 
                  src={d.avatar} 
                  alt={`Foto de ${d.name}`} 
                  loading="lazy"
                  className="w-16 h-16 rounded-full mb-4 border-4 border-cyan-400 shadow-lg object-cover" 
                  style={{ objectPosition: 'center top' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=00bcd4&color=fff&size=256`;
                  }}
                />
                <p className="text-white/90 italic mb-4">"{d.text}"</p>
              </div>
              <div>
                <span className="font-bold text-cyan-300 block">{d.name}</span>
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
            src="/img/partners/v8digital-logo.svg" 
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
      {/* Fundo degradê animado ainda mais escuro cobrindo toda a página */}
      <div className="fixed inset-0 w-full h-full z-[-20] animate-gradient-move bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950" style={{backgroundSize: '400% 400%'}} aria-hidden="true" />
      <NeuralNetworkBackground />
    </div>
  );
} 