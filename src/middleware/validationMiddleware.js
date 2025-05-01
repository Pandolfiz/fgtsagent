/**
 * Middleware para validação de dados de requisição
 */
const validator = require('../utils/validator');
const logger = require('../utils/logger');

/**
 * Cria um middleware de validação para uma entidade específica
 * @param {Object} schema - Esquema de validação para a entidade
 * @param {String} source - Fonte dos dados (body, query, params) - default: body
 * @returns {Function} - Middleware de Express
 */
function validateRequest(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = req[source];
      
      // Executar validação
      const errors = validator.validate(data, schema);

      // Se houver erros, retornar resposta de erro
      if (errors && errors.length > 0) {
        logger.warn(`Erro de validação: ${JSON.stringify(errors)}`);
        
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors
        });
      }

      // Se não houver erros, continuar
      next();
    } catch (error) {
      logger.error(`Erro no middleware de validação: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao validar dados'
      });
    }
  };
}

/**
 * Esquemas de validação pré-definidos
 */
const schemas = {
  // Autenticação
  login: {
    email: {
      required: true,
      type: 'string',
      isEmail: true
    },
    password: {
      required: true,
      type: 'string',
      minLength: 6
    }
  },
  
  signup: {
    name: {
      required: true,
      type: 'string',
      minLength: 3,
      maxLength: 200
    },
    email: {
      required: true,
      type: 'string',
      isEmail: true
    },
    password: {
      required: true,
      type: 'string',
      minLength: 8
    }
  },
  
  resetPassword: {
    email: {
      required: true,
      type: 'string',
      isEmail: true
    }
  },
  
  resetPasswordConfirm: {
    token: {
      required: true,
      type: 'string'
    },
    password: {
      required: true,
      type: 'string',
      minLength: 8,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      patternMessage: 'A senha deve conter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais'
    }
  },
  
  // Organização
  createOrganization: {
    name: {
      required: true,
      type: 'string',
      minLength: 3,
      maxLength: 100
    },
    slug: {
      required: false,
      type: 'string',
      pattern: /^[a-z0-9-]+$/,
      patternMessage: 'O slug deve conter apenas letras minúsculas, números e hífens'
    }
  },
  
  // Agente
  createAgent: {
    name: {
      required: true,
      type: 'string',
      minLength: 3,
      maxLength: 100
    },
    description: {
      required: false,
      type: 'string',
      maxLength: 500
    },
    template_id: {
      required: true,
      type: 'string'
    },
    organization_id: {
      required: true,
      type: 'string'
    }
  }
};

module.exports = {
  validateRequest,
  schemas
}; 