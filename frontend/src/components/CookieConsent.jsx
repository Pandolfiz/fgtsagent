import React, { useState, useEffect } from 'react';
import { X, Settings, CheckCircle, AlertCircle } from 'lucide-react';

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consent, setConsent] = useState({
    essential: true, // Sempre obrigatório
    analytics: false,
    marketing: false,
    preferences: false
  });

  useEffect(() => {
    // Verificar consentimento em múltiplas fontes para persistência
    const loadConsent = async () => {
      let consentData = null;
      
      // 1. Tentar carregar do cookie HTTP primeiro (mais confiável)
      const cookieConsent = document.cookie
        .split('; ')
        .find(row => row.startsWith('lgpd_consent='));
      
      if (cookieConsent) {
        try {
          const decoded = decodeURIComponent(cookieConsent.split('=')[1]);
          consentData = JSON.parse(decoded);
        } catch (error) {
          console.warn('Erro ao decodificar cookie LGPD:', error);
        }
      }
      
      // 2. Fallback para localStorage
      if (!consentData) {
        const savedConsent = localStorage.getItem('cookieConsent');
        if (savedConsent) {
          try {
            consentData = {
              consent: JSON.parse(savedConsent),
              date: localStorage.getItem('cookieConsentDate') || new Date().toISOString(),
              version: '1.0'
            };
          } catch (error) {
            console.warn('Erro ao carregar consentimento do localStorage:', error);
          }
        }
      }
      
      // 3. Tentar carregar do servidor como último recurso
      if (!consentData) {
        try {
          const response = await fetch('/api/lgpd/get-consent', {
            credentials: 'include'
          });
          if (response.ok) {
            const serverResponse = await response.json();
            if (serverResponse.success && serverResponse.data) {
              consentData = serverResponse.data;
            }
          }
        } catch (error) {
          console.warn('Erro ao carregar consentimento do servidor:', error);
        }
      }
      
      if (consentData && consentData.consent) {
        setConsent(consentData.consent);
      } else {
        setShowBanner(true);
      }
    };
    
    loadConsent();
  }, []);

  const saveConsent = async (newConsent) => {
    // Salvar em localStorage (para compatibilidade)
    localStorage.setItem('cookieConsent', JSON.stringify(newConsent));
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    
    // Salvar em cookies HTTP (para persistência)
    const consentData = {
      consent: newConsent,
      date: new Date().toISOString(),
      version: '1.0'
    };
    
    // Definir cookie com configurações adequadas para LGPD
    const domain = window.location.hostname === 'localhost' ? '' : `.${window.location.hostname}`;
    const isSecure = window.location.protocol === 'https:';
    
    const cookieString = `lgpd_consent=${encodeURIComponent(JSON.stringify(consentData))}; path=/; domain=${domain}; max-age=${365 * 24 * 60 * 60}; SameSite=Lax; Secure=${isSecure}`;
    document.cookie = cookieString;
    
    // Enviar para backend para persistência no servidor
    try {
      await fetch('/api/lgpd/save-consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(consentData)
      });
    } catch (error) {
      console.warn('Erro ao salvar consentimento no servidor:', error);
    }
    
    setConsent(newConsent);
    setShowBanner(false);
    setShowSettings(false);

    // Disparar evento para outros componentes
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', {
      detail: newConsent
    }));
  };

  const acceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      preferences: true
    });
  };

  const acceptEssential = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false
    });
  };

  const handleConsentChange = (type, value) => {
    setConsent(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const saveCustomConsent = () => {
    saveConsent(consent);
  };

  if (!showBanner && !showSettings) return null;

  return (
    <>
      {/* Banner Principal */}
      {showBanner && !showSettings && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-t border-cyan-500/30 p-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-semibold text-white">
                    Política de Cookies
                  </h3>
                </div>
                <p className="text-cyan-200 text-sm">
                  Utilizamos cookies para melhorar sua experiência, analisar o tráfego e personalizar conteúdo.
                  Você pode escolher quais tipos de cookies aceitar.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm border border-cyan-400/30 rounded-lg text-cyan-200 hover:bg-cyan-900/30 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Configurações
                </button>
                <button
                  onClick={acceptEssential}
                  className="px-4 py-2 text-sm border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Apenas Essenciais
                </button>
                <button
                  onClick={acceptAll}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-colors"
                >
                  Aceitar Todos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configurações */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-cyan-500/30 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6 text-cyan-400" />
                  <h2 className="text-2xl font-bold text-white">
                    Configurações de Cookies
                  </h2>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-cyan-200 mb-6">
                Escolha quais tipos de cookies você deseja permitir. Os cookies essenciais são sempre necessários para o funcionamento do site.
              </p>

              <div className="space-y-4">
                {/* Cookies Essenciais */}
                <div className="border border-cyan-500/30 rounded-lg p-4 bg-cyan-900/10">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        Cookies Essenciais
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      </h3>
                      <p className="text-cyan-200 text-sm">
                        Necessários para o funcionamento básico do site
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={consent.essential}
                        disabled
                        className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Autenticação e segurança</li>
                    <li>• Funcionalidades básicas</li>
                    <li>• Preferências de sessão</li>
                  </ul>
                </div>

                {/* Cookies de Análise */}
                <div className="border border-cyan-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Cookies de Análise</h3>
                      <p className="text-cyan-200 text-sm">
                        Nos ajudam a entender como você usa o site
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={consent.analytics}
                        onChange={(e) => handleConsentChange('analytics', e.target.checked)}
                        className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Estatísticas de uso da plataforma</li>
                    <li>• Análise de performance</li>
                    <li>• Identificação de problemas técnicos</li>
                  </ul>
                </div>

                {/* Cookies de Marketing */}
                <div className="border border-cyan-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Cookies de Marketing</h3>
                      <p className="text-cyan-200 text-sm">
                        Para personalizar conteúdo e ofertas
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={consent.marketing}
                        onChange={(e) => handleConsentChange('marketing', e.target.checked)}
                        className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Ofertas personalizadas</li>
                    <li>• Campanhas de marketing</li>
                    <li>• Anúncios relevantes</li>
                  </ul>
                </div>

                {/* Cookies de Preferências */}
                <div className="border border-cyan-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Cookies de Preferências</h3>
                      <p className="text-cyan-200 text-sm">
                        Para lembrar suas escolhas e configurações
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={consent.preferences}
                        onChange={(e) => handleConsentChange('preferences', e.target.checked)}
                        className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Idioma preferido</li>
                    <li>• Configurações de tema</li>
                    <li>• Preferências de notificação</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-cyan-500/30">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveCustomConsent}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-colors"
                >
                  Salvar Preferências
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieConsent;