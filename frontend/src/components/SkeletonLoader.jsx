import React from 'react';

// Componente de skeleton para mensagens
const MessageSkeleton = React.memo(() => (
  <div className="flex mb-3 animate-pulse">
    <div className="flex flex-col">
      {/* Avatar skeleton */}
      <div className="w-8 h-8 bg-gray-300 rounded-full mb-2" />
      
      {/* Bolha da mensagem skeleton */}
      <div className="bg-gray-300 rounded-lg px-4 py-2 max-w-xs">
        <div className="h-4 bg-gray-400 rounded w-32 mb-2" />
        <div className="h-3 bg-gray-400 rounded w-24" />
      </div>
      
      {/* Timestamp skeleton */}
      <div className="h-3 bg-gray-300 rounded w-16 mt-1" />
    </div>
  </div>
));

// Componente de skeleton para contatos
const ContactSkeleton = React.memo(() => (
  <div className="flex items-center gap-3 p-3 animate-pulse">
    {/* Avatar skeleton */}
    <div className="w-10 h-10 bg-gray-300 rounded-full" />
    
    {/* Informações skeleton */}
    <div className="flex-1">
      <div className="h-4 bg-gray-300 rounded w-24 mb-2" />
      <div className="h-3 bg-gray-300 rounded w-32" />
    </div>
    
    {/* Status skeleton */}
    <div className="w-16 h-4 bg-gray-300 rounded" />
  </div>
));

// Componente de skeleton para cabeçalho
const HeaderSkeleton = React.memo(() => (
  <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-gray-300 rounded-full" />
      <div>
        <div className="h-5 bg-gray-300 rounded w-24 mb-1" />
        <div className="h-3 bg-gray-300 rounded w-16" />
      </div>
    </div>
    <div className="flex gap-2">
      <div className="w-8 h-8 bg-gray-300 rounded-full" />
      <div className="w-8 h-8 bg-gray-300 rounded-full" />
      <div className="w-8 h-8 bg-gray-300 rounded-full" />
    </div>
  </div>
));

// Componente de skeleton para input
const InputSkeleton = React.memo(() => (
  <div className="bg-white border-t border-gray-200 p-4 animate-pulse">
    <div className="flex items-end gap-3">
      <div className="w-8 h-8 bg-gray-300 rounded-full" />
      <div className="flex-1">
        <div className="h-12 bg-gray-300 rounded-lg" />
      </div>
      <div className="w-8 h-8 bg-gray-300 rounded-full" />
      <div className="w-12 h-12 bg-gray-300 rounded-full" />
    </div>
  </div>
));

// Componente principal de skeleton loader
const SkeletonLoader = React.memo(({ 
  type = 'message', 
  count = 1, 
  className = '' 
}) => {
  // Função para renderizar o skeleton baseado no tipo
  const renderSkeleton = () => {
    switch (type) {
      case 'message':
        return Array.from({ length: count }, (_, index) => (
          <MessageSkeleton key={index} />
        ));
      case 'contact':
        return Array.from({ length: count }, (_, index) => (
          <ContactSkeleton key={index} />
        ));
      case 'header':
        return <HeaderSkeleton />;
      case 'input':
        return <InputSkeleton />;
      default:
        return <MessageSkeleton />;
    }
  };

  return (
    <div className={className}>
      {renderSkeleton()}
    </div>
  );
});

// Adicionar displayName para debugging
SkeletonLoader.displayName = 'SkeletonLoader';
MessageSkeleton.displayName = 'MessageSkeleton';
ContactSkeleton.displayName = 'ContactSkeleton';
HeaderSkeleton.displayName = 'HeaderSkeleton';
InputSkeleton.displayName = 'InputSkeleton';

export default SkeletonLoader;
