import { useCallback } from 'react';

/**
 * Hook personalizado para operações de clipboard
 * Suporta tanto a moderna Clipboard API quanto fallbacks para navegadores antigos
 */
export const useClipboard = () => {
  /**
   * Copia texto para o clipboard
   */
  const copyToClipboard = useCallback(async (text) => {
    try {
      // Tentar usar a moderna Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback para navegadores que não suportam Clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          document.body.removeChild(textArea);
          return true;
        } catch (err) {
          document.body.removeChild(textArea);
          return false;
        }
      }
    } catch (err) {
      console.warn('Erro ao copiar para clipboard:', err);
      return false;
    }
  }, []);

  /**
   * Lê texto do clipboard
   */
  const readFromClipboard = useCallback(async () => {
    try {
      // Tentar usar a moderna Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        return await navigator.clipboard.readText();
      } else {
        // Fallback: retornar string vazia para navegadores antigos
        // O usuário precisará usar Ctrl+V manualmente
        return '';
      }
    } catch (err) {
      console.warn('Erro ao ler do clipboard:', err);
      return '';
    }
  }, []);

  /**
   * Verifica se o clipboard é suportado
   */
  const isClipboardSupported = useCallback(() => {
    return !!(navigator.clipboard || document.queryCommandSupported?.('copy'));
  }, []);

  return {
    copyToClipboard,
    readFromClipboard,
    isClipboardSupported
  };
};
