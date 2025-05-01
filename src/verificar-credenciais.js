/**
 * Script para verificar as credenciais recentemente criadas no banco de dados
 */
require('dotenv').config();
const { supabase, supabaseAdmin } = require('./config/supabase');
const logger = require('./utils/logger');

async function verificarCredenciais() {
  try {
    // 1. Buscar credenciais da tabela credentials
    const { data: credentials, error: credentialsError } = await supabaseAdmin
      .from('credentials')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (credentialsError) {
      logger.error(`Erro ao buscar credenciais: ${credentialsError.message}`);
    } else if (!credentials || credentials.length === 0) {
      logger.info('Nenhuma credencial encontrada na tabela credentials.');
    } else {
      logger.info(`Encontradas ${credentials.length} credenciais recentes.`);
      
      // Exibir informações mais detalhadas para cada credencial
      credentials.forEach((cred, index) => {
        logger.info(`\n[${index + 1}] Credencial ID: ${cred.id}`);
        logger.info(`    Nome: ${cred.name}`);
        logger.info(`    Tipo: ${cred.type}`);
        logger.info(`    Organização: ${cred.organization_id}`);
        logger.info(`    Criada em: ${new Date(cred.created_at).toLocaleString()}`);
        
        if (cred.data) {
          logger.info('    Dados: (informações sensíveis omitidas)');
          const safeData = { ...cred.data };
          
          // Omitir informações sensíveis
          if (safeData.access_token) safeData.access_token = '***OMITIDO***';
          if (safeData.accessToken) safeData.accessToken = '***OMITIDO***';
          if (safeData.refresh_token) safeData.refresh_token = '***OMITIDO***';
          if (safeData.refreshToken) safeData.refreshToken = '***OMITIDO***';
          if (safeData.client_secret) safeData.client_secret = '***OMITIDO***';
          if (safeData.clientSecret) safeData.clientSecret = '***OMITIDO***';
          if (safeData.private_key) safeData.private_key = '***OMITIDO***';
          if (safeData.password) safeData.password = '***OMITIDO***';
          
          logger.info(`    ${JSON.stringify(safeData, null, 4).replace(/\n/g, '\n    ')}`);
        }
      });
    }
    
    // 2. Buscar credenciais da tabela n8n_credentials
    const { data: n8nCredentials, error: n8nCredentialsError } = await supabaseAdmin
      .from('n8n_credentials')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (n8nCredentialsError) {
      logger.error(`Erro ao buscar credenciais n8n: ${n8nCredentialsError.message}`);
    } else if (!n8nCredentials || n8nCredentials.length === 0) {
      logger.info('Nenhuma credencial encontrada na tabela n8n_credentials.');
    } else {
      logger.info(`Encontradas ${n8nCredentials.length} credenciais n8n recentes:`);
      
      // Exibir informações mais detalhadas para cada credencial
      n8nCredentials.forEach((cred, index) => {
        logger.info(`\n[${index + 1}] Credencial n8n ID: ${cred.id}`);
        logger.info(`    Nome: ${cred.name}`);
        logger.info(`    Tipo: ${cred.type}`);
        logger.info(`    Tipo de Credencial: ${cred.credential_type}`);
        logger.info(`    Tipo de Nó: ${cred.node_type}`);
        logger.info(`    ID da Credencial n8n: ${cred.n8n_credential_id || 'Não sincronizada'}`);
        logger.info(`    Organização: ${cred.organization_id}`);
        logger.info(`    Criada em: ${new Date(cred.created_at).toLocaleString()}`);
      });
    }
    
    // 3. Verificar se as credenciais possuem correspondência em ambas as tabelas
    if (credentials && n8nCredentials) {
      logger.info('\n\n[VERIFICAÇÃO DE CORRESPONDÊNCIA]');
      logger.info('Verificando se as credenciais têm correspondência em ambas as tabelas...');
      
      // Mapear credenciais pelo nome e organização
      const credMap = new Map();
      credentials.forEach(cred => {
        const key = `${cred.name}:${cred.organization_id}`;
        credMap.set(key, cred);
      });
      
      // Verificar correspondência
      let matched = 0;
      n8nCredentials.forEach(n8nCred => {
        const key = `${n8nCred.name}:${n8nCred.organization_id}`;
        if (credMap.has(key)) {
          matched++;
        } else {
          logger.warn(`AVISO: Credencial n8n '${n8nCred.name}' não tem correspondência na tabela credentials.`);
        }
      });
      
      logger.info(`Total de correspondências encontradas: ${matched}/${n8nCredentials.length}`);
    }
    
    logger.info('\n=== VERIFICAÇÃO DE CREDENCIAIS CONCLUÍDA ===');
    
    // Instruções para o usuário
    logger.info('\n[INSTRUÇÕES]');
    logger.info('Para sincronizar manualmente as credenciais com o n8n:');
    logger.info('1. Execute o script: node src/sync-n8n-credentials.js');
    logger.info('2. No painel do n8n, crie manualmente as credenciais usando as mesmas informações');
    logger.info('3. Copie o ID da credencial criada no n8n e atualize manualmente na tabela n8n_credentials');
    
  } catch (error) {
    logger.error(`Erro ao verificar credenciais: ${error.message}`);
    logger.error(error.stack);
  }
}

// Executar a verificação
verificarCredenciais(); 