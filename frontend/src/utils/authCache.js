// Cache de autenticação para evitar múltiplas chamadas simultâneas
class AuthCache {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
  }

  // Gerar chave única para a requisição
  getCacheKey(url, headers = {}) {
    const authHeader = headers.Authorization || '';
    return `${url}_${authHeader.substring(0, 20)}`;
  }

  // Verificar se há uma requisição pendente
  hasPendingRequest(key) {
    return this.pendingRequests.has(key);
  }

  // Adicionar requisição pendente
  addPendingRequest(key, promise) {
    this.pendingRequests.set(key, promise);

    // Limpar quando a requisição for resolvida
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });
  }

  // Obter requisição pendente
  getPendingRequest(key) {
    return this.pendingRequests.get(key);
  }

  // Verificar se há cache válido
  hasValidCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;

    const now = Date.now();
    return (now - cached.timestamp) < this.cacheTimeout;
  }

  // Obter dados do cache
  getCache(key) {
    const cached = this.cache.get(key);
    return cached ? cached.data : null;
  }

  // Armazenar dados no cache
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Limpar cache expirado
  cleanup() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if ((now - cached.timestamp) >= this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  // Limpar todo o cache
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

// Instância global do cache
const authCache = new AuthCache();

// Função para fazer requisição com cache
export async function cachedFetch(url, options = {}) {
  const key = authCache.getCacheKey(url, options.headers);

  // Verificar se há uma requisição pendente
  if (authCache.hasPendingRequest(key)) {
    console.log('[AuthCache] Aguardando requisição pendente para:', url);
    return authCache.getPendingRequest(key);
  }

  // Verificar se há cache válido
  if (authCache.hasValidCache(key)) {
    console.log('[AuthCache] Usando cache para:', url);
    return authCache.getCache(key);
  }

  // Fazer nova requisição
  console.log('[AuthCache] Fazendo nova requisição para:', url);
  const promise = fetch(url, options).then(async (response) => {
    if (response.ok) {
      const data = await response.json();
      authCache.setCache(key, data);
      return data;
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  });

  // Adicionar à lista de requisições pendentes
  authCache.addPendingRequest(key, promise);

  return promise;
}

// Limpar cache periodicamente
setInterval(() => {
  authCache.cleanup();
}, 60000); // A cada minuto

export default authCache;