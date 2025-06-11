/**
 * Middleware para validação de dados de requisição
 */
const Joi = require('joi');
const xss = require('xss');
const logger = require('../utils/logger');

/**
 * Configurações de sanitização XSS
 */
const xssOptions = {
  whiteList: {
    // Permitir apenas tags básicas e seguras
    p: [],
    br: [],
    strong: [],
    em: [],
    u: [],
    b: [],
    i: [],
    span: [],
    div: [],
    h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
    ul: [], ol: [], li: [],
    a: ['href', 'title', 'target'],
    img: ['src', 'alt', 'width', 'height']
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
  allowCommentTag: false,
  css: false // Desabilitar CSS inline
};

/**
 * Schemas de validação comuns
 */
const commonSchemas = {
  // Validação de ID (UUID ou número)
  id: Joi.alternatives().try(
    Joi.string().uuid({ version: ['uuidv4'] }),
    Joi.number().integer().positive()
  ).required(),

  // Validação de email
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(254)
    .required(),

  // Validação de senha forte
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.pattern.base': 'A senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial'
    }),

  // Validação de telefone brasileiro
  phone: Joi.string()
    .pattern(/^(?:\+55\s?)?(?:\([1-9][1-9]\)\s?|[1-9][1-9]\s?)?(?:9\s?)?[0-9]{4}-?[0-9]{4}$/)
    .messages({
      'string.pattern.base': 'Telefone deve estar no formato brasileiro válido'
    }),

  // Validação de CPF
  cpf: Joi.string()
    .pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/)
    .custom((value, helpers) => {
      const cpf = value.replace(/[^\d]/g, '');
      if (!isValidCPF(cpf)) {
        return helpers.error('any.invalid');
      }
      return cpf;
    })
    .messages({
      'any.invalid': 'CPF inválido'
    }),

  // Validação de texto livre (com limite de caracteres)
  text: (maxLength = 1000) => Joi.string()
    .max(maxLength)
    .custom((value, helpers) => {
      // Sanitizar XSS
      const sanitized = xss(value, xssOptions);
      return sanitized;
    }),

  // Validação de URL
  url: Joi.string()
    .uri({
      scheme: ['http', 'https'],
      allowRelative: false
    })
    .max(2083),

  // Validação de paginação
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().max(50),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
  })
};

/**
 * Valida CPF brasileiro
 */
function isValidCPF(cpf) {
  if (cpf.length !== 11 || /^(.)\1{10}$/.test(cpf)) {
    return false;
  }

  let sum = 0;
  let remainder;

  // Validate first digit
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;

  sum = 0;

  // Validate second digit
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

/**
 * Middleware de validação genérico
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Erro de validação', {
        requestId: req.requestId,
        url: req.url,
        method: req.method,
        property,
        errors,
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors
      });
    }

    // Substituir dados originais pelos validados e sanitizados
    req[property] = value;
    next();
  };
}

/**
 * Schemas específicos para rotas
 */
const schemas = {
  // Autenticação
  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().min(1).max(128).required(), // Menos restritivo para login
    rememberMe: Joi.boolean().default(false)
  }),

  register: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Confirmação de senha deve ser igual à senha'
    }),
    name: commonSchemas.text(100).required(),
    phone: commonSchemas.phone.optional(),
    acceptTerms: Joi.boolean().valid(true).required().messages({
      'any.only': 'Você deve aceitar os termos de uso'
    })
  }),

  // Perfil do usuário
  updateProfile: Joi.object({
    name: commonSchemas.text(100).optional(),
    phone: commonSchemas.phone.optional(),
    bio: commonSchemas.text(500).optional(),
    avatar: commonSchemas.url.optional()
  }),

  // Chat e mensagens
  sendMessage: Joi.object({
    content: commonSchemas.text(4000).required(),
    recipientId: commonSchemas.id,
    type: Joi.string().valid('text', 'image', 'file', 'audio').default('text'),
    metadata: Joi.object().optional()
  }),

  // Configurações do WhatsApp
  whatsappConfig: Joi.object({
    instanceName: Joi.string().alphanum().min(3).max(50).required(),
    token: Joi.string().min(10).max(200).required(),
    webhook: commonSchemas.url.optional(),
    qrcode: Joi.boolean().default(true),
    markMessagesRead: Joi.boolean().default(true),
    delayMessage: Joi.number().integer().min(0).max(5000).default(1000)
  }),

  // Parâmetros de query para listagem
  listUsers: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().max(50).optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
    search: Joi.string().max(100).optional(),
    status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
    role: Joi.string().valid('user', 'admin', 'moderator').optional()
  }),

  // Parâmetros de rota
  userParams: Joi.object({
    id: commonSchemas.id
  }),

  // Webhook do Evolution API
  evolutionWebhook: Joi.object({
    event: Joi.string().required(),
    instance: Joi.string().required(),
    data: Joi.object().required(),
    timestamp: Joi.number().optional(),
    server_url: commonSchemas.url.optional()
  }),

  // Reset de senha
  resetPassword: Joi.object({
    email: commonSchemas.email
  }),

  confirmResetPassword: Joi.object({
    token: Joi.string().min(1).required(),
    password: commonSchemas.password,
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
  }),

  // Contatos
  createContact: Joi.object({
    name: commonSchemas.text(100).required(),
    phone: commonSchemas.phone.required(),
    email: commonSchemas.email.optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    notes: commonSchemas.text(1000).optional()
  }),

  updateContact: Joi.object({
    name: commonSchemas.text(100).optional(),
    phone: commonSchemas.phone.optional(),
    email: commonSchemas.email.optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    notes: commonSchemas.text(1000).optional()
  })
};

/**
 * Middleware de sanitização de dados de entrada
 */
function sanitizeInput(req, res, next) {
  // Sanitizar strings em todos os objetos de entrada
  function sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Aplicar sanitização XSS básica
        sanitized[key] = xss(value.trim(), xssOptions);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  // Sanitizar body, query e params
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
}

/**
 * Middleware para validar rate limiting por IP
 */
function validateRateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  const requests = new Map();

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Limpar registros antigos
    for (const [key, timestamps] of requests.entries()) {
      const validTimestamps = timestamps.filter(time => time > windowStart);
      if (validTimestamps.length === 0) {
        requests.delete(key);
      } else {
        requests.set(key, validTimestamps);
      }
    }

    // Verificar limite para este IP
    const ipRequests = requests.get(ip) || [];
    if (ipRequests.length >= maxRequests) {
      logger.warn('Rate limit excedido', {
        ip,
        requests: ipRequests.length,
        window: windowMs / 1000 + 's'
      });

      return res.status(429).json({
        success: false,
        message: 'Muitas requisições. Tente novamente em alguns minutos.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Adicionar esta requisição
    ipRequests.push(now);
    requests.set(ip, ipRequests);

    next();
  };
}

module.exports = {
  validate,
  schemas,
  commonSchemas,
  sanitizeInput,
  validateRateLimit,
  isValidCPF
}; 