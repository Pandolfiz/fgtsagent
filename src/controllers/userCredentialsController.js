/**
 * Controlador para gerenciar credenciais de usuários (API keys)
 */
const userCredentialsService = require('../services/userCredentialsService');
const logger = require('../utils/logger');

/**
 * Lista todas as chaves de API do usuário autenticado
 */
exports.listUserApiKeys = async (req, res) => {
  try {
    const userId = req.user.id;
    
    logger.info(`Listando chaves de API para usuário ${userId}`);
    
    const apiKeys = await userCredentialsService.listApiKeys(userId);
    
    return res.status(200).json({
      success: true,
      message: 'Chaves de API recuperadas com sucesso',
      data: apiKeys
    });
  } catch (error) {
    logger.error(`Erro ao listar chaves de API: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao listar chaves de API'
    });
  }
};

/**
 * Cria uma nova chave de API para o usuário autenticado
 */
exports.createUserApiKey = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, expiresInDays } = req.body;
    
    // Validar dados da entrada
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Nome da chave de API é obrigatório'
      });
    }
    
    if (name.length < 3 || name.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Nome da chave deve ter entre 3 e 100 caracteres'
      });
    }
    
    // Verificar limitação de dias
    const daysLimit = parseInt(expiresInDays) || 365;
    if (daysLimit < 1 || daysLimit > 3650) {
      return res.status(400).json({
        success: false,
        message: 'Prazo de validade deve estar entre 1 dia e 10 anos'
      });
    }
    
    logger.info(`Criando nova chave de API para usuário ${userId}: ${name}`);
    
    // Criar a nova chave
    const newApiKey = await userCredentialsService.generateApiKey(userId, name, daysLimit);
    
    return res.status(201).json({
      success: true,
      message: 'Chave de API criada com sucesso',
      data: newApiKey
    });
  } catch (error) {
    logger.error(`Erro ao criar chave de API: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao criar chave de API'
    });
  }
};

/**
 * Revoga (desativa) uma chave de API do usuário autenticado
 */
exports.revokeUserApiKey = async (req, res) => {
  try {
    const userId = req.user.id;
    const keyId = req.params.id;
    
    if (!keyId) {
      return res.status(400).json({
        success: false,
        message: 'ID da chave é obrigatório'
      });
    }
    
    logger.info(`Revogando chave de API ${keyId} para usuário ${userId}`);
    
    const result = await userCredentialsService.revokeApiKey(keyId, userId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Chave não encontrada ou você não tem permissão para revogá-la'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Chave de API revogada com sucesso'
    });
  } catch (error) {
    logger.error(`Erro ao revogar chave de API: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao revogar chave de API'
    });
  }
};

/**
 * Atualiza o nome de uma chave de API do usuário autenticado
 */
exports.updateUserApiKeyName = async (req, res) => {
  try {
    const userId = req.user.id;
    const keyId = req.params.id;
    const { name } = req.body;
    
    // Validar dados da entrada
    if (!keyId) {
      return res.status(400).json({
        success: false,
        message: 'ID da chave é obrigatório'
      });
    }
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Novo nome da chave é obrigatório'
      });
    }
    
    if (name.length < 3 || name.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Nome da chave deve ter entre 3 e 100 caracteres'
      });
    }
    
    logger.info(`Atualizando nome da chave de API ${keyId} para usuário ${userId}`);
    
    // Atualizar o nome da chave
    const updatedKey = await userCredentialsService.updateApiKeyName(keyId, name, userId);
    
    return res.status(200).json({
      success: true,
      message: 'Nome da chave de API atualizado com sucesso',
      data: updatedKey
    });
  } catch (error) {
    logger.error(`Erro ao atualizar nome da chave de API: ${error.message}`);
    
    if (error.message.includes('não encontrada') || error.message.includes('acesso negado')) {
      return res.status(404).json({
        success: false,
        message: 'Chave não encontrada ou você não tem permissão para modificá-la'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao atualizar nome da chave de API'
    });
  }
}; 