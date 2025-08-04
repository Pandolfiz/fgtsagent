import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar para a página de login com mensagem informativa
    navigate('/login?error=oauth_disabled&message=A autenticação com Google foi desativada nesta aplicação.');
  }, [navigate]);

  // Exibir mensagem de carregamento enquanto o redirecionamento acontece
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400 mx-auto mb-4"></div>
        <p>Redirecionando...</p>
      </div>
    </div>
  );
}