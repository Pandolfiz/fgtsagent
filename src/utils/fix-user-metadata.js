// Script para corrigir metadados de usuário
require('dotenv').config();
const { supabaseAdmin } = require('../services/database');
const logger = require('./logger');

/**
 * Corrige metadados de um usuário específico
 */
async function fixUserMetadata(userId) {
  try {
    // 1. Obter dados do usuário
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError) {
      logger.error(`Erro ao buscar usuário ${userId}: ${userError.message}`);
      return false;
    }
    
    const { user } = userData;
    
    // 2. Obter perfil do usuário
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError && !profileError.message.includes('No rows found')) {
      logger.error(`Erro ao buscar perfil do usuário ${userId}: ${profileError.message}`);
      return false;
    }
    
    // 3. Determinar o nome correto para os metadados
    let firstName = null;
    let fullName = null;
    
    // Prioridade: 
    // 1. Dados do perfil (first_name, full_name)
    // 2. Metadados existentes (first_name, full_name)
    // 3. Email do usuário
    
    if (profileData) {
      firstName = profileData.first_name || '';
      fullName = profileData.full_name || 
                (profileData.first_name && profileData.last_name ? 
                 `${profileData.first_name} ${profileData.last_name}`.trim() : '');
    }
    
    if (!firstName && user.user_metadata) {
      firstName = user.user_metadata.first_name || '';
    }
    
    if (!fullName && user.user_metadata) {
      fullName = user.user_metadata.full_name || '';
    }
    
    // Se ainda não temos o first_name mas temos o full_name, extrair o primeiro nome
    if (!firstName && fullName) {
      firstName = fullName.split(' ')[0];
    }
    
    // Se temos o first_name mas não o full_name, usar o first_name como fullName
    if (firstName && !fullName) {
      fullName = firstName;
    }
    
    // Se nada funcionou, usar o email como fallback
    if (!firstName && !fullName && user.email) {
      firstName = user.email.split('@')[0];
      fullName = firstName;
    }
    
    // 4. Atualizar metadados do usuário
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        user_metadata: {
          ...user.user_metadata, // Manter outros metadados existentes
          first_name: firstName,
          full_name: fullName
        }
      }
    );
    
    if (updateError) {
      logger.error(`Erro ao atualizar metadados do usuário ${userId}: ${updateError.message}`);
      return false;
    }
    
    logger.info(`Metadados atualizados para usuário ${userId}: first_name=${firstName}, full_name=${fullName}`);
    
    // 5. Atualizar perfil se não existir ou estiver incompleto
    if (!profileData) {
      const { error: insertError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: userId,
          first_name: firstName,
          last_name: '',
          full_name: fullName,
          created_at: new Date(),
          updated_at: new Date()
        });
        
      if (insertError) {
        logger.error(`Erro ao criar perfil para usuário ${userId}: ${insertError.message}`);
        return false;
      }
      
      logger.info(`Perfil criado para usuário ${userId}`);
    } else if (!profileData.full_name || !profileData.first_name) {
      // Atualizar perfil existente se estiver faltando campos
      const updateData = {};
      
      if (!profileData.first_name) updateData.first_name = firstName;
      if (!profileData.full_name) updateData.full_name = fullName;
      
      const { error: updateProfileError } = await supabaseAdmin
        .from('user_profiles')
        .update(updateData)
        .eq('id', userId);
        
      if (updateProfileError) {
        logger.error(`Erro ao atualizar perfil do usuário ${userId}: ${updateProfileError.message}`);
        return false;
      }
      
      logger.info(`Perfil atualizado para usuário ${userId}`);
    }
    
    return true;
  } catch (error) {
    logger.error(`Erro ao corrigir metadados do usuário ${userId}: ${error.message}`);
    return false;
  }
}

/**
 * Corrige metadados de todos os usuários
 */
async function fixAllUserMetadata() {
  try {
    // Obter todos os usuários
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      logger.error(`Erro ao listar usuários: ${error.message}`);
      return false;
    }
    
    logger.info(`Encontrados ${users.users.length} usuários para processar`);
    
    // Processar cada usuário
    let success = 0;
    let failed = 0;
    
    for (const user of users.users) {
      const result = await fixUserMetadata(user.id);
      
      if (result) {
        success++;
      } else {
        failed++;
      }
    }
    
    logger.info(`Processamento concluído: ${success} usuários atualizados com sucesso, ${failed} falhas`);
    return true;
  } catch (error) {
    logger.error(`Erro ao processar todos os usuários: ${error.message}`);
    return false;
  }
}

// Executar script se chamado diretamente
if (require.main === module) {
  logger.info('Iniciando correção de metadados de usuários...');
  
  fixAllUserMetadata()
    .then(result => {
      if (result) {
        logger.info('Correção de metadados concluída com sucesso');
      } else {
        logger.error('Erro durante a correção de metadados');
      }
      process.exit(result ? 0 : 1);
    })
    .catch(error => {
      logger.error(`Erro não tratado: ${error.message}`);
      process.exit(1);
    });
} else {
  // Exportar funções se importado como módulo
  module.exports = {
    fixUserMetadata,
    fixAllUserMetadata
  };
} 