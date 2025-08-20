#!/usr/bin/env node

/**
 * Script de Sincronização: Contact Lead IDs
 * 
 * Este script sincroniza os lead_id da tabela contacts baseado no telefone
 * correspondente na tabela leads.
 * 
 * Uso: node src/scripts/sync_contact_lead_ids.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function syncContactLeadIds() {
  console.log('🔄 Iniciando sincronização de Contact Lead IDs...\n');

  try {
    // 1. Verificar estado atual
    console.log('📊 Verificando estado atual dos dados...');
    
    const { data: contactStats } = await supabase
      .from('contacts')
      .select('lead_id')
      .not('client_id', 'is', null);

    const totalContacts = contactStats.length;
    const withLeadId = contactStats.filter(c => c.lead_id !== null).length;
    const withoutLeadId = totalContacts - withLeadId;

    console.log(`   Total contatos: ${totalContacts}`);
    console.log(`   ✅ Com lead_id: ${withLeadId}`);
    console.log(`   ❌ Sem lead_id: ${withoutLeadId}\n`);

    if (withoutLeadId === 0) {
      console.log('✅ Todos os contatos já possuem lead_id sincronizado!');
      return;
    }

    // 2. Verificar quantos podem ser sincronizados
    console.log('🔍 Verificando contatos que podem ser sincronizados...');
    
    const { data: syncableContacts, error: syncError } = await supabase.rpc('get_syncable_contacts');
    
    if (syncError) {
      console.error('❌ Erro ao verificar contatos sincronizáveis:', syncError);
      return;
    }

    const syncableCount = syncableContacts?.[0]?.count || 0;
    console.log(`   🎯 Contatos sincronizáveis: ${syncableCount}/${withoutLeadId}\n`);

    // 3. Executar sincronização
    if (syncableCount > 0) {
      console.log('🔧 Executando sincronização...');
      
      const { error: updateError } = await supabase.rpc('sync_contact_lead_ids');
      
      if (updateError) {
        console.error('❌ Erro durante a sincronização:', updateError);
        return;
      }

      console.log(`✅ Sincronização concluída! ${syncableCount} contatos atualizados.\n`);

      // 4. Verificar resultado final
      console.log('📊 Verificando resultado final...');
      
      const { data: finalStats } = await supabase
        .from('contacts')
        .select('lead_id')
        .not('client_id', 'is', null);

      const finalWithLeadId = finalStats.filter(c => c.lead_id !== null).length;
      const finalWithoutLeadId = finalStats.length - finalWithLeadId;

      console.log(`   Total contatos: ${finalStats.length}`);
      console.log(`   ✅ Com lead_id: ${finalWithLeadId}`);
      console.log(`   ❌ Sem lead_id: ${finalWithoutLeadId}`);

      if (finalWithoutLeadId === 0) {
        console.log('\n🎉 SUCESSO! Todos os contatos foram sincronizados!');
      } else {
        console.log(`\n⚠️  Ainda restam ${finalWithoutLeadId} contatos sem lead_id (sem correspondência na tabela leads)`);
      }
    } else {
      console.log('ℹ️  Nenhum contato pode ser sincronizado (sem correspondência de telefone na tabela leads)');
    }

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

// SQL Functions necessárias (criar no Supabase se não existirem)
const sqlFunctions = `
-- Função para contar contatos sincronizáveis
CREATE OR REPLACE FUNCTION get_syncable_contacts()
RETURNS TABLE(count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(*)::bigint
  FROM contacts c
  INNER JOIN leads l ON c.phone = l.phone 
  WHERE c.lead_id IS NULL
    AND c.phone IS NOT NULL
    AND l.phone IS NOT NULL
    AND c.client_id = l.client_id;
END;
$$ LANGUAGE plpgsql;

-- Função para sincronizar contatos
CREATE OR REPLACE FUNCTION sync_contact_lead_ids()
RETURNS void AS $$
BEGIN
  UPDATE contacts 
  SET lead_id = l.id
  FROM leads l
  WHERE contacts.lead_id IS NULL
    AND contacts.phone = l.phone
    AND contacts.phone IS NOT NULL
    AND l.phone IS NOT NULL
    AND contacts.client_id = l.client_id;
END;
$$ LANGUAGE plpgsql;
`;

console.log('💡 Para usar este script, certifique-se de que as funções SQL estão criadas no Supabase:');
console.log(sqlFunctions);
console.log('\n---\n');

if (require.main === module) {
  syncContactLeadIds();
}

module.exports = { syncContactLeadIds };