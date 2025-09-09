#!/usr/bin/env node

/**
 * 🚀 Script de Configuração de Migração de Autenticação
 * 
 * Este script permite configurar a migração gradual do sistema de autenticação,
 * alternando entre middlewares antigos e novos de forma controlada.
 * 
 * @author Equipe de Desenvolvimento
 * @version 1.0.0
 * @since 2024-01-XX
 */

const fs = require('fs');
const path = require('path');
const logger = require('../src/config/logger');

/**
 * Configurações de migração disponíveis
 */
const MIGRATION_PHASES = {
  // Fase 1: Apenas middleware legado (padrão)
  LEGACY_ONLY: {
    USE_UNIFIED_AUTH: 'false',
    USE_LEGACY_AUTH: 'true',
    description: 'Usa apenas middleware legado (estado atual)'
  },
  
  // Fase 2: Rotas específicas com middleware unificado
  SELECTIVE_MIGRATION: {
    USE_UNIFIED_AUTH: 'true',
    USE_LEGACY_AUTH: 'true',
    description: 'Rotas específicas usam middleware unificado, resto usa legado'
  },
  
  // Fase 3: Maioria das rotas com middleware unificado
  MAJORITY_UNIFIED: {
    USE_UNIFIED_AUTH: 'true',
    USE_LEGACY_AUTH: 'true',
    description: 'Maioria das rotas usa middleware unificado'
  },
  
  // Fase 4: Apenas middleware unificado
  UNIFIED_ONLY: {
    USE_UNIFIED_AUTH: 'true',
    USE_LEGACY_AUTH: 'false',
    description: 'Usa apenas middleware unificado (migração completa)'
  }
};

/**
 * Classe para gerenciar configuração de migração
 */
class MigrationConfigurator {
  constructor() {
    this.envPath = path.join(__dirname, '..', 'src', '.env');
    this.backupPath = path.join(__dirname, '..', 'src', '.env.migration.backup');
  }

  /**
   * Cria backup do arquivo .env atual
   */
  createBackup() {
    try {
      if (fs.existsSync(this.envPath)) {
        fs.copyFileSync(this.envPath, this.backupPath);
        logger.info('✅ Backup do .env criado:', this.backupPath);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('❌ Erro ao criar backup:', error);
      return false;
    }
  }

  /**
   * Restaura backup do arquivo .env
   */
  restoreBackup() {
    try {
      if (fs.existsSync(this.backupPath)) {
        fs.copyFileSync(this.backupPath, this.envPath);
        logger.info('✅ Backup do .env restaurado');
        return true;
      }
      logger.warn('⚠️ Nenhum backup encontrado');
      return false;
    } catch (error) {
      logger.error('❌ Erro ao restaurar backup:', error);
      return false;
    }
  }

  /**
   * Lê configuração atual do .env
   */
  readCurrentConfig() {
    try {
      if (!fs.existsSync(this.envPath)) {
        logger.warn('⚠️ Arquivo .env não encontrado');
        return {};
      }

      const content = fs.readFileSync(this.envPath, 'utf8');
      const config = {};
      
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            config[key.trim()] = valueParts.join('=').trim();
          }
        }
      });

      return config;
    } catch (error) {
      logger.error('❌ Erro ao ler configuração atual:', error);
      return {};
    }
  }

  /**
   * Aplica nova configuração de migração
   */
  applyMigrationPhase(phase) {
    try {
      // Cria backup antes de modificar
      this.createBackup();

      // Lê configuração atual
      const currentConfig = this.readCurrentConfig();

      // Aplica nova configuração
      const newConfig = { ...currentConfig, ...phase };

      // Gera conteúdo do .env
      const envContent = Object.entries(newConfig)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      // Escreve novo arquivo .env
      fs.writeFileSync(this.envPath, envContent);

      logger.info('✅ Configuração de migração aplicada:');
      logger.info(`   USE_UNIFIED_AUTH: ${phase.USE_UNIFIED_AUTH}`);
      logger.info(`   USE_LEGACY_AUTH: ${phase.USE_LEGACY_AUTH}`);
      logger.info(`   Descrição: ${phase.description}`);

      return true;
    } catch (error) {
      logger.error('❌ Erro ao aplicar configuração:', error);
      return false;
    }
  }

  /**
   * Mostra status atual da migração
   */
  showStatus() {
    const config = this.readCurrentConfig();
    
    console.log('\n🔐 STATUS DA MIGRAÇÃO DE AUTENTICAÇÃO');
    console.log('=====================================');
    console.log(`USE_UNIFIED_AUTH: ${config.USE_UNIFIED_AUTH || 'não definido'}`);
    console.log(`USE_LEGACY_AUTH: ${config.USE_LEGACY_AUTH || 'não definido'}`);
    
    if (config.USE_UNIFIED_AUTH === 'true' && config.USE_LEGACY_AUTH === 'true') {
      console.log('📊 Fase: Migração Seletiva (híbrida)');
    } else if (config.USE_UNIFIED_AUTH === 'true' && config.USE_LEGACY_AUTH === 'false') {
      console.log('🚀 Fase: Migração Completa (unificado)');
    } else if (config.USE_UNIFIED_AUTH === 'false' && config.USE_LEGACY_AUTH === 'true') {
      console.log('🔒 Fase: Apenas Legado');
    } else {
      console.log('❓ Fase: Indefinida');
    }
    
    console.log('=====================================\n');
  }

  /**
   * Lista fases disponíveis
   */
  listPhases() {
    console.log('\n📋 FASES DE MIGRAÇÃO DISPONÍVEIS');
    console.log('================================');
    
    Object.entries(MIGRATION_PHASES).forEach(([key, phase], index) => {
      console.log(`${index + 1}. ${key}`);
      console.log(`   ${phase.description}`);
      console.log(`   USE_UNIFIED_AUTH: ${phase.USE_UNIFIED_AUTH}`);
      console.log(`   USE_LEGACY_AUTH: ${phase.USE_LEGACY_AUTH}`);
      console.log('');
    });
  }
}

/**
 * Função principal
 */
async function main() {
  const configurator = new MigrationConfigurator();
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'status':
      configurator.showStatus();
      break;

    case 'list':
      configurator.listPhases();
      break;

    case 'legacy':
      configurator.applyMigrationPhase(MIGRATION_PHASES.LEGACY_ONLY);
      break;

    case 'selective':
      configurator.applyMigrationPhase(MIGRATION_PHASES.SELECTIVE_MIGRATION);
      break;

    case 'majority':
      configurator.applyMigrationPhase(MIGRATION_PHASES.MAJORITY_UNIFIED);
      break;

    case 'unified':
      configurator.applyMigrationPhase(MIGRATION_PHASES.UNIFIED_ONLY);
      break;

    case 'restore':
      configurator.restoreBackup();
      break;

    case 'backup':
      configurator.createBackup();
      break;

    default:
      console.log('\n🚀 CONFIGURADOR DE MIGRAÇÃO DE AUTENTICAÇÃO');
      console.log('==========================================');
      console.log('Uso: node scripts/configure-migration.js <comando>');
      console.log('');
      console.log('Comandos disponíveis:');
      console.log('  status     - Mostra status atual da migração');
      console.log('  list       - Lista fases de migração disponíveis');
      console.log('  legacy     - Usa apenas middleware legado');
      console.log('  selective  - Migração seletiva (híbrida)');
      console.log('  majority   - Maioria das rotas unificadas');
      console.log('  unified    - Usa apenas middleware unificado');
      console.log('  restore    - Restaura configuração anterior');
      console.log('  backup     - Cria backup da configuração atual');
      console.log('');
      console.log('Exemplos:');
      console.log('  node scripts/configure-migration.js status');
      console.log('  node scripts/configure-migration.js selective');
      console.log('  node scripts/configure-migration.js restore');
      console.log('');
      break;
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    logger.error('❌ Erro no script de configuração:', error);
    process.exit(1);
  });
}

module.exports = { MigrationConfigurator, MIGRATION_PHASES };
