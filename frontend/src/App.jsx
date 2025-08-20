import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import { Routes, Route } from 'react-router-dom';
import AgentsConfigPage from './pages/AgentsConfigPage';
import AgentView from './pages/AgentView.jsx';
import SignUpWithPlans from './pages/SignUpWithPlans.jsx';
import SignupSuccess from './pages/SignupSuccess.jsx';
import CheckoutSuccess from './pages/CheckoutSuccess.jsx';
import Profile from './pages/Profile.jsx';
// import Settings from './pages/Settings.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Chat from './pages/Chat.jsx';
import Leads from './pages/Leads.jsx';
import EvolutionCredentialsRoute from './pages/whatsapp-credentials';
import PartnerCredentialsRoute from './pages/partner-credentials';
import AuthCallback from './pages/AuthCallback.jsx';
import PaymentReturn from './pages/PaymentReturn.jsx';
import TermsOfUse from './pages/TermsOfUse.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';

import NotFound from './pages/NotFound.tsx';
import ErrorPage from './components/ErrorPage.tsx';
import SupabaseTest from './pages/SupabaseTest.jsx';
import CookieConsent from './components/CookieConsent.jsx';


export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUpWithPlans />} />
        <Route path="/signup-success" element={<SignupSuccess />} />
        <Route path="/payment/success" element={<CheckoutSuccess />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/whatsapp-credentials" element={<EvolutionCredentialsRoute />} />
        <Route path="/partner-credentials" element={<PartnerCredentialsRoute />} />
        <Route path="/agents" element={<AgentsConfigPage />} />
        <Route path="/agents/:id" element={<AgentView />} />
        <Route path="/profile" element={<Profile />} />
        {/* <Route path="/settings" element={<Settings />} /> */}

        {/* Páginas legais */}
        <Route path="/terms-of-use" element={<TermsOfUse />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />

        {/* Página de diagnóstico do Supabase */}
        <Route path="/supabase-diagnostico" element={<SupabaseTest />} />

        {/* Rota de callback para compatibilidade (agora apenas redireciona para login) */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* Rota de retorno do pagamento 3D Secure */}
        <Route path="/payment/return" element={<PaymentReturn />} />

        {/* Rotas de erro */}
        <Route path="/error" element={<ErrorPage />} />

        {/* Rota 404 para qualquer outra URL */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Banner de Consentimento de Cookies */}
      <CookieConsent />
    </>
  );
}
