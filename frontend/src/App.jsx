import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import axios from 'axios';
import AgentsConfigPage from './pages/AgentsConfigPage';
import AgentView from './pages/AgentView.jsx';
import SignUpWithPlans from './pages/SignUpWithPlans.jsx';
import SignupSuccess from './pages/SignupSuccess.jsx';
// ✅ REMOVIDO: CheckoutSuccess import (não é mais necessário)
import Profile from './pages/Profile.jsx';
// import Settings from './pages/Settings.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Chat from './pages/Chat.jsx';
import Leads from './pages/Leads.jsx';
import Ads from './pages/Ads.jsx';
import EvolutionCredentialsRoute from './pages/whatsapp-credentials';
import PartnerCredentialsRoute from './pages/partner-credentials';
import AuthCallback from './pages/AuthCallback.jsx';
import PaymentReturn from './pages/PaymentReturn.jsx';
import PaymentCancel from './pages/PaymentCancel.jsx';
import PaymentSuccess from './pages/PaymentSuccess.jsx';
import TermsOfUse from './pages/TermsOfUse.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import Terms from './pages/Terms.jsx';
import Privacy from './pages/Privacy.jsx';
import AuthRecovery from './pages/AuthRecovery.jsx';

import NotFound from './pages/NotFound.tsx';
import ErrorPage from './components/ErrorPage.tsx';
import SupabaseTest from './pages/SupabaseTest.jsx';
import { NotificationProvider } from './contexts/NotificationContext.jsx';

import CookieConsent from './components/CookieConsent.jsx';
import Layout from './components/Layout.jsx';
import { setupAxiosAuthInterceptor } from './utils/authUtils';


export default function App() {
  // ✅ INICIALIZAR: Interceptor de autenticação quando o app carrega
  useEffect(() => {
    console.log('🚀 App: Configurando interceptor de autenticação...');
    setupAxiosAuthInterceptor(axios);
  }, []);
  return (
    <NotificationProvider>
      <Layout>
        <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUpWithPlans />} />
        <Route path="/signup/success" element={<SignupSuccess />} />
        {/* ✅ UNIFICADO: /payment/signup/success agora redireciona para /signup/success */}
        <Route path="/payment/signup/success" element={<SignupSuccess />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/ads" element={<Ads />} />
        <Route path="/whatsapp-credentials" element={<EvolutionCredentialsRoute />} />
        <Route path="/partner-credentials" element={<PartnerCredentialsRoute />} />
        <Route path="/agents" element={<AgentsConfigPage />} />
        <Route path="/agents/:id" element={<AgentView />} />
        <Route path="/profile" element={<Profile />} />
        {/* <Route path="/settings" element={<Settings />} /> */}

        {/* Páginas legais */}
        <Route path="/terms-of-use" element={<TermsOfUse />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />

        {/* Página de diagnóstico do Supabase */}
        <Route path="/supabase-diagnostico" element={<SupabaseTest />} />
        


        {/* Rota de callback para compatibilidade (agora apenas redireciona para login) */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* Rota de recuperação de autenticação */}
        <Route path="/auth/recovery" element={<AuthRecovery />} />
        
        {/* Rota de retorno do pagamento 3D Secure */}
        <Route path="/payment/return" element={<PaymentReturn />} />
        
        {/* Rota de cancelamento do pagamento */}
        <Route path="/payment/cancel" element={<PaymentCancel />} />
        
        {/* Rota de sucesso do pagamento após 3DS */}
        <Route path="/payment-success" element={<PaymentSuccess />} />

        {/* Rotas de erro */}
        <Route path="/error" element={<ErrorPage />} />

        {/* Rota 404 para qualquer outra URL */}
        <Route path="*" element={<NotFound />} />
      </Routes>

        {/* Banner de Consentimento de Cookies */}
        <CookieConsent />
      </Layout>
    </NotificationProvider>
  );
}
