// Controlador de feedback
const { supabaseAdmin } = require('../config/supabase');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Criar um novo feedback
 */
const createFeedback = async (req, res, next) => {
  try {
    const { category, message, url, user_agent } = req.body;
    const userId = req.user?.id;

    // Validações
    if (!category || !message) {
      throw new AppError('Categoria e mensagem são obrigatórios', 400);
    }

    if (!['feature', 'bug'].includes(category)) {
      throw new AppError('Categoria deve ser "feature" ou "bug"', 400);
    }

    if (message.length < 10 || message.length > 1000) {
      throw new AppError('Mensagem deve ter entre 10 e 1000 caracteres', 400);
    }

    // Preparar dados para inserção
    const feedbackData = {
      user_id: userId,
      category,
      message: message.trim(),
      url: url || null,
      user_agent: user_agent || null,
      status: 'pending',
      priority: 'medium'
    };

    // Inserir no banco de dados
    const { data, error } = await supabaseAdmin
      .from('feedback')
      .insert([feedbackData])
      .select()
      .single();

    if (error) {
      logger.error('Erro ao criar feedback:', error);
      throw new AppError('Erro interno do servidor', 500);
    }

    logger.info(`Novo feedback criado: ${data.id} - ${category} por usuário ${userId || 'anônimo'}`);

    res.status(201).json({
      status: 'success',
      message: 'Feedback enviado com sucesso',
      data: {
        id: data.id,
        category: data.category,
        status: data.status
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Listar feedbacks (apenas para administradores)
 */
const listFeedbacks = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, category, priority } = req.query;
    const offset = (page - 1) * limit;

    // Construir query
    let query = supabaseAdmin
      .from('feedback')
      .select(`
        id,
        category,
        message,
        status,
        priority,
        url,
        user_agent,
        admin_notes,
        assigned_to,
        created_at,
        updated_at,
        user_profiles!feedback_user_id_fkey (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data: feedbacks, error, count } = await query;

    if (error) {
      logger.error('Erro ao listar feedbacks:', error);
      throw new AppError('Erro interno do servidor', 500);
    }

    res.json({
      status: 'success',
      data: {
        feedbacks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Atualizar status de feedback (apenas para administradores)
 */
const updateFeedbackStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, admin_notes, priority, assigned_to } = req.body;
    const adminId = req.user?.id;

    // Validações
    if (!id) {
      throw new AppError('ID do feedback é obrigatório', 400);
    }

    const validStatuses = ['pending', 'in_review', 'completed', 'rejected'];
    if (status && !validStatuses.includes(status)) {
      throw new AppError('Status inválido', 400);
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      throw new AppError('Prioridade inválida', 400);
    }

    // Preparar dados para atualização
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (status) updateData.status = status;
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes;
    if (priority) updateData.priority = priority;
    if (assigned_to) updateData.assigned_to = assigned_to;

    // Atualizar no banco de dados
    const { data, error } = await supabaseAdmin
      .from('feedback')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Erro ao atualizar feedback:', error);
      throw new AppError('Erro interno do servidor', 500);
    }

    if (!data) {
      throw new AppError('Feedback não encontrado', 404);
    }

    logger.info(`Feedback ${id} atualizado por admin ${adminId}`);

    res.json({
      status: 'success',
      message: 'Feedback atualizado com sucesso',
      data
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obter estatísticas de feedback (apenas para administradores)
 */
const getFeedbackStats = async (req, res, next) => {
  try {
    // Contar por status
    const { data: statusStats, error: statusError } = await supabaseAdmin
      .from('feedback')
      .select('status')
      .then(result => {
        if (result.error) throw result.error;
        const stats = result.data.reduce((acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        }, {});
        return { data: stats, error: null };
      });

    if (statusError) {
      throw statusError;
    }

    // Contar por categoria
    const { data: categoryStats, error: categoryError } = await supabaseAdmin
      .from('feedback')
      .select('category')
      .then(result => {
        if (result.error) throw result.error;
        const stats = result.data.reduce((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        }, {});
        return { data: stats, error: null };
      });

    if (categoryError) {
      throw categoryError;
    }

    // Contar por prioridade
    const { data: priorityStats, error: priorityError } = await supabaseAdmin
      .from('feedback')
      .select('priority')
      .then(result => {
        if (result.error) throw result.error;
        const stats = result.data.reduce((acc, item) => {
          acc[item.priority] = (acc[item.priority] || 0) + 1;
          return acc;
        }, {});
        return { data: stats, error: null };
      });

    if (priorityError) {
      throw priorityError;
    }

    // Total de feedbacks
    const { count: totalFeedbacks, error: totalError } = await supabaseAdmin
      .from('feedback')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      throw totalError;
    }

    res.json({
      status: 'success',
      data: {
        total: totalFeedbacks,
        byStatus: statusStats,
        byCategory: categoryStats,
        byPriority: priorityStats
      }
    });

  } catch (error) {
    logger.error('Erro ao obter estatísticas de feedback:', error);
    next(error);
  }
};

module.exports = {
  createFeedback,
  listFeedbacks,
  updateFeedbackStatus,
  getFeedbackStats
};
