// Controlador para sistema de mensagens
const messageService = require('../services/message');
const { AppError } = require('../utils/errors');

exports.getCampaigns = async (req, res, next) => {
  try {
    const { organizationId, status } = req.query;
    
    if (!organizationId) {
      throw new AppError('ID da organização é obrigatório', 400);
    }
    
    const campaigns = await messageService.getCampaignsByOrganization(
      organizationId,
      status,
      req.user.id
    );
    
    res.status(200).json({
      status: 'success',
      data: { campaigns }
    });
  } catch (error) {
    next(error);
  }
};

exports.createCampaign = async (req, res, next) => {
  try {
    const {
      name,
      description,
      organizationId,
      agentId,
      messageTemplate,
      variables
    } = req.body;
    
    if (!name || !organizationId || !agentId || !messageTemplate) {
      throw new AppError('Nome, organização, agente e template de mensagem são obrigatórios', 400);
    }
    
    const campaign = await messageService.createCampaign({
      name,
      description,
      organizationId,
      agentId,
      messageTemplate,
      variables: variables || {},
      userId: req.user.id
    });
    
    res.status(201).json({
      status: 'success',
      data: { campaign }
    });
  } catch (error) {
    next(error);
  }
};

exports.getCampaign = async (req, res, next) => {
  try {
    const campaign = await messageService.getCampaignById(
      req.params.id,
      req.user.id
    );
    
    res.status(200).json({
      status: 'success',
      data: { campaign }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCampaign = async (req, res, next) => {
  try {
    const {
      name,
      description,
      messageTemplate,
      variables
    } = req.body;
    
    const campaign = await messageService.updateCampaign(
      req.params.id,
      {
        name,
        description,
        messageTemplate,
        variables
      },
      req.user.id
    );
    
    res.status(200).json({
      status: 'success',
      data: { campaign }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCampaign = async (req, res, next) => {
  try {
    await messageService.deleteCampaign(
      req.params.id,
      req.user.id
    );
    
    res.status(200).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

exports.scheduleCampaign = async (req, res, next) => {
  try {
    const { scheduledAt } = req.body;
    
    const campaign = await messageService.scheduleCampaign(
      req.params.id,
      scheduledAt,
      req.user.id
    );
    
    res.status(200).json({
      status: 'success',
      data: { campaign }
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelCampaign = async (req, res, next) => {
  try {
    const campaign = await messageService.cancelCampaign(
      req.params.id,
      req.user.id
    );
    
    res.status(200).json({
      status: 'success',
      data: { campaign }
    });
  } catch (error) {
    next(error);
  }
};

exports.getCampaignRecipients = async (req, res, next) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    
    const recipients = await messageService.getCampaignRecipients(
      req.params.id,
      req.user.id,
      {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      }
    );
    
    res.status(200).json({
      status: 'success',
      data: { recipients }
    });
  } catch (error) {
    next(error);
  }
};

exports.addCampaignRecipients = async (req, res, next) => {
  try {
    const { recipients } = req.body;
    
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new AppError('Lista de destinatários é obrigatória', 400);
    }
    
    const result = await messageService.addCampaignRecipients(
      req.params.id,
      recipients,
      req.user.id
    );
    
    res.status(200).json({
      status: 'success',
      data: { 
        added: result.added,
        total: result.total
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.removeCampaignRecipient = async (req, res, next) => {
  try {
    await messageService.removeCampaignRecipient(
      req.params.id,
      req.params.recipientId,
      req.user.id
    );
    
    res.status(200).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

exports.getDirectMessages = async (req, res, next) => {
  try {
    const { organizationId, userIdentifier, page = 1, limit = 20 } = req.query;
    
    if (!organizationId) {
      throw new AppError('ID da organização é obrigatório', 400);
    }
    
    const messages = await messageService.getDirectMessages(
      organizationId,
      userIdentifier,
      req.user.id,
      {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      }
    );
    
    res.status(200).json({
      status: 'success',
      data: { messages }
    });
  } catch (error) {
    next(error);
  }
};

exports.sendDirectMessage = async (req, res, next) => {
  try {
    const {
      organizationId,
      agentId,
      userIdentifier,
      message,
      scheduledAt
    } = req.body;
    
    if (!organizationId || !agentId || !userIdentifier || !message) {
      throw new AppError('Organização, agente, destinatário e mensagem são obrigatórios', 400);
    }
    
    const result = await messageService.sendDirectMessage({
      organizationId,
      agentId,
      userIdentifier,
      message,
      scheduledAt,
      userId: req.user.id
    });
    
    res.status(200).json({
      status: 'success',
      data: { message: result }
    });
  } catch (error) {
    next(error);
  }
};