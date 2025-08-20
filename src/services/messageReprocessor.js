const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const whatsappService = require('./whatsappService');

class MessageReprocessor {
  constructor() {
    this.isProcessing = false;
    this.retryInterval = 5 * 60 * 1000; // 5 minutos
    this.maxRetries = 3;
  }

  /**
   * Inicia o processamento de mensagens pendentes
   */
  async startProcessing() {
    if (this.isProcessing) {
      logger.info('MessageReprocessor já está em execução');
      return;
    }

    this.isProcessing = true;
    logger.info('Iniciando MessageReprocessor para mensagens pendentes');

    // Processar mensagens pendentes a cada 5 minutos
    setInterval(async () => {
      await this.processPendingMessages();
    }, this.retryInterval);

    // Processar imediatamente na primeira execução
    await this.processPendingMessages();
  }

  /**
   * Processa mensagens pendentes
   */
  async processPendingMessages() {
    try {
      logger.info('Verificando mensagens pendentes para reprocessamento...');

      // Buscar mensagens pendentes que devem ser reenviadas
      const { data: pendingMessages, error } = await supabaseAdmin
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          recipient_id,
          content,
          status,
          timestamp,
          metadata,
          instance_id,
          client_id
        `)
        .eq('status', 'pending')
        .order('timestamp', { ascending: true })
        .limit(10); // Processar 10 por vez

      if (error) {
        logger.error('Erro ao buscar mensagens pendentes:', error.message || error);
        return;
      }

      if (!pendingMessages || pendingMessages.length === 0) {
        logger.info('Nenhuma mensagem pendente encontrada');
        return;
      }

      logger.info(`Encontradas ${pendingMessages.length} mensagens pendentes para reprocessamento`);

      for (const message of pendingMessages) {
        try {
          // Buscar dados do contato separadamente
          const { data: contactData, error: contactError } = await supabaseAdmin
            .from('contacts')
            .select('remote_jid, phone, client_id, instance_id')
            .eq('remote_jid', message.conversation_id)
            .eq('client_id', message.client_id)
            .single();

          if (contactError) {
            logger.warn(`Erro ao buscar contato para mensagem ${message.id}: ${contactError.message || contactError}`);
            continue;
          }

          if (!contactData) {
            logger.warn(`Contato não encontrado para mensagem ${message.id} - conversation_id: ${message.conversation_id}, client_id: ${message.client_id}`);
            continue;
          }

          logger.info(`Contato encontrado para mensagem ${message.id}: ${contactData.phone}`);

          // Verificar se deve tentar reenviar baseado no metadata
          const retryCount = message.metadata?.retry_count || 0;
          const shouldRetry = message.metadata?.should_retry !== false; // Default true
          
          if (shouldRetry && retryCount < this.maxRetries) {
            await this.reprocessMessage(message, contactData);
          } else if (retryCount >= this.maxRetries) {
            // Marcar como falhada se excedeu tentativas
            logger.warn(`Mensagem ${message.id} excedeu número máximo de tentativas`);
            await supabaseAdmin
              .from('messages')
              .update({ 
                status: 'failed', 
                metadata: {
                  ...message.metadata,
                  max_retries_exceeded: true,
                  final_error: 'Número máximo de tentativas excedido'
                }
              })
              .eq('id', message.id);
          }
        } catch (messageError) {
          logger.error(`Erro ao processar mensagem ${message.id}:`, messageError.message || messageError);
        }
      }

    } catch (error) {
      logger.error('Erro ao processar mensagens pendentes:', error.message || error);
    }
  }

  /**
   * Reprocessa uma mensagem específica
   */
  async reprocessMessage(message, contactData) {
    try {
      logger.info(`Reprocessando mensagem ${message.id} para ${contactData.phone}`);

      // Incrementar contador de tentativas
      const retryCount = (message.metadata?.retry_count || 0) + 1;
      const metadata = {
        ...message.metadata,
        retry_count: retryCount,
        last_retry: new Date().toISOString()
      };

      // Tentar reenviar a mensagem
      logger.info(`Enviando mensagem ${message.id} para ${contactData.phone} via WhatsApp`);
      
      const whatsappResponse = await whatsappService.sendTextMessage(
        contactData.phone,
        message.content,
        contactData.client_id,
        contactData.instance_id
      );

      logger.info(`Resposta do WhatsApp para mensagem ${message.id}:`, {
        success: whatsappResponse.success,
        error: whatsappResponse.error,
        data: whatsappResponse.data
      });

      if (whatsappResponse.success) {
        // Sucesso - atualizar status para sent
        logger.info(`Mensagem ${message.id} reenviada com sucesso`);
        
        const updateData = {
          status: 'sent',
          metadata: {
            ...metadata,
            reprocessed: true,
            reprocessed_at: new Date().toISOString()
          }
        };

        // Adicionar dados da resposta se disponíveis
        if (whatsappResponse.data?.messages?.[0]?.id) {
          updateData.metadata.whatsapp_message_id = whatsappResponse.data.messages[0].id;
          updateData.metadata.response_data = whatsappResponse.data;
        }

        await supabaseAdmin
          .from('messages')
          .update(updateData)
          .eq('id', message.id);
      } else {
        // Falha - verificar se deve continuar tentando
        if (retryCount >= this.maxRetries) {
          logger.warn(`Mensagem ${message.id} excedeu número máximo de tentativas`);
          await supabaseAdmin
            .from('messages')
            .update({ 
              status: 'failed', 
              metadata: {
                ...metadata,
                final_error: whatsappResponse.error || 'Erro desconhecido',
                max_retries_exceeded: true
              }
            })
            .eq('id', message.id);
        } else {
          // Manter como pending para próxima tentativa
          logger.info(`Mensagem ${message.id} falhou, tentativa ${retryCount}/${this.maxRetries}`);
          await supabaseAdmin
            .from('messages')
            .update({ 
              metadata: {
                ...metadata,
                last_error: whatsappResponse.error || 'Erro desconhecido'
              }
            })
            .eq('id', message.id);
        }
      }

    } catch (error) {
      logger.error(`Erro ao reprocessar mensagem ${message.id}:`, error);
      
      // Incrementar contador de tentativas mesmo em caso de erro
      const retryCount = (message.metadata?.retry_count || 0) + 1;
      const metadata = {
        ...message.metadata,
        retry_count: retryCount,
        last_retry: new Date().toISOString(),
        last_error: error.message
      };

      if (retryCount >= this.maxRetries) {
        await supabaseAdmin
          .from('messages')
          .update({ 
            status: 'failed', 
            metadata: {
              ...metadata,
              max_retries_exceeded: true
            }
          })
          .eq('id', message.id);
      } else {
        await supabaseAdmin
          .from('messages')
          .update({ metadata })
          .eq('id', message.id);
      }
    }
  }

  /**
   * Para o processamento
   */
  stopProcessing() {
    this.isProcessing = false;
    logger.info('MessageReprocessor parado');
  }
}

module.exports = new MessageReprocessor(); 