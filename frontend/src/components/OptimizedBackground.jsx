import React from 'react';

// Componente de fundo ultra-otimizado - SEM animações
export default function OptimizedBackground() {
  return (
    <div 
      className="fixed inset-0 w-full h-full z-[-10] pointer-events-none"
      style={{
        background: 'linear-gradient(135deg, #0c4a6e 0%, #0f172a 25%, #1e293b 50%, #0c4a6e 75%, #0f172a 100%)',
        // Removido: backgroundSize, animation, willChange
      }}
      aria-hidden="true" 
    />
  );
}
