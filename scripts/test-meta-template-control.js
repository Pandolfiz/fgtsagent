/**
 * Script de teste para o sistema de controle de templates Meta API
 */
const { supabaseAdmin } = require('../src/config/supabase');
const metaTemplateControlService = require('../src/services/metaTemplateControlService');

async function testMetaTemplateControl() {
  console.log('🧪 Iniciando testes do sistema de controle de templates Meta API...\n');

  try {
    // 1. Testar verificação de instância Meta API
    console.log('1️⃣ Testando verificação de instância Meta API...');
    
    // Buscar uma instância existente
    const { data: credentials, error: credsError } = await supabaseAdmin
      .from('whatsapp_credentials')
      .select('id, connection_type, wpp_access_token, wpp_number_id, wpp_business_account_id')
      .limit(1);

    if (credsError || !credentials || credentials.length === 0) {
      console.log('❌ Nenhuma credencial encontrada para teste');
      return;
    }

    const testInstanceId = credentials[0].id;
    console.log(`📋 Testando com instância: ${testInstanceId}`);
    console.log(`📋 Tipo de conexão: ${credentials[0].connection_type}`);

    const isMetaAPI = await metaTemplateControlService.isMetaAPIInstance(testInstanceId);
    console.log(`✅ É Meta API: ${isMetaAPI}\n`);

    // 2. Testar busca de última mensagem do usuário
    console.log('2️⃣ Testando busca de última mensagem do usuário...');
    
    // Buscar uma conversa existente
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('conversation_id, instance_id')
      .eq('instance_id', testInstanceId)
      .limit(1);

    if (messagesError || !messages || messages.length === 0) {
      console.log('❌ Nenhuma mensagem encontrada para teste');
      return;
    }

    const testConversationId = messages[0].conversation_id;
    console.log(`📋 Testando com conversa: ${testConversationId}`);

    const lastUserMessage = await metaTemplateControlService.getLastUserMessage(
      testConversationId, 
      testInstanceId
    );

    if (lastUserMessage) {
      console.log(`✅ Última mensagem do usuário encontrada:`);
      console.log(`   📅 Timestamp: ${lastUserMessage.timestamp}`);
      console.log(`   📝 Conteúdo: ${lastUserMessage.content.substring(0, 50)}...`);
      
      const isOlderThan24h = metaTemplateControlService.isLastMessageOlderThan24Hours(lastUserMessage);
      console.log(`   ⏰ Mais de 24h: ${isOlderThan24h}`);
    } else {
      console.log('ℹ️ Nenhuma mensagem do usuário encontrada');
    }
    console.log('');

    // 3. Testar status completo de envio
    console.log('3️⃣ Testando status completo de envio...');
    
    const sendStatus = await metaTemplateControlService.checkMessageSendStatus(
      testConversationId, 
      testInstanceId
    );

    console.log('📊 Status de envio:');
    console.log(`   ✅ Pode enviar mensagem livre: ${sendStatus.canSendFreeMessage}`);
    console.log(`   ⚠️ Precisa de template: ${sendStatus.requiresTemplate}`);
    console.log(`   📋 Motivo: ${sendStatus.reason}`);
    
    if (sendStatus.lastUserMessage) {
      console.log(`   📅 Última mensagem: ${sendStatus.lastUserMessage.timestamp}`);
      console.log(`   ⏰ Horas desde última mensagem: ${sendStatus.hoursSinceLastMessage}`);
    }
    console.log('');

    // 4. Testar busca de templates aprovados
    console.log('4️⃣ Testando busca de templates aprovados...');
    
    const templates = await metaTemplateControlService.getApprovedTemplates(testInstanceId);
    console.log(`📋 Templates encontrados: ${templates.length}`);
    
    if (templates.length > 0) {
      console.log('📝 Templates disponíveis:');
      templates.forEach((template, index) => {
        console.log(`   ${index + 1}. ${template.template_name} (${template.template_language} • ${template.template_category})`);
      });
    } else {
      console.log('ℹ️ Nenhum template aprovado encontrado');
    }
    console.log('');

    // 5. Testar cenários específicos
    console.log('5️⃣ Testando cenários específicos...');
    
    // Cenário 1: Instância que não é Meta API
    console.log('   📋 Cenário 1: Instância não Meta API');
    const nonMetaStatus = await metaTemplateControlService.checkMessageSendStatus(
      'conversa_teste', 
      'instancia_nao_meta'
    );
    console.log(`   ✅ Resultado: Pode enviar livre = ${nonMetaStatus.canSendFreeMessage}`);
    
    // Cenário 2: Conversa sem mensagens do usuário
    console.log('   📋 Cenário 2: Conversa sem mensagens do usuário');
    const noMessagesStatus = await metaTemplateControlService.checkMessageSendStatus(
      'conversa_sem_mensagens', 
      testInstanceId
    );
    console.log(`   ✅ Resultado: Pode enviar livre = ${noMessagesStatus.canSendFreeMessage}`);

    console.log('\n🎉 Testes concluídos com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  testMetaTemplateControl()
    .then(() => {
      console.log('\n✅ Script de teste finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro no script de teste:', error);
      process.exit(1);
    });
}

module.exports = { testMetaTemplateControl };
