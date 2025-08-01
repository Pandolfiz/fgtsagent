# 🔐 Migração de Segurança Cibernética

## 📋 Instruções para Aplicar as Migrações

### 1. **Aplicar Migração Manual no Supabase**

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para o seu projeto
3. Clique em **"SQL Editor"** no menu lateral
4. Crie uma nova query
5. Copie e cole o conteúdo do arquivo `apply_security_migration_manual.sql`
6. Execute o script

### 2. **Verificar Tabelas Criadas**

Após executar o script, verifique se as seguintes tabelas foram criadas:

- ✅ `security_logs` - Logs de tentativas de login
- ✅ `data_access_logs` - Logs de acesso a dados sensíveis
- ✅ `transaction_logs` - Logs de transações financeiras
- ✅ `security_alerts` - Alertas de segurança
- ✅ `security_incidents` - Incidentes de segurança
- ✅ `security_vulnerabilities` - Vulnerabilidades detectadas
- ✅ `security_reports` - Relatórios de segurança

### 3. **Verificar Políticas RLS**

Confirme que as políticas de Row Level Security foram criadas:

```sql
-- Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename LIKE 'security_%';
```

### 4. **Testar Sistema de Segurança**

1. **Teste de Login**: Faça login no sistema para verificar se os logs estão sendo registrados
2. **Teste de Acesso a Dados**: Acesse dados sensíveis para verificar monitoramento
3. **Teste de Transações**: Execute uma transação para verificar logs financeiros

### 5. **Configurar Limpeza Automática (Opcional)**

Para configurar limpeza automática de logs antigos:

```sql
-- Criar job para limpeza diária (se suportado pelo seu plano)
SELECT cron.schedule(
  'cleanup-security-logs',
  '0 2 * * *', -- 2h da manhã todos os dias
  'SELECT cleanup_old_security_logs();'
);
```

## 🚨 Troubleshooting

### Erro: "relation does not exist"
- **Causa**: Tabelas não foram criadas
- **Solução**: Execute o script SQL manual novamente

### Erro: "permission denied"
- **Causa**: Políticas RLS muito restritivas
- **Solução**: Verificar se o usuário tem permissões adequadas

### Erro: "function does not exist"
- **Causa**: Funções não foram criadas
- **Solução**: Verificar se o script SQL foi executado completamente

## 📊 Monitoramento

### Verificar Logs de Segurança

```sql
-- Ver logs de login recentes
SELECT * FROM security_logs 
ORDER BY timestamp DESC 
LIMIT 10;

-- Ver alertas de segurança
SELECT * FROM security_alerts 
WHERE resolved = false 
ORDER BY timestamp DESC;

-- Gerar relatório de segurança
SELECT generate_security_report(
  NOW() - INTERVAL '7 days',
  NOW()
);
```

## 🔧 Configuração Avançada

### Personalizar Critérios de Detecção

Edite o arquivo `src/services/securityMonitoringService.js` para ajustar:

- Limites de tentativas de login
- Critérios de atividades suspeitas
- Configurações de notificação

### Configurar Notificações

Para configurar notificações por email:

1. Configure as variáveis de ambiente para SMTP
2. Descomente o código de envio de email no método `notifySecurityTeam`
3. Teste o envio de alertas

## 📈 Próximos Passos

1. **Monitoramento Contínuo**: Acompanhe os logs de segurança regularmente
2. **Análise de Padrões**: Identifique padrões de uso normais vs. suspeitos
3. **Ajuste de Políticas**: Refine as políticas RLS conforme necessário
4. **Treinamento da Equipe**: Treine a equipe nos procedimentos de segurança
5. **Auditoria Regular**: Faça auditorias periódicas do sistema de segurança

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs do servidor
2. Consulte a documentação do Supabase
3. Teste as queries SQL individualmente
4. Verifique as permissões do usuário do banco

---

**⚠️ Importante**: Este sistema de segurança é uma camada adicional de proteção. Mantenha sempre as melhores práticas de segurança e monitore regularmente os logs e alertas. 