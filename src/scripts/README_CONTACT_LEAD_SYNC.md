# 📞 Sincronização Contact ↔ Lead IDs

## 📋 Visão Geral

Este documento descreve o processo de sincronização entre as tabelas `contacts` e `leads` baseado no campo `phone`.

## 🎯 Objetivo

Manter os campos `lead_id` da tabela `contacts` sincronizados com os IDs correspondentes da tabela `leads` usando o telefone como chave de ligação.

## 📊 Estrutura das Tabelas

### `contacts`
- `remote_jid` (PK)
- `phone` (texto)
- `lead_id` (UUID) → referencia `leads.id`
- `client_id` (UUID)

### `leads` 
- `id` (UUID, PK)
- `phone` (texto)
- `client_id` (UUID)

## 🔄 Processo de Sincronização

### 1. Identificar Contatos Desatualizados
```sql
SELECT COUNT(*) 
FROM contacts 
WHERE lead_id IS NULL 
  AND phone IS NOT NULL;
```

### 2. Verificar Correspondências Disponíveis
```sql
SELECT COUNT(*)
FROM contacts c
INNER JOIN leads l ON c.phone = l.phone 
WHERE c.lead_id IS NULL
  AND c.client_id = l.client_id;
```

### 3. Executar Sincronização
```sql
UPDATE contacts 
SET lead_id = l.id
FROM leads l
WHERE contacts.lead_id IS NULL
  AND contacts.phone = l.phone
  AND contacts.client_id = l.client_id;
```

## 🚀 Como Executar

### Opção 1: Script Automatizado
```bash
node src/scripts/sync_contact_lead_ids.js
```

### Opção 2: SQL Direto (Supabase)
```sql
-- Via mcp_supabase ou dashboard do Supabase
UPDATE contacts 
SET lead_id = l.id
FROM leads l
WHERE contacts.lead_id IS NULL
  AND contacts.phone = l.phone
  AND contacts.client_id = l.client_id;
```

## 📈 Resultados da Última Execução

**Data:** 02/08/2025

### Antes:
- Total contatos: 65
- ✅ Com lead_id: 42
- ❌ Sem lead_id: 23

### Depois:
- Total contatos: 65  
- ✅ Com lead_id: 65
- ❌ Sem lead_id: 0
- 🎯 **100% sincronizado!**

### Exemplos Sincronizados:
- Gabriel Pandolfi (5527997360148) ✅
- Ycaro (556992074803) ✅  
- Mih (5511992730901) ✅
- ECI (5521966506610) ✅
- Alex (555198974036) ✅

## ⚠️ Considerações Importantes

### 1. **Integridade dos Dados**
- Só sincroniza quando `phone` é exatamente igual
- Respeita o `client_id` (não mistura dados entre clientes)
- Não sobrescreve `lead_id` existentes

### 2. **Quando Executar**
- Quando novos contatos são criados sem `lead_id`
- Após importações de dados
- Periodicamente para manutenção

### 3. **Casos Especiais**
- Contatos sem telefone não podem ser sincronizados
- Leads sem telefone não podem ser usados como referência
- Telefones duplicados podem causar conflitos

## 🔍 Verificações de Saúde

### Verificar Contatos Órfãos
```sql
SELECT COUNT(*) 
FROM contacts 
WHERE lead_id IS NULL 
  AND phone IS NOT NULL;
```

### Verificar Leads Órfãos  
```sql
SELECT COUNT(*)
FROM leads l
LEFT JOIN contacts c ON l.id = c.lead_id
WHERE c.lead_id IS NULL;
```

### Verificar Inconsistências
```sql
SELECT c.remote_jid, c.phone as contact_phone, l.phone as lead_phone
FROM contacts c
INNER JOIN leads l ON c.lead_id = l.id
WHERE c.phone != l.phone;
```

## 📝 Logs e Warnings

### Warnings Normais:
```
[WARN] Contato 5527997186150_5521966506610 não possui lead_id associado
```
**Status:** ✅ Resolvido após sincronização

### Próximos Steps:
1. Automatizar sincronização em tempo real via triggers
2. Implementar validações de integridade
3. Criar dashboard de monitoramento

## 🏗️ Automação Futura

### Trigger SQL (Para implementar):
```sql
CREATE OR REPLACE FUNCTION sync_contact_lead_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lead_id IS NULL AND NEW.phone IS NOT NULL THEN
    UPDATE contacts 
    SET lead_id = (
      SELECT id FROM leads 
      WHERE phone = NEW.phone 
        AND client_id = NEW.client_id 
      LIMIT 1
    )
    WHERE remote_jid = NEW.remote_jid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_contact_lead
  AFTER INSERT ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION sync_contact_lead_on_insert();
```