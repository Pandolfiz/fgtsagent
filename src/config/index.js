const path = require('path');
// Carregar variáveis de ambiente do arquivo .env na raiz do projeto
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Verificar se as variáveis de ambiente foram carregadas
// Adaptação para usar os nomes de variáveis que existem no arquivo .env
const requiredEnvVars = ['SUPABASE_PROJECT_ID', 'SUPABASE_SERVICE_KEY', 'SUPABASE_ANON_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`ERRO: As seguintes variáveis de ambiente são obrigatórias e não foram definidas: ${missingEnvVars.join(', ')}`);
}

module.exports = {
  port: process.env.PORT || 3000,
  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Supabase - Adaptado para usar os nomes de variáveis que existem no .env
  supabase: {
    // Use SUPABASE_URL se existir, caso contrário use SUPABASE_PROJECT_ID
    url: process.env.SUPABASE_URL || (process.env.SUPABASE_PROJECT_ID ? `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co` : undefined),
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY,
    jwtSecret: process.env.SUPABASE_JWT_SECRET
  },
  
  // Evolution API
  evolutionApi: {
    url: process.env.EVOLUTION_API_URL,
    apiKey: process.env.EVOLUTION_API_KEY,
    instanceName: process.env.EVOLUTION_API_INSTANCE || 'fgts_application'
  },
  
  // n8n
  n8n: {
    apiUrl: process.env.N8N_API_URL,
    apiKey: process.env.N8N_API_KEY
  },
  
  // Segurança
  security: {
    masterKey: process.env.MASTER_KEY,
    jwtSecret: process.env.JWT_SECRET
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || ''
  },
  
  // Jobs
  enableJobs: process.env.ENABLE_JOBS !== 'false',
  
  // Configurações de APIs externas
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  },
  
  // Configurações de sincronização de templates
  syncTemplatesOnStartup: process.env.SYNC_TEMPLATES_ON_STARTUP === 'true' || false,
  syncTemplatesCron: process.env.SYNC_TEMPLATES_CRON || '0 */12 * * *' // Padrão: a cada 12 horas
};