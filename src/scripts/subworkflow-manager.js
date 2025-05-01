#!/usr/bin/env node
/**
 * Gerenciador de Subworkflows
 * 
 * Script de linha de comando para identificar, analisar e duplicar
 * workflows com seus subworkflows.
 */

require('dotenv').config();
const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { subworkflows } = require('../tools');

// Configuração do CLI
program
  .name('subworkflow-manager')
  .description('Gerenciador de subworkflows para o n8n')
  .version('1.0.0');

// Comando para identificar subworkflows
program
  .command('identify')
  .description('Identificar subworkflows em um workflow')
  .argument('<file>', 'Arquivo JSON do workflow ou ID do workflow no n8n')
  .option('-s, --save', 'Salvar relatório em arquivo')
  .option('-c, --confidence <level>', 'Nível mínimo de confiança (0-100)', 70)
  .action(async (file, options) => {
    try {
      // Verificar se é um ID ou arquivo
      let input = file;
      if (!file.endsWith('.json') && !fs.existsSync(file)) {
        console.log(`Interpretando ${file} como ID de workflow...`);
        
        if (!process.env.N8N_API_URL || !process.env.N8N_API_KEY) {
          console.error('Erro: Variáveis N8N_API_URL e N8N_API_KEY são necessárias para usar IDs de workflow');
          process.exit(1);
        }
        
        // Obter workflow do n8n
        console.log('Obtendo workflow do n8n...');
        const workflow = await subworkflows.getWorkflow(file, {
          n8nApiUrl: process.env.N8N_API_URL,
          n8nApiKey: process.env.N8N_API_KEY
        });
        
        input = workflow;
      }
      
      // Identificar subworkflows
      console.log('Analisando workflow...');
      const result = await subworkflows.identificarSubworkflows(input, {
        saveReport: options.save,
        minConfidence: parseInt(options.confidence)
      });
      
      if (!result.success) {
        console.error('Erro na análise:', result.error);
        process.exit(1);
      }
      
      // Análise completa
    } catch (error) {
      console.error('Erro:', error.message);
      process.exit(1);
    }
  });

// Comando para duplicar workflow com subworkflows
program
  .command('duplicate')
  .description('Duplicar um workflow com seus subworkflows')
  .argument('<workflow-id>', 'ID do workflow no n8n')
  .option('-n, --name <name>', 'Novo nome para o workflow duplicado')
  .action(async (workflowId, options) => {
    try {
      if (!process.env.N8N_API_URL || !process.env.N8N_API_KEY) {
        console.error('Erro: Variáveis N8N_API_URL e N8N_API_KEY são necessárias');
        process.exit(1);
      }
      
      // Nome padrão se não fornecido
      const newName = options.name || `Duplicado ${new Date().toISOString()}`;
      
      // Duplicar workflow
      console.log(`Duplicando workflow ${workflowId} como "${newName}"...`);
      const result = await subworkflows.duplicateWorkflowWithSubworkflows(workflowId, newName);
      
      if (!result.success) {
        console.error('Erro na duplicação:', result.error);
        process.exit(1);
      }
      
      console.log('\n=== DUPLICAÇÃO CONCLUÍDA COM SUCESSO ===');
      console.log(`Workflow principal: ${result.mainWorkflow.id}`);
      console.log(`Subworkflows duplicados: ${result.subworkflows.length}`);
      
      if (result.subworkflows.length > 0) {
        console.log('\nSubworkflows duplicados:');
        for (const sub of result.subworkflows) {
          console.log(`- ${sub.name} (ID: ${sub.id})`);
        }
      }
    } catch (error) {
      console.error('Erro:', error.message);
      process.exit(1);
    }
  });

// Comando para testar a detecção de subworkflows
program
  .command('test')
  .description('Executar teste de detecção de subworkflows')
  .action(() => {
    console.log('Executando teste de detecção de subworkflows...');
    require('../tools/subworkflows/testers/simple-test');
  });

// Modo interativo
program
  .command('interactive')
  .description('Iniciar modo interativo')
  .action(() => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('=== Gerenciador de Subworkflows (Modo Interativo) ===');
    console.log('1. Identificar subworkflows em um workflow');
    console.log('2. Duplicar workflow com subworkflows');
    console.log('3. Executar teste de detecção');
    console.log('0. Sair');
    
    rl.question('\nEscolha uma opção: ', async (answer) => {
      switch (answer.trim()) {
        case '1':
          rl.question('Caminho do arquivo ou ID do workflow: ', async (file) => {
            rl.question('Salvar relatório? (s/n): ', async (save) => {
              try {
                const options = { save: save.toLowerCase() === 's' };
                
                // Simular comando
                console.log(`\nExecutando: identify ${file} ${options.save ? '--save' : ''}`);
                
                // Verificar se é um ID ou arquivo
                let input = file;
                if (!file.endsWith('.json') && !fs.existsSync(file)) {
                  console.log(`Interpretando ${file} como ID de workflow...`);
                  
                  if (!process.env.N8N_API_URL || !process.env.N8N_API_KEY) {
                    console.error('Erro: Variáveis N8N_API_URL e N8N_API_KEY são necessárias para usar IDs de workflow');
                    rl.close();
                    return;
                  }
                  
                  // Obter workflow do n8n
                  console.log('Obtendo workflow do n8n...');
                  const workflow = await subworkflows.getWorkflow(file, {
                    n8nApiUrl: process.env.N8N_API_URL,
                    n8nApiKey: process.env.N8N_API_KEY
                  });
                  
                  input = workflow;
                }
                
                // Identificar subworkflows
                console.log('Analisando workflow...');
                const result = await subworkflows.identificarSubworkflows(input, {
                  saveReport: options.save
                });
                
                if (!result.success) {
                  console.error('Erro na análise:', result.error);
                }
                
                rl.close();
              } catch (error) {
                console.error('Erro:', error.message);
                rl.close();
              }
            });
          });
          break;
          
        case '2':
          rl.question('ID do workflow: ', (id) => {
            rl.question('Novo nome: ', async (name) => {
              try {
                if (!process.env.N8N_API_URL || !process.env.N8N_API_KEY) {
                  console.error('Erro: Variáveis N8N_API_URL e N8N_API_KEY são necessárias');
                  rl.close();
                  return;
                }
                
                // Duplicar workflow
                console.log(`\nDuplicando workflow ${id} como "${name}"...`);
                const result = await subworkflows.duplicateWorkflowWithSubworkflows(id, name);
                
                if (!result.success) {
                  console.error('Erro na duplicação:', result.error);
                  rl.close();
                  return;
                }
                
                console.log('\n=== DUPLICAÇÃO CONCLUÍDA COM SUCESSO ===');
                console.log(`Workflow principal: ${result.mainWorkflow.id}`);
                console.log(`Subworkflows duplicados: ${result.subworkflows.length}`);
                
                if (result.subworkflows.length > 0) {
                  console.log('\nSubworkflows duplicados:');
                  for (const sub of result.subworkflows) {
                    console.log(`- ${sub.name} (ID: ${sub.id})`);
                  }
                }
                
                rl.close();
              } catch (error) {
                console.error('Erro:', error.message);
                rl.close();
              }
            });
          });
          break;
          
        case '3':
          console.log('\nExecutando teste de detecção de subworkflows...');
          require('../tools/subworkflows/testers/simple-test');
          rl.close();
          break;
          
        case '0':
          console.log('Saindo...');
          rl.close();
          break;
          
        default:
          console.log('Opção inválida');
          rl.close();
      }
    });
  });

// Processar argumentos
program.parse();

// Se nenhum argumento, mostrar ajuda
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 