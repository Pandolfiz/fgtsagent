/**
 * Service Worker para cache offline e funcionalidades PWA
 */

const CACHE_NAME = 'chat-app-v1';
const STATIC_CACHE_NAME = 'chat-static-v1';
const DYNAMIC_CACHE_NAME = 'chat-dynamic-v1';

// Arquivos para cache estático
const STATIC_FILES = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico',
  '/offline.html'
];

// URLs da API para cache dinâmico
const API_PATTERNS = [
  /\/api\/messages/,
  /\/api\/contacts/,
  /\/api\/auth/,
  /\/api\/media/
];

// Estratégias de cache
const CACHE_STRATEGIES = {
  // Cache First - para arquivos estáticos
  CACHE_FIRST: 'cache-first',
  // Network First - para dados dinâmicos
  NETWORK_FIRST: 'network-first',
  // Stale While Revalidate - para recursos que podem ser atualizados
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando arquivos estáticos...');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('[SW] Service Worker instalado com sucesso');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Erro ao instalar Service Worker:', error);
      })
  );
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[SW] Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker ativado com sucesso');
        return self.clients.claim();
      })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requisições não-HTTP
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Estratégia baseada no tipo de requisição
  if (isStaticFile(request)) {
    event.respondWith(handleStaticFile(request));
  } else if (isApiRequest(request)) {
    event.respondWith(handleApiRequest(request));
  } else if (isMediaRequest(request)) {
    event.respondWith(handleMediaRequest(request));
  } else {
    event.respondWith(handleDefaultRequest(request));
  }
});

// Verificar se é arquivo estático
function isStaticFile(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

// Verificar se é requisição da API
function isApiRequest(request) {
  const url = new URL(request.url);
  return API_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// Verificar se é requisição de mídia
function isMediaRequest(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(mp4|mp3|wav|ogg|webm|avi|mov)$/);
}

// Lidar com arquivos estáticos (Cache First)
async function handleStaticFile(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Erro ao lidar com arquivo estático:', error);
    return new Response('Arquivo não encontrado', { status: 404 });
  }
}

// Lidar com requisições da API (Network First)
async function handleApiRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Rede indisponível, tentando cache...');
    
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Retornar resposta offline para APIs críticas
    if (request.url.includes('/api/messages') || request.url.includes('/api/contacts')) {
      return new Response(JSON.stringify({
        error: 'Offline',
        message: 'Você está offline. Alguns dados podem não estar atualizados.',
        offline: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Recurso não disponível offline', { status: 503 });
  }
}

// Lidar com requisições de mídia (Stale While Revalidate)
async function handleMediaRequest(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // Buscar na rede em paralelo
    const networkPromise = fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    }).catch(() => null);
    
    // Retornar cache imediatamente se disponível
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Aguardar resposta da rede
    const networkResponse = await networkPromise;
    if (networkResponse) {
      return networkResponse;
    }
    
    return new Response('Mídia não disponível', { status: 404 });
  } catch (error) {
    console.error('[SW] Erro ao lidar com mídia:', error);
    return new Response('Erro ao carregar mídia', { status: 500 });
  }
}

// Lidar com requisições padrão
async function handleDefaultRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Verificar se é uma página
    if (request.destination === 'document') {
      const cache = await caches.open(STATIC_CACHE_NAME);
      const offlinePage = await cache.match('/offline.html');
      return offlinePage || new Response('Página não disponível offline', { status: 503 });
    }
    
    return new Response('Recurso não disponível', { status: 503 });
  }
}

// Lidar com mensagens do cliente
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      cacheUrls(payload.urls);
      break;
      
    case 'CLEAR_CACHE':
      clearCache(payload.cacheName);
      break;
      
    case 'GET_CACHE_SIZE':
      getCacheSize().then(size => {
        event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
      });
      break;
      
    default:
      console.log('[SW] Mensagem desconhecida:', type);
  }
});

// Cachear URLs específicas
async function cacheUrls(urls) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const promises = urls.map(url => {
      return fetch(url).then(response => {
        if (response.ok) {
          return cache.put(url, response);
        }
      }).catch(error => {
        console.warn('[SW] Erro ao cachear URL:', url, error);
      });
    });
    
    await Promise.all(promises);
    console.log('[SW] URLs cacheadas com sucesso');
  } catch (error) {
    console.error('[SW] Erro ao cachear URLs:', error);
  }
}

// Limpar cache
async function clearCache(cacheName) {
  try {
    if (cacheName) {
      await caches.delete(cacheName);
    } else {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    console.log('[SW] Cache limpo com sucesso');
  } catch (error) {
    console.error('[SW] Erro ao limpar cache:', error);
  }
}

// Obter tamanho do cache
async function getCacheSize() {
  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('[SW] Erro ao calcular tamanho do cache:', error);
    return 0;
  }
}

// Sincronização em background
self.addEventListener('sync', (event) => {
  console.log('[SW] Sincronização em background:', event.tag);
  
  switch (event.tag) {
    case 'background-sync':
      event.waitUntil(doBackgroundSync());
      break;
      
    case 'message-sync':
      event.waitUntil(syncMessages());
      break;
      
    default:
      console.log('[SW] Tag de sincronização desconhecida:', event.tag);
  }
});

// Sincronização em background
async function doBackgroundSync() {
  try {
    console.log('[SW] Executando sincronização em background...');
    // Implementar lógica de sincronização
  } catch (error) {
    console.error('[SW] Erro na sincronização em background:', error);
  }
}

// Sincronizar mensagens
async function syncMessages() {
  try {
    console.log('[SW] Sincronizando mensagens...');
    // Implementar lógica de sincronização de mensagens
  } catch (error) {
    console.error('[SW] Erro na sincronização de mensagens:', error);
  }
}

// Notificações push
self.addEventListener('push', (event) => {
  console.log('[SW] Notificação push recebida');
  
  const options = {
    body: 'Nova mensagem recebida',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver mensagem',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icon-192x192.png'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.data = { ...options.data, ...data };
  }
  
  event.waitUntil(
    self.registration.showNotification('Chat App', options)
  );
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Clique em notificação:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('[SW] Service Worker carregado');
