import React, { useState } from 'react';
import ThreeDSecureModal from '../components/ThreeDSecureModal.jsx';

const ThreeDSecureTest = () => {
  const [showModal, setShowModal] = useState(false);
  const [testUrl, setTestUrl] = useState('');

  // ✅ URL de teste do Stripe 3D Secure
  const testUrls = [
    'https://hooks.stripe.com/3d_secure_2/hosted?merchant=acct_1RxUPbH8jGtRbIKF&payment_intent=pi_3RziK2H8jGtRbIKF0fu4mQmh&payment_intent_client_secret=pi_3RziK2H8jGtRbIKF0fu4mQmh_secret_b6hNIetVjRBXTLjXiK67sx3Co&publishable_key=pk_live_51RxUPbH8jGtRbIKFJMXTXCWAK4XB7LrL93qyj44N807gT1vGPGkMX2Pc66GRV4Zr2s1DddmoOfMRySVXDgzGSAFm008j2tcfkV&source=payatt_3RziK2H8jGtRbIKF0j3AI9Qz',
    'https://hooks.stripe.com/3d_secure_2/hosted?merchant=acct_test&payment_intent=pi_test&payment_intent_client_secret=pi_test_secret&publishable_key=pk_test&source=payatt_test'
  ];

  // ✅ HANDLER: Abrir modal com URL específica
  const openModalWithUrl = (url) => {
    setTestUrl(url);
    setShowModal(true);
  };

  // ✅ HANDLER: Sucesso do 3D Secure
  const handleSuccess = (data) => {
    console.log('✅ 3D Secure concluído:', data);
    alert('3D Secure concluído com sucesso!');
  };

  // ✅ HANDLER: Erro do 3D Secure
  const handleError = (error) => {
    console.error('❌ Erro no 3D Secure:', error);
    alert('Erro no 3D Secure: ' + error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Teste do Modal 3D Secure
          </h1>
          <p className="text-xl text-cyan-200">
            Teste o popup de verificação de segurança
          </p>
        </div>

        {/* URLs de Teste */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {testUrls.map((url, index) => (
            <div
              key={index}
              className="bg-gray-800 border border-cyan-500/30 rounded-xl p-6 hover:border-cyan-500/60 transition-all duration-300"
            >
              <h3 className="text-lg font-semibold text-white mb-3">
                Teste {index + 1}
              </h3>
              <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                {url}
              </p>
              <button
                onClick={() => openModalWithUrl(url)}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
              >
                Testar Modal
              </button>
            </div>
          ))}
        </div>

        {/* URL Customizada */}
        <div className="bg-gray-800 border border-cyan-500/30 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-3">
            URL Customizada
          </h3>
          <div className="space-y-4">
            <input
              type="url"
              placeholder="Cole aqui uma URL de 3D Secure"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none"
            />
            <button
              onClick={() => testUrl && openModalWithUrl(testUrl)}
              disabled={!testUrl}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
            >
              Testar URL Customizada
            </button>
          </div>
        </div>

        {/* Instruções */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-200 mb-3">
            📋 Instruções de Teste
          </h3>
          <ul className="text-blue-300 space-y-2 text-sm">
            <li>• Clique em "Testar Modal" para abrir o popup de 3D Secure</li>
            <li>• O modal deve abrir em popup, não redirecionar a página</li>
            <li>• Teste fechar com ESC ou clique fora</li>
            <li>• Verifique se o estado da aplicação é mantido</li>
            <li>• Teste com URLs reais do Stripe em produção</li>
          </ul>
        </div>

        {/* Modal 3D Secure */}
        <ThreeDSecureModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          redirectUrl={testUrl}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </div>
    </div>
  );
};

export default ThreeDSecureTest;
