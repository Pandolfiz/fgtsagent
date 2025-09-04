import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para funcionalidades PWA
 */
const usePWA = (options = {}) => {
  const {
    enabled = true,
    onInstallPrompt = () => {},
    onUpdateAvailable = () => {},
    onOffline = () => {},
    onOnline = () => {}
  } = options;

  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [swRegistration, setSwRegistration] = useState(null);

  // Verificar se o app está instalado
  const checkIfInstalled = useCallback(() => {
    // Verificar se está rodando como PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInApp = window.navigator.standalone === true;
    
    setIsInstalled(isStandalone || isInApp);
  }, []);

  // Verificar se é instalável
  const checkIfInstallable = useCallback(() => {
    // Verificar se o navegador suporta PWA
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    
    if (!isSupported) {
      setIsInstallable(false);
      return;
    }

    // Verificar se já está instalado
    checkIfInstalled();
    
    if (isInstalled) {
      setIsInstallable(false);
      return;
    }

    // Verificar se atende aos critérios de instalação
    const hasManifest = document.querySelector('link[rel="manifest"]');
    const hasServiceWorker = 'serviceWorker' in navigator;
    const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';
    
    setIsInstallable(hasManifest && hasServiceWorker && isHTTPS);
  }, [isInstalled, checkIfInstalled]);

  // Instalar PWA
  const installPWA = useCallback(async () => {
    if (!deferredPrompt) {
      console.warn('Prompt de instalação não disponível');
      return false;
    }

    try {
      // Mostrar prompt de instalação
      deferredPrompt.prompt();
      
      // Aguardar resposta do usuário
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA instalado com sucesso');
        setIsInstalled(true);
        setIsInstallable(false);
        onInstallPrompt('accepted');
        return true;
      } else {
        console.log('Instalação do PWA recusada');
        onInstallPrompt('dismissed');
        return false;
      }
    } catch (error) {
      console.error('Erro ao instalar PWA:', error);
      onInstallPrompt('error');
      return false;
    } finally {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt, onInstallPrompt]);

  // Registrar Service Worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker não suportado');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado:', registration);
      
      setSwRegistration(registration);
      
      // Verificar atualizações
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setIsUpdateAvailable(true);
              onUpdateAvailable();
            }
          });
        }
      });
      
      return registration;
    } catch (error) {
      console.error('Erro ao registrar Service Worker:', error);
      return null;
    }
  }, [onUpdateAvailable]);

  // Atualizar PWA
  const updatePWA = useCallback(async () => {
    if (!swRegistration) {
      console.warn('Service Worker não registrado');
      return false;
    }

    try {
      await swRegistration.update();
      console.log('PWA atualizado com sucesso');
      setIsUpdateAvailable(false);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar PWA:', error);
      return false;
    }
  }, [swRegistration]);

  // Verificar status online/offline
  const handleOnline = useCallback(() => {
    setIsOnline(true);
    onOnline();
  }, [onOnline]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    onOffline();
  }, [onOffline]);

  // Solicitar notificações
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Notificações não suportadas');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Erro ao solicitar permissão de notificação:', error);
      return false;
    }
  }, []);

  // Enviar notificação
  const sendNotification = useCallback((title, options = {}) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      console.warn('Notificações não disponíveis');
      return false;
    }

    try {
      const notification = new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        ...options
      });
      
      return notification;
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      return false;
    }
  }, []);

  // Compartilhar conteúdo
  const shareContent = useCallback(async (data) => {
    if (!navigator.share) {
      console.warn('Web Share API não suportada');
      return false;
    }

    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Erro ao compartilhar:', error);
      }
      return false;
    }
  }, []);

  // Obter informações do dispositivo
  const getDeviceInfo = useCallback(() => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      onLine: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      maxTouchPoints: navigator.maxTouchPoints,
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      isInApp: window.navigator.standalone === true
    };
  }, []);

  // Efeito para verificar instalação
  useEffect(() => {
    if (!enabled) return;

    checkIfInstalled();
    checkIfInstallable();
  }, [enabled, checkIfInstalled, checkIfInstallable]);

  // Efeito para registrar Service Worker
  useEffect(() => {
    if (!enabled) return;

    registerServiceWorker();
  }, [enabled, registerServiceWorker]);

  // Efeito para eventos de instalação
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      console.log('PWA instalado');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [enabled]);

  // Efeito para eventos online/offline
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, handleOnline, handleOffline]);

  return {
    // Estado
    isInstallable,
    isInstalled,
    isOnline,
    isUpdateAvailable,
    swRegistration,
    
    // Funções
    installPWA,
    updatePWA,
    requestNotificationPermission,
    sendNotification,
    shareContent,
    getDeviceInfo,
    
    // Utilitários
    canInstall: isInstallable && !!deferredPrompt,
    canUpdate: isUpdateAvailable,
    isSupported: 'serviceWorker' in navigator && 'PushManager' in window
  };
};

export default usePWA;
