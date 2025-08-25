import React, { useState, useEffect } from 'react';
import { X, Lock, AlertCircle, CheckCircle } from 'lucide-react';

const ThreeDSecureModal = ({ 
  isOpen, 
  onClose, 
  redirectUrl, 
  onSuccess, 
  onError 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [errorMessage, setErrorMessage] = useState('');

  // ✅ RESET: Estado quando modal abre
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setStatus('loading');
      setErrorMessage('');
    }
  }, [isOpen]);

  // ✅ HANDLER: Fechar modal
  const handleClose = () => {
    if (status === 'loading') {
      // ✅ CONFIRMAR: Se está em processo
      if (window.confirm('A verificação ainda está em andamento. Tem certeza que deseja cancelar?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // ✅ HANDLER: Iframe carregado
  const handleIframeLoad = () => {
    setIsLoading(false);
    console.log('✅ Iframe 3D Secure carregado');
  };

  // ✅ HANDLER: Erro no iframe
  const handleIframeError = () => {
    setIsLoading(false);
    setStatus('error');
    setErrorMessage('Erro ao carregar a verificação de segurança');
    console.error('❌ Erro no iframe 3D Secure');
  };

    // ✅ HANDLER: Mensagem do iframe (para comunicação)
  useEffect(() => {
    const handleMessage = (event) => {
      // ✅ VERIFICAR: Se a mensagem é do Stripe
      if (event.origin.includes('stripe.com') || event.origin.includes('hooks.stripe.com')) {
        console.log('📨 Mensagem recebida do Stripe:', event.data);
        
        // ✅ PROCESSAR: Diferentes tipos de mensagem
        if (event.data.type === '3ds-authentication-complete') {
          setStatus('success');
          setIsLoading(false);
          
          // ✅ NOTIFICAR: Sucesso imediatamente
          if (onSuccess) onSuccess(event.data);
          
          // ✅ FECHAR: Modal após notificação
          setTimeout(() => {
            onClose();
          }, 1000);
        } else if (event.data.type === '3ds-authentication-failed') {
          setStatus('error');
          setIsLoading(false);
          setErrorMessage('Falha na verificação de segurança');
        }
      }
    };

    // ✅ HANDLER: Verificar mudanças na URL do iframe (fallback)
    const checkIframeUrl = () => {
      const iframe = document.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        try {
          const currentUrl = iframe.contentWindow.location.href;
          console.log('🔍 URL atual do iframe:', currentUrl);
          
          // ✅ DETECTAR: Sucesso por mudança de URL
          if (currentUrl.includes('success') || currentUrl.includes('complete') || currentUrl.includes('approved')) {
            console.log('✅ Sucesso detectado por mudança de URL');
            setStatus('success');
            setIsLoading(false);
            
            if (onSuccess) onSuccess({ type: '3ds-authentication-complete', source: 'url-change' });
            
            setTimeout(() => {
              onClose();
            }, 1000);
          }
        } catch (error) {
          // Cross-origin error, ignorar
        }
      }
    };

    if (isOpen) {
      window.addEventListener('message', handleMessage);
      
      // ✅ TIMER: Verificar URL do iframe a cada 2 segundos
      const urlCheckInterval = setInterval(checkIframeUrl, 2000);
      
      return () => {
        window.removeEventListener('message', handleMessage);
        clearInterval(urlCheckInterval);
      };
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isOpen, onSuccess, onClose]);

  // ✅ RENDER: Modal apenas quando aberto
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              status === 'loading' ? 'bg-blue-100' :
              status === 'success' ? 'bg-green-100' :
              'bg-red-100'
            }`}>
              {status === 'loading' && <Lock className="w-5 h-5 text-blue-600" />}
              {status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
              {status === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {status === 'loading' && 'Verificação de Segurança'}
                {status === 'success' && 'Verificação Concluída'}
                {status === 'error' && 'Erro na Verificação'}
              </h3>
              <p className="text-sm text-gray-600">
                {status === 'loading' && 'Complete a verificação 3D Secure'}
                {status === 'success' && 'Sua verificação foi aprovada'}
                {status === 'error' && errorMessage}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={status === 'loading'}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="relative">
          {/* ✅ LOADING: Overlay de carregamento */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Carregando verificação...</p>
              </div>
            </div>
          )}

          {/* ✅ SUCCESS: Mensagem de sucesso */}
          {status === 'success' && (
            <div className="absolute inset-0 bg-green-50 flex items-center justify-center z-10">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-green-800 mb-2">
                  Verificação Aprovada!
                </h4>
                <p className="text-green-600">
                  Redirecionando em alguns segundos...
                </p>
              </div>
            </div>
          )}

          {/* ✅ ERROR: Mensagem de erro */}
          {status === 'error' && (
            <div className="absolute inset-0 bg-red-50 flex items-center justify-center z-10">
              <div className="text-center">
                <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-red-800 mb-2">
                  Erro na Verificação
                </h4>
                <p className="text-red-600 mb-4">
                  {errorMessage}
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

          {/* ✅ IFRAME: 3D Secure */}
          <iframe
            src={redirectUrl}
            className="w-full h-96 border-0"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            title="3D Secure Verification"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            allow="camera; microphone; geolocation"
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-center text-sm text-gray-600">
            {status === 'loading' && (
              <>
                <p>Não feche esta janela durante a verificação</p>
                <p className="mt-1">Após completar, você será redirecionado automaticamente</p>
                
                {/* ✅ BOTÃO MANUAL: Para casos onde a detecção automática falha */}
                <div className="mt-3">
                  <button
                    onClick={() => {
                      console.log('✅ Sucesso confirmado manualmente pelo usuário');
                      setStatus('success');
                      setIsLoading(false);
                      
                      if (onSuccess) onSuccess({ type: '3ds-authentication-complete', source: 'manual-confirmation' });
                      
                      setTimeout(() => {
                        onClose();
                      }, 1000);
                    }}
                    className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                  >
                    ✅ Confirmar Sucesso Manualmente
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    Use este botão se a verificação foi concluída mas não foi detectada automaticamente
                  </p>
                </div>
              </>
            )}
            {status === 'success' && (
              <p className="text-green-600 font-medium">
                ✅ Verificação concluída com sucesso!
              </p>
            )}
            {status === 'error' && (
              <p className="text-red-600 font-medium">
                ❌ Ocorreu um erro na verificação
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreeDSecureModal;
