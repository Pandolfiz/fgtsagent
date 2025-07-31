const logger = require('../utils/logger');

// Monitor de requisições para identificar excesso
class RequestMonitor {
  constructor() {
    this.requests = new Map();
    this.startTime = Date.now();
  }

  logRequest(method, url, ip, userAgent) {
    const key = `${method} ${url}`;
    const now = Date.now();
    
    if (!this.requests.has(key)) {
      this.requests.set(key, {
        count: 0,
        firstRequest: now,
        lastRequest: now,
        ips: new Set(),
        userAgents: new Set()
      });
    }
    
    const request = this.requests.get(key);
    request.count++;
    request.lastRequest = now;
    request.ips.add(ip);
    request.userAgents.add(userAgent);
    
    // Log se houver muitas requisições em pouco tempo
    const timeWindow = 60000; // 1 minuto
    const timeSinceFirst = now - request.firstRequest;
    
    if (timeSinceFirst <= timeWindow && request.count > 10) {
      logger.warn(`[MONITOR] Muitas requisições detectadas:`, {
        endpoint: key,
        count: request.count,
        timeWindow: `${Math.round(timeSinceFirst / 1000)}s`,
        requestsPerMinute: Math.round((request.count / timeSinceFirst) * 60000),
        ips: Array.from(request.ips),
        userAgents: Array.from(request.userAgents)
      });
    }
  }

  getStats() {
    const now = Date.now();
    const totalTime = now - this.startTime;
    
    const stats = {
      totalRequests: 0,
      endpoints: {},
      topEndpoints: [],
      timeWindow: `${Math.round(totalTime / 1000)}s`
    };
    
    for (const [endpoint, data] of this.requests) {
      const requestsPerMinute = Math.round((data.count / totalTime) * 60000);
      
      stats.totalRequests += data.count;
      stats.endpoints[endpoint] = {
        count: data.count,
        requestsPerMinute,
        ips: Array.from(data.ips),
        userAgents: Array.from(data.userAgents)
      };
      
      stats.topEndpoints.push({
        endpoint,
        count: data.count,
        requestsPerMinute
      });
    }
    
    // Ordenar por número de requisições
    stats.topEndpoints.sort((a, b) => b.count - a.count);
    
    return stats;
  }

  printStats() {
    const stats = this.getStats();
    
    logger.info('[MONITOR] Estatísticas de requisições:', {
      totalRequests: stats.totalRequests,
      timeWindow: stats.timeWindow,
      topEndpoints: stats.topEndpoints.slice(0, 5) // Top 5
    });
  }
}

// Instância global do monitor
const requestMonitor = new RequestMonitor();

// Middleware para monitorar requisições
function monitorRequest(req, res, next) {
  const startTime = Date.now();
  
  // Log da requisição
  requestMonitor.logRequest(
    req.method,
    req.url,
    req.ip,
    req.get('User-Agent')
  );
  
  // Interceptar o final da resposta
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log se a requisição demorou muito
    if (duration > 5000) { // 5 segundos
      logger.warn(`[MONITOR] Requisição lenta detectada:`, {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        status: res.statusCode
      });
    }
  });
  
  next();
}

// Função para imprimir estatísticas periodicamente
function startMonitoring() {
  // Imprimir estatísticas a cada 5 minutos
  setInterval(() => {
    requestMonitor.printStats();
  }, 300000); // 5 minutos
  
  logger.info('[MONITOR] Monitor de requisições iniciado');
}

module.exports = {
  requestMonitor,
  monitorRequest,
  startMonitoring
}; 

// Monitor de requisições para identificar excesso
class RequestMonitor {
  constructor() {
    this.requests = new Map();
    this.startTime = Date.now();
  }

  logRequest(method, url, ip, userAgent) {
    const key = `${method} ${url}`;
    const now = Date.now();
    
    if (!this.requests.has(key)) {
      this.requests.set(key, {
        count: 0,
        firstRequest: now,
        lastRequest: now,
        ips: new Set(),
        userAgents: new Set()
      });
    }
    
    const request = this.requests.get(key);
    request.count++;
    request.lastRequest = now;
    request.ips.add(ip);
    request.userAgents.add(userAgent);
    
    // Log se houver muitas requisições em pouco tempo
    const timeWindow = 60000; // 1 minuto
    const timeSinceFirst = now - request.firstRequest;
    
    if (timeSinceFirst <= timeWindow && request.count > 10) {
      logger.warn(`[MONITOR] Muitas requisições detectadas:`, {
        endpoint: key,
        count: request.count,
        timeWindow: `${Math.round(timeSinceFirst / 1000)}s`,
        requestsPerMinute: Math.round((request.count / timeSinceFirst) * 60000),
        ips: Array.from(request.ips),
        userAgents: Array.from(request.userAgents)
      });
    }
  }

  getStats() {
    const now = Date.now();
    const totalTime = now - this.startTime;
    
    const stats = {
      totalRequests: 0,
      endpoints: {},
      topEndpoints: [],
      timeWindow: `${Math.round(totalTime / 1000)}s`
    };
    
    for (const [endpoint, data] of this.requests) {
      const requestsPerMinute = Math.round((data.count / totalTime) * 60000);
      
      stats.totalRequests += data.count;
      stats.endpoints[endpoint] = {
        count: data.count,
        requestsPerMinute,
        ips: Array.from(data.ips),
        userAgents: Array.from(data.userAgents)
      };
      
      stats.topEndpoints.push({
        endpoint,
        count: data.count,
        requestsPerMinute
      });
    }
    
    // Ordenar por número de requisições
    stats.topEndpoints.sort((a, b) => b.count - a.count);
    
    return stats;
  }

  printStats() {
    const stats = this.getStats();
    
    logger.info('[MONITOR] Estatísticas de requisições:', {
      totalRequests: stats.totalRequests,
      timeWindow: stats.timeWindow,
      topEndpoints: stats.topEndpoints.slice(0, 5) // Top 5
    });
  }
}

// Instância global do monitor
const requestMonitor = new RequestMonitor();

// Middleware para monitorar requisições
function monitorRequest(req, res, next) {
  const startTime = Date.now();
  
  // Log da requisição
  requestMonitor.logRequest(
    req.method,
    req.url,
    req.ip,
    req.get('User-Agent')
  );
  
  // Interceptar o final da resposta
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log se a requisição demorou muito
    if (duration > 5000) { // 5 segundos
      logger.warn(`[MONITOR] Requisição lenta detectada:`, {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        status: res.statusCode
      });
    }
  });
  
  next();
}

// Função para imprimir estatísticas periodicamente
function startMonitoring() {
  // Imprimir estatísticas a cada 5 minutos
  setInterval(() => {
    requestMonitor.printStats();
  }, 300000); // 5 minutos
  
  logger.info('[MONITOR] Monitor de requisições iniciado');
}

module.exports = {
  requestMonitor,
  monitorRequest,
  startMonitoring
}; 