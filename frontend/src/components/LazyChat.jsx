import React, { Suspense, lazy } from 'react';
import { SkeletonLoader } from './SkeletonLoader';

// Lazy loading dos componentes principais do chat
const ChatOptimized = lazy(() => import('../pages/ChatOptimized'));
const MessageListOptimized = lazy(() => import('./MessageListOptimized'));
const ContactList = lazy(() => import('./ContactList'));
const MessageInputOptimized = lazy(() => import('./MessageInputOptimized'));

// Componente de fallback para loading
const ChatFallback = () => (
  <div className="h-screen flex flex-col bg-gray-50">
    {/* Header skeleton */}
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SkeletonLoader className="w-10 h-10 rounded-full" />
          <div>
            <SkeletonLoader className="w-32 h-4 mb-2" />
            <SkeletonLoader className="w-24 h-3" />
          </div>
        </div>
        <SkeletonLoader className="w-8 h-8 rounded" />
      </div>
    </div>

    {/* Main content skeleton */}
    <div className="flex-1 flex">
      {/* Sidebar skeleton */}
      <div className="w-80 bg-white border-r border-gray-200 p-4">
        <SkeletonLoader className="w-full h-10 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <SkeletonLoader className="w-12 h-12 rounded-full" />
              <div className="flex-1">
                <SkeletonLoader className="w-24 h-4 mb-1" />
                <SkeletonLoader className="w-32 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Messages skeleton */}
        <div className="flex-1 p-4 space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-xs lg:max-w-md ${i % 2 === 0 ? 'bg-gray-200' : 'bg-blue-500'} rounded-lg p-3`}>
                <SkeletonLoader className="w-48 h-4" />
              </div>
            </div>
          ))}
        </div>

        {/* Input skeleton */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-end space-x-3">
            <SkeletonLoader className="flex-1 h-10 rounded-lg" />
            <SkeletonLoader className="w-10 h-10 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Componente principal com lazy loading
const LazyChat = ({ ...props }) => {
  return (
    <Suspense fallback={<ChatFallback />}>
      <ChatOptimized {...props} />
    </Suspense>
  );
};

// Componentes individuais com lazy loading
export const LazyMessageList = ({ ...props }) => (
  <Suspense fallback={<SkeletonLoader className="h-64 w-full" />}>
    <MessageListOptimized {...props} />
  </Suspense>
);

export const LazyContactList = ({ ...props }) => (
  <Suspense fallback={<SkeletonLoader className="h-64 w-full" />}>
    <ContactList {...props} />
  </Suspense>
);

export const LazyMessageInput = ({ ...props }) => (
  <Suspense fallback={<SkeletonLoader className="h-16 w-full" />}>
    <MessageInputOptimized {...props} />
  </Suspense>
);

export default LazyChat;
