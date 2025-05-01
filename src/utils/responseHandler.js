/**
 * Utilitário para padronizar as respostas HTTP da API
 */
const responseHandler = {
  /**
   * Resposta de sucesso (200 OK)
   * @param {Object} res - Objeto de resposta Express
   * @param {string} message - Mensagem de sucesso
   * @param {*} [data=null] - Dados a serem retornados
   * @returns {Object} - Resposta JSON padronizada
   */
  success: (res, message, data = null) => {
    return res.status(200).json({
      success: true,
      message,
      data
    });
  },

  /**
   * Resposta de criação com sucesso (201 Created)
   * @param {Object} res - Objeto de resposta Express
   * @param {string} message - Mensagem de sucesso
   * @param {*} [data=null] - Dados do recurso criado
   * @returns {Object} - Resposta JSON padronizada
   */
  created: (res, message, data = null) => {
    return res.status(201).json({
      success: true,
      message,
      data
    });
  },

  /**
   * Resposta de erro de solicitação inválida (400 Bad Request)
   * @param {Object} res - Objeto de resposta Express
   * @param {string} message - Mensagem de erro
   * @param {Array|Object} [errors=null] - Detalhes dos erros de validação
   * @returns {Object} - Resposta JSON padronizada
   */
  badRequest: (res, message, errors = null) => {
    return res.status(400).json({
      success: false,
      message,
      errors
    });
  },

  /**
   * Resposta de erro de autenticação (401 Unauthorized)
   * @param {Object} res - Objeto de resposta Express
   * @param {string} message - Mensagem de erro
   * @returns {Object} - Resposta JSON padronizada
   */
  unauthorized: (res, message = 'Não autorizado') => {
    return res.status(401).json({
      success: false,
      message
    });
  },

  /**
   * Resposta de erro de acesso proibido (403 Forbidden)
   * @param {Object} res - Objeto de resposta Express
   * @param {string} message - Mensagem de erro
   * @returns {Object} - Resposta JSON padronizada
   */
  forbidden: (res, message = 'Acesso proibido') => {
    return res.status(403).json({
      success: false,
      message
    });
  },

  /**
   * Resposta de erro de recurso não encontrado (404 Not Found)
   * @param {Object} res - Objeto de resposta Express
   * @param {string} message - Mensagem de erro
   * @returns {Object} - Resposta JSON padronizada
   */
  notFound: (res, message = 'Recurso não encontrado') => {
    return res.status(404).json({
      success: false,
      message
    });
  },

  /**
   * Resposta de erro do servidor (500 Internal Server Error)
   * @param {Object} res - Objeto de resposta Express
   * @param {string} message - Mensagem de erro
   * @returns {Object} - Resposta JSON padronizada
   */
  serverError: (res, message = 'Erro interno do servidor') => {
    return res.status(500).json({
      success: false,
      message
    });
  }
};

module.exports = { responseHandler }; 