# 🚀 GUIA DE TESTE EM PRODUÇÃO

## 📋 CHECKLIST PRÉ-TESTE

### ✅ Configuração do Ambiente
- [ ] **Variáveis de Ambiente** configuradas para produção
- [ ] **SSL/HTTPS** funcionando em `fgtsagent.com.br`
- [ ] **Webhooks do Stripe** apontando para produção
- [ ] **Supabase** configurado para produção
- [ ] **Docker** rodando com configuração de produção

### ✅ Verificação de Serviços
- [ ] **Backend** respondendo em `/api/health`
- [ ] **Frontend** carregando corretamente
- [ ] **Nginx** roteando requisições
- [ ] **Webhook endpoint** acessível

## 🧪 TESTE COMPLETO DO FLUXO

### 1️⃣ **TESTE DE CONECTIVIDADE**
```bash
# Executar script de teste
node scripts/test-production-flow.js
```

**Resultado Esperado:**
```
✅ Servidor respondendo
✅ Endpoints principais acessíveis
✅ Pronto para testes de usuário real
```

### 2️⃣ **TESTE DE CADASTRO REAL**
1. **Acessar**: `https://fgtsagent.com.br/signup`
2. **Preencher formulário** com dados reais:
   - Nome: `João Silva`
   - Sobrenome: `Teste`
   - Email: `joao.silva.teste@exemplo.com`
   - Telefone: `(11) 99999-9999`
   - Senha: `Teste123!`
   - Aceitar termos e política
3. **Selecionar plano**: Basic (R$ 29,90/mês)
4. **Clicar em "Continuar"**

**Verificar:**
- ✅ Dados armazenados no localStorage
- ✅ Redirecionamento para Stripe
- ✅ Dados passados corretamente

### 3️⃣ **TESTE DE PAGAMENTO**
1. **No Stripe** (modo de teste):
   - Número: `4242 4242 4242 4242`
   - Data: `12/25`
   - CVC: `123`
   - Nome: `João Silva`
2. **Confirmar pagamento**

**Verificar:**
- ✅ Pagamento processado com sucesso
- ✅ Redirecionamento para PaymentReturn
- ✅ Contador funcionando
- ✅ Redirecionamento para CheckoutSuccess

### 4️⃣ **TESTE DO WEBHOOK**
**Monitorar logs em tempo real:**
```bash
# Opção 1: Script de monitoramento
chmod +x scripts/monitor-production-logs.sh
./scripts/monitor-production-logs.sh

# Opção 2: Docker logs
docker-compose logs -f src
```

**Logs Esperados:**
```
[WEBHOOK] Pagamento bem-sucedido: pi_xxx
[WEBHOOK] Processando pagamento bem-sucedido
[WEBHOOK] Criando usuário após pagamento confirmado: joao.silva.teste@exemplo.com
[WEBHOOK] Usuário criado com sucesso: xxx
[WEBHOOK] Perfil do usuário com dados completos
[WEBHOOK] Cliente na tabela clients
[WEBHOOK] Assinatura ativa criada
```

### 5️⃣ **TESTE DE LOGIN AUTOMÁTICO**
1. **Na página CheckoutSuccess**:
   - ✅ Mensagem de sucesso exibida
   - ✅ Login automático iniciado
   - ✅ Status: "Fazendo login..."
   - ✅ Status: "Logado" ou "Sessão temporária"

2. **Verificar no Supabase**:
   - ✅ Usuário criado com dados corretos
   - ✅ Perfil completo (nome, sobrenome, telefone)
   - ✅ Cliente na tabela clients
   - ✅ Assinatura ativa

## 🔍 MONITORAMENTO EM TEMPO REAL

### **Logs Importantes a Monitorar:**
- `[WEBHOOK]` - Processamento de pagamentos
- `[AUTH]` - Autenticação e criação de usuários
- `[STRIPE]` - Interações com Stripe
- `[ERROR]` - Erros e exceções

### **Comandos Úteis:**
```bash
# Ver logs do backend
docker-compose logs -f src

# Ver logs do nginx
docker-compose logs -f nginx

# Ver logs específicos
grep -i "webhook" logs/backend.log
grep -i "auth" logs/backend.log
grep -i "stripe" logs/backend.log
```

## 🚨 TRATAMENTO DE PROBLEMAS

### **Problema: Usuário não criado**
**Verificar:**
1. Webhook recebido pelo Stripe?
2. Logs do webhook no backend
3. Configuração do Supabase
4. Permissões da service key

### **Problema: Login automático falhando**
**Verificar:**
1. Usuário existe no Supabase?
2. Endpoint `/api/auth/auto-login` funcionando?
3. JWT sendo gerado corretamente?
4. Dados passados corretamente?

### **Problema: Página em branco**
**Verificar:**
1. Console do navegador (F12)
2. Logs do frontend
3. Configuração do Vite
4. Build de produção

## 📊 MÉTRICAS DE SUCESSO

### **Taxa de Sucesso Esperada:**
- ✅ **Cadastro**: 100%
- ✅ **Pagamento**: 100% (modo teste)
- ✅ **Webhook**: 100%
- ✅ **Criação de Usuário**: 100%
- ✅ **Login Automático**: 95%+

### **Tempo de Resposta:**
- **Cadastro → Stripe**: < 3 segundos
- **Pagamento → Webhook**: < 10 segundos
- **Webhook → Usuário Criado**: < 5 segundos
- **CheckoutSuccess → Login**: < 3 segundos

## 🎯 PRÓXIMOS PASSOS APÓS TESTE

1. **✅ Validar** todos os fluxos funcionando
2. **📊 Monitorar** logs por 24h
3. **🧪 Testar** com diferentes planos
4. **🔒 Verificar** segurança e validações
5. **📱 Testar** em diferentes dispositivos
6. **🌐 Testar** em diferentes navegadores

## 📞 SUPORTE

**Em caso de problemas:**
1. **Verificar logs** primeiro
2. **Executar** script de teste
3. **Consultar** documentação
4. **Contatar** equipe de desenvolvimento

---

**🎉 BOA SORTE NO TESTE EM PRODUÇÃO! 🎉**

