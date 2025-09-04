const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const { requireAuth } = require('../middleware/authMiddleware');

// GET /api/settings - Buscar configurações do usuário
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    logger.info(`[SETTINGS] Buscando configurações do usuário: ${userId}`);
    
    // Buscar configurações do usuário (pode ser uma tabela separada ou metadados)
    const { data: settings, error } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      logger.error(`[SETTINGS] Erro ao buscar configurações: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar configurações'
      });
    }
    
    // Configurações padrão se não existirem
    const defaultSettings = {
      language: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      notifications: {
        email: true,
        push: true,
        whatsapp: false
      },
      theme: 'dark',
      auto_sync: true,
      sync_interval: 30
    };
    
    const userSettings = settings ? {
      ...defaultSettings,
      ...settings.settings
    } : defaultSettings;
    
    return res.json({
      success: true,
      settings: userSettings
    });
    
  } catch (error) {
    logger.error(`[SETTINGS] Erro interno ao buscar configurações: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// PUT /api/settings - Atualizar configurações do usuário
router.put('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = req.body;
    
    logger.info(`[SETTINGS] Atualizando configurações do usuário: ${userId}`);
    
    // Validar configurações
    if (!settings) {
      return res.status(400).json({
        success: false,
        message: 'Configurações são obrigatórias'
      });
    }
    
    // Validar campos obrigatórios
    const requiredFields = ['language', 'timezone', 'notifications', 'theme', 'auto_sync', 'sync_interval'];
    for (const field of requiredFields) {
      if (settings[field] === undefined) {
        return res.status(400).json({
          success: false,
          message: `Campo obrigatório ausente: ${field}`
        });
      }
    }
    
    // Validar valores específicos
    if (!['pt-BR', 'en-US', 'es-ES'].includes(settings.language)) {
      return res.status(400).json({
        success: false,
        message: 'Idioma inválido'
      });
    }
    
    if (!['dark', 'light', 'auto'].includes(settings.theme)) {
      return res.status(400).json({
        success: false,
        message: 'Tema inválido'
      });
    }
    
    if (typeof settings.auto_sync !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'auto_sync deve ser um booleano'
      });
    }
    
    if (typeof settings.sync_interval !== 'number' || settings.sync_interval < 10 || settings.sync_interval > 300) {
      return res.status(400).json({
        success: false,
        message: 'sync_interval deve ser um número entre 10 e 300'
      });
    }
    
    // Validar notificações
    if (!settings.notifications || typeof settings.notifications !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'notifications deve ser um objeto'
      });
    }
    
    const notificationTypes = ['email', 'push', 'whatsapp'];
    for (const type of notificationTypes) {
      if (typeof settings.notifications[type] !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: `notifications.${type} deve ser um booleano`
        });
      }
    }
    
    // Criar ou atualizar configurações
    const { data: userSettings, error } = await supabaseAdmin
      .from('user_settings')
      .upsert({
        user_id: userId,
        settings: settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      logger.error(`[SETTINGS] Erro ao salvar configurações: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao salvar configurações'
      });
    }
    
    logger.info(`[SETTINGS] Configurações atualizadas com sucesso para usuário: ${userId}`);
    
    return res.json({
      success: true,
      settings: userSettings.settings,
      message: 'Configurações salvas com sucesso'
    });
    
  } catch (error) {
    logger.error(`[SETTINGS] Erro interno ao atualizar configurações: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/settings/notifications - Buscar configurações de notificação
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    logger.info(`[SETTINGS] Buscando configurações de notificação do usuário: ${userId}`);
    
    const { data: settings, error } = await supabaseAdmin
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      logger.error(`[SETTINGS] Erro ao buscar configurações de notificação: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar configurações de notificação'
      });
    }
    
    const defaultNotifications = {
      email: true,
      push: true,
      whatsapp: false
    };
    
    const notifications = settings ? 
      (settings.settings?.notifications || defaultNotifications) : 
      defaultNotifications;
    
    return res.json({
      success: true,
      notifications
    });
    
  } catch (error) {
    logger.error(`[SETTINGS] Erro interno ao buscar notificações: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// PUT /api/settings/notifications - Atualizar configurações de notificação
router.put('/notifications', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notifications } = req.body;
    
    logger.info(`[SETTINGS] Atualizando configurações de notificação do usuário: ${userId}`);
    
    if (!notifications || typeof notifications !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Configurações de notificação são obrigatórias'
      });
    }
    
    // Validar tipos de notificação
    const notificationTypes = ['email', 'push', 'whatsapp'];
    for (const type of notificationTypes) {
      if (typeof notifications[type] !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: `notifications.${type} deve ser um booleano`
        });
      }
    }
    
    // Buscar configurações atuais
    const { data: currentSettings, error: fetchError } = await supabaseAdmin
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      logger.error(`[SETTINGS] Erro ao buscar configurações atuais: ${fetchError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar configurações atuais'
      });
    }
    
    // Mesclar configurações
    const currentConfig = currentSettings?.settings || {};
    const updatedConfig = {
      ...currentConfig,
      notifications
    };
    
    // Salvar configurações atualizadas
    const { data: userSettings, error } = await supabaseAdmin
      .from('user_settings')
      .upsert({
        user_id: userId,
        settings: updatedConfig,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      logger.error(`[SETTINGS] Erro ao salvar configurações de notificação: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao salvar configurações de notificação'
      });
    }
    
    logger.info(`[SETTINGS] Configurações de notificação atualizadas com sucesso para usuário: ${userId}`);
    
    return res.json({
      success: true,
      notifications: userSettings.settings.notifications,
      message: 'Configurações de notificação salvas com sucesso'
    });
    
  } catch (error) {
    logger.error(`[SETTINGS] Erro interno ao atualizar notificações: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;