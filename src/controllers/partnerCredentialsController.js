// Controlador para gerenciar credenciais de parceiros
const partnerCredentialsService = require('../services/partnerCredentialsService');
const logger = require('../utils/logger');

/** Lista credenciais do usuário */
exports.list = async (req, res) => {
  try {
    const userId = req.user.id;
    const credentials = await partnerCredentialsService.listPartnerCredentials(userId);
    res.render('partner-credentials/list', {
      title: 'Credenciais de Parceiros',
      credentials,
      messages: req.flash(),
      user: res.locals.user,
    });
  } catch (err) {
    logger.error(`Erro ao listar credenciais de parceiros: ${err.message}`);
    req.flash('error', 'Não foi possível carregar as credenciais');
    res.redirect('/dashboard');
  }
};

/** Formulário para criar nova credencial */
exports.newForm = (req, res) => {
  res.render('partner-credentials/form', {
    title: 'Nova Credencial de Parceiro',
    credential: {},
    action: '/partner-credentials',
    messages: req.flash(),
    user: res.locals.user,
  });
};

/** Processa criação de nova credencial */
exports.create = async (req, res) => {
  try {
    const userId = req.user.id;
    const { grant_type, username, password, audience, scope, client_id } = req.body;
    await partnerCredentialsService.createPartnerCredential({
      user_id: userId,
      grant_type,
      username,
      password,
      audience,
      scope,
      client_id,
    });
    req.flash('success', 'Credencial criada com sucesso');
    res.redirect('/partner-credentials');
  } catch (err) {
    logger.error(`Erro ao criar credencial de parceiro: ${err.message}`);
    req.flash('error', err.message);
    res.redirect('/partner-credentials/new');
  }
};

/** Formulário de edição */
exports.editForm = async (req, res) => {
  try {
    const userId = req.user.id;
    const cred = await partnerCredentialsService.getPartnerCredentialById(req.params.id, userId);
    if (!cred) {
      req.flash('error', 'Credencial não encontrada');
      return res.redirect('/partner-credentials');
    }
    res.render('partner-credentials/form', {
      title: 'Editar Credencial de Parceiro',
      credential: cred,
      action: `/partner-credentials/${cred.id}`,
      messages: req.flash(),
      user: res.locals.user,
    });
  } catch (err) {
    logger.error(`Erro ao carregar credencial para edição: ${err.message}`);
    req.flash('error', 'Não foi possível carregar a credencial');
    res.redirect('/partner-credentials');
  }
};

/** Processa atualização */
exports.update = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = {
      grant_type: req.body.grant_type,
      username: req.body.username,
      password: req.body.password,
      audience: req.body.audience,
      scope: req.body.scope,
      client_id: req.body.client_id,
      updated_at: new Date().toISOString(),
    };
    await partnerCredentialsService.updatePartnerCredential(req.params.id, userId, updates);
    req.flash('success', 'Credencial atualizada com sucesso');
  } catch (err) {
    logger.error(`Erro ao atualizar credencial: ${err.message}`);
    req.flash('error', err.message);
  }
  res.redirect('/partner-credentials');
};

/** Deleta credencial */
exports.delete = async (req, res) => {
  try {
    const userId = req.user.id;
    await partnerCredentialsService.deletePartnerCredential(req.params.id, userId);
    req.flash('success', 'Credencial deletada com sucesso');
  } catch (err) {
    logger.error(`Erro ao deletar credencial: ${err.message}`);
    req.flash('error', err.message);
  }
  res.redirect('/partner-credentials');
}; 