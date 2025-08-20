const contactRepository = require('../repositories/contactRepository');

/**
 * Processa atualização de contatos a partir do webhook
 */
async function handleContactsUpdate(dataArray) {
  const contacts = Array.isArray(dataArray) ? dataArray : [dataArray];
  for (const c of contacts) {
    await contactRepository.upsertContact({
      remote_jid: c.remoteJid,
      push_name: c.pushName,
      profile_pic_url: c.profilePicUrl,
      instance_id: c.instanceId
    });
  }
}

/**
 * Retorna dados de contatos para um array de remote_jid
 */
async function getContacts(remoteJids) {
  return await require('../repositories/contactRepository').getContactsByJids(remoteJids);
}

async function updateState({ remote_jid, agent_state, agent_status }) {
  return await contactRepository.updateState({ remote_jid, agent_state, agent_status });
}

module.exports = {
  handleContactsUpdate,
  getContacts,
  updateState
}; 