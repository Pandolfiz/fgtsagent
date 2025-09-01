import React, { useEffect, useState } from 'react';
import { FaRobot } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingNavbar({ isLoggedIn = false }) {
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
    <nav className="fixed top-0 left-0 w-full z-50 bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 animate-gradient-move backdrop-blur-md shadow-lg border-b border-cyan-400/30">
      <div className="container mx-auto flex items-center justify-between py-3 px-6">
        <Link to="/" className="flex items-center gap-3">
          <FaRobot className="text-cyan-300 animate-pulse" size={32} />
          <span className="text-2xl font-extrabold text-cyan-200 tracking-widest drop-shadow-neon">FgtsAgent</span>
        </Link>
        {/* Menu desktop */}
        <div className="hidden md:flex gap-6 items-center">
          <Link to="/#features" className="text-cyan-100 hover:text-cyan-300 transition font-semibold">Funcionalidades</Link>
          <Link to="/#planos" className="text-cyan-100 hover:text-cyan-300 transition font-semibold">Planos</Link>
          <Link to="/#clientes" className="text-cyan-100 hover:text-cyan-300 transition font-semibold">Clientes</Link>
          <Link to="/#parceiro" className="text-cyan-100 hover:text-cyan-300 transition font-semibold">Parceiro</Link>
          {!isLoggedIn ? (
            <Link to="/login" className="ml-4 px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold shadow-lg hover:from-emerald-400 hover:to-cyan-400 transition border-2 border-emerald-300/40">Entrar</Link>
          ) : (
            <Link to="/dashboard" className="ml-4 px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold shadow-lg hover:from-emerald-400 hover:to-cyan-400 transition border-2 border-emerald-300/40">Dashboard</Link>
          )}
        </div>
        {/* Menu mobile */}
        <div className="md:hidden flex items-center">
          <button id="menu-btn" onClick={() => setMenuOpen(!menuOpen)} className="text-cyan-100 focus:outline-none">
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
              <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <Link to="/#features" className="text-cyan-100 hover:text-cyan-300 transition font-semibold" onClick={() => setMenuOpen(false)}>Funcionalidades</Link>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <Link to="/#planos" className="text-cyan-100 hover:text-cyan-300 transition font-semibold" onClick={() => setMenuOpen(false)}>Planos</Link>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <Link to="/#clientes" className="text-cyan-100 hover:text-cyan-300 transition font-semibold" onClick={() => setMenuOpen(false)}>Clientes</Link>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <Link to="/#parceiro" className="text-cyan-100 hover:text-cyan-300 transition font-semibold" onClick={() => setMenuOpen(false)}>Parceiro</Link>
              </motion.div>
              {!isLoggedIn ? (
                <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                  <Link to="/login" className="mt-2 px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold shadow-lg hover:from-emerald-400 hover:to-cyan-400 transition border-2 border-emerald-300/40 block text-center" onClick={() => setMenuOpen(false)}>Entrar</Link>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                  <Link to="/dashboard" className="mt-2 px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold shadow-lg hover:from-emerald-400 hover:to-cyan-400 transition border-2 border-emerald-300/40 block text-center" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}