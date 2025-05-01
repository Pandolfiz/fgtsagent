/**
 * Classe utilitária para validação de dados
 */
class Validator {
  /**
   * Valida um objeto de acordo com um esquema de validação
   * @param {Object} data - Dados a serem validados
   * @param {Object} schema - Esquema de validação
   * @returns {Array} - Array de erros encontrados, vazio se não houver erros
   */
  validate(data, schema) {
    const errors = [];

    if (!data || typeof data !== 'object') {
      errors.push({ field: 'data', message: 'Dados inválidos' });
      return errors;
    }

    // Validar campos de acordo com o esquema
    for (const field in schema) {
      const rules = schema[field];
      const value = data[field];

      // Verificar campo obrigatório
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({ field, message: `O campo ${field} é obrigatório` });
        continue;
      }

      // Se o campo não é obrigatório e não foi enviado, pular validações adicionais
      if (!rules.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Validar tipo
      if (rules.type && !this.validateType(value, rules.type)) {
        errors.push({ field, message: `O campo ${field} deve ser do tipo ${rules.type}` });
      }

      // Validar tamanho mínimo
      if (rules.minLength !== undefined && !this.validateMinLength(value, rules.minLength)) {
        errors.push({ field, message: `O campo ${field} deve ter pelo menos ${rules.minLength} caracteres` });
      }

      // Validar tamanho máximo
      if (rules.maxLength !== undefined && !this.validateMaxLength(value, rules.maxLength)) {
        errors.push({ field, message: `O campo ${field} deve ter no máximo ${rules.maxLength} caracteres` });
      }

      // Validar padrão (regex)
      if (rules.pattern && !this.validatePattern(value, rules.pattern)) {
        errors.push({ field, message: rules.patternMessage || `O campo ${field} não atende ao padrão exigido` });
      }

      // Validar valor mínimo
      if (rules.min !== undefined && !this.validateMin(value, rules.min)) {
        errors.push({ field, message: `O campo ${field} deve ser maior ou igual a ${rules.min}` });
      }

      // Validar valor máximo
      if (rules.max !== undefined && !this.validateMax(value, rules.max)) {
        errors.push({ field, message: `O campo ${field} deve ser menor ou igual a ${rules.max}` });
      }

      // Validar e-mail
      if (rules.isEmail && !this.validateEmail(value)) {
        errors.push({ field, message: `O campo ${field} deve ser um e-mail válido` });
      }

      // Validar array
      if (rules.isArray && !Array.isArray(value)) {
        errors.push({ field, message: `O campo ${field} deve ser um array` });
      }

      // Validar valores enumerados
      if (rules.enum && !this.validateEnum(value, rules.enum)) {
        errors.push({ field, message: `O campo ${field} deve ser um dos seguintes valores: ${rules.enum.join(', ')}` });
      }
    }

    return errors;
  }

  /**
   * Valida o tipo de um valor
   * @param {*} value - Valor a ser validado
   * @param {string} type - Tipo esperado
   * @returns {boolean} - Indicador de validação
   */
  validateType(value, type) {
    switch (type.toLowerCase()) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      case 'date':
        return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
      default:
        return true;
    }
  }

  /**
   * Valida o comprimento mínimo de uma string
   * @param {string} value - Valor a ser validado
   * @param {number} minLength - Comprimento mínimo exigido
   * @returns {boolean} - Indicador de validação
   */
  validateMinLength(value, minLength) {
    if (typeof value !== 'string') return false;
    return value.length >= minLength;
  }

  /**
   * Valida o comprimento máximo de uma string
   * @param {string} value - Valor a ser validado
   * @param {number} maxLength - Comprimento máximo permitido
   * @returns {boolean} - Indicador de validação
   */
  validateMaxLength(value, maxLength) {
    if (typeof value !== 'string') return false;
    return value.length <= maxLength;
  }

  /**
   * Valida um valor contra uma expressão regular
   * @param {string} value - Valor a ser validado
   * @param {RegExp|string} pattern - Padrão de validação
   * @returns {boolean} - Indicador de validação
   */
  validatePattern(value, pattern) {
    if (typeof value !== 'string') return false;
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    return regex.test(value);
  }

  /**
   * Valida o valor mínimo de um número
   * @param {number} value - Valor a ser validado
   * @param {number} min - Valor mínimo permitido
   * @returns {boolean} - Indicador de validação
   */
  validateMin(value, min) {
    if (typeof value !== 'number') return false;
    return value >= min;
  }

  /**
   * Valida o valor máximo de um número
   * @param {number} value - Valor a ser validado
   * @param {number} max - Valor máximo permitido
   * @returns {boolean} - Indicador de validação
   */
  validateMax(value, max) {
    if (typeof value !== 'number') return false;
    return value <= max;
  }

  /**
   * Valida um endereço de e-mail
   * @param {string} value - Valor a ser validado
   * @returns {boolean} - Indicador de validação
   */
  validateEmail(value) {
    if (typeof value !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  /**
   * Valida se um valor está entre os valores permitidos
   * @param {*} value - Valor a ser validado
   * @param {Array} enumValues - Lista de valores permitidos
   * @returns {boolean} - Indicador de validação
   */
  validateEnum(value, enumValues) {
    return enumValues.includes(value);
  }
}

module.exports = new Validator(); 