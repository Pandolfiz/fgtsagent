import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import { Routes, Route } from 'react-router-dom';
import AgentsConfigPage from './pages/AgentsConfigPage';
import AgentView from './pages/AgentView.jsx';
import Signup from './pages/Signup.jsx';
import Profile from './pages/Profile.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Chat from './pages/Chat.jsx';
import EvolutionCredentialsRoute from './pages/whatsapp-credentials';
import PartnerCredentialsRoute from './pages/partner-credentials';
import AuthCallback from './pages/AuthCallback.tsx';
import OAuthCallback from './pages/OAuthCallback.tsx';
import NotFound from './pages/NotFound.tsx';
import ErrorPage from './components/ErrorPage.tsx';
import OAuthError from './pages/OAuthError.tsx';
import SupabaseTest from './pages/SupabaseTest.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/whatsapp-credentials" element={<EvolutionCredentialsRoute />} />
      <Route path="/partner-credentials" element={<PartnerCredentialsRoute />} />
      <Route path="/agents" element={<AgentsConfigPage />} />
      <Route path="/agents/:id" element={<AgentView />} />
      <Route path="/profile" element={<Profile />} />
      
      {/* Página de diagnóstico do Supabase */}
      <Route path="/supabase-diagnostico" element={<SupabaseTest />} />
      
      {/* Rotas de autenticação */}
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/callback/" element={<AuthCallback />} />
      
      {/* Rotas de OAuth com tratamento especial */}
      <Route path="/oauth2-credential/callback" element={<OAuthCallback />} />
      <Route path="/oauth2-credential/callback/" element={<OAuthCallback />} />
      
      {/* Rotas de erro */}
      <Route path="/error" element={<ErrorPage />} />
      <Route path="/auth/error" element={<OAuthError />} />
      <Route path="/oauth2-credential/error" element={<OAuthError />} />
      
      {/* Rota 404 para qualquer outra URL */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
