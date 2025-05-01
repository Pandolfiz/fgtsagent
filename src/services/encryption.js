// Serviço para operações de criptografia
const { getSecureConnection } = require('./database');
const config = require('../config');

class EncryptionService {
  constructor() {
    this.masterKey = config.security.masterKey;
  }
  
  async initializeSystem() {
    const client = await getSecureConnection();
    
    // Verificar se já foi inicializado
    const { data } = await client
      .from('encryption_keys')
      .select('id')
      .limit(1);
      
    if (data && data.length > 0) {
      return { status: 'already_initialized' };
    }
    
    // Inicializar sistema de criptografia
    await client.rpc('initialize_encryption_system', {
      master_key_input: this.masterKey
    });
    
    return { status: 'initialized' };
  }
  
  async rotateKeys() {
    const client = await getSecureConnection();
    
    await client.rpc('rotate_encryption_key', {
      master_key: this.masterKey
    });
    
    return { status: 'rotated' };
  }
  
  async encryptData(plaintext) {
    const client = await getSecureConnection();
    
    const { data, error } = await client.rpc('encrypt_data', {
      plaintext,
      master_key: this.masterKey
    });
    
    if (error) throw new Error(`Erro ao criptografar dados: ${error.message}`);
    
    return data;
  }
  
  async decryptData(encrypted) {
    const client = await getSecureConnection();
    
    const { data, error } = await client.rpc('decrypt_data', {
      encrypted_text: encrypted,
      master_key: this.masterKey
    });
    
    if (error) throw new Error(`Erro ao descriptografar dados: ${error.message}`);
    
    return data;
  }
}

module.exports = new EncryptionService();