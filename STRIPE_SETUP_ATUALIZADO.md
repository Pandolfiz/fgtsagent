# 🚀 **Guia de Configuração do Stripe - VERSÃO ATUALIZADA**

## **✅ O que foi atualizado**

### **1. IDs dos Produtos Corrigidos**
- ✅ **Básico**: `prod_StLe32rSb1vwni` (R$ 100,00/mês)
- ✅ **Pro**: `prod_StTGwa0T0ZPLjJ` (R$ 299,99/mês)  
- ✅ **Premium**: `prod_StTJjcT9YTpvCz` (R$ 499,99/mês)

### **2. Novas Funcionalidades**
- 🆕 **Opções de pagamento**: Mensal, Semestral e Anual
- 🆕 **Descontos automáticos**: 5-10% para pagamentos semestrais/anuais
- 🆕 **Interface melhorada**: Seleção visual de intervalos
- 🆕 **Webhooks expandidos**: Suporte a eventos de assinatura

## **🔧 Configuração Rápida**

### **Passo 1: Configurar Backend**
```bash
# Na raiz do projeto
cd src
cp env.example .env
nano .env  # Editar com suas credenciais
```

**Arquivo `src/.env`:**
```env
# STRIPE (OBRIGATÓRIO)
STRIPE_SECRET_KEY=sk_live_sua_chave_secreta_de_producao
STRIPE_PUBLISHABLE_KEY=pk_live_sua_chave_publica_de_producao
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret

# APLICAÇÃO
APP_URL=https://fgtsagent.com.br
NODE_ENV=production
PORT=3000

# SUPABASE
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_KEY=sua_chave_de_servico
```

### **Passo 2: Configurar Frontend**
```bash
# No diretório frontend
cd frontend
cp env.example .env
nano .env  # Editar com suas credenciais
```

**Arquivo `frontend/.env`:**
```env
# STRIPE (OBRIGATÓRIO)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_sua_chave_publica_de_producao

# API
VITE_API_URL=https://fgtsagent.com.br
```

### **Passo 3: Reiniciar Aplicação**
```bash
# Na raiz do projeto
npm run dev:all
```

## **💰 Estrutura de Preços Atualizada**

### **Plano Básico**
| Intervalo | Preço | Desconto | ID do Preço |
|-----------|-------|----------|--------------|
| Mensal | R$ 100,00 | - | `price_1RxYwzH8jGtRbIKFzM62Xmkj` |
| Semestral | R$ 95,00 | 5% | `price_1RxYwzH8jGtRbIKFNdCDRlrr` |
| Anual | R$ 90,00 | 10% | `price_1RxYwzH8jGtRbIKFOZFuYVGV` |

### **Plano Pro**
| Intervalo | Preço | Desconto | ID do Preço |
|-----------|-------|----------|--------------|
| Mensal | R$ 299,99 | - | `price_1RxgK6H8jGtRbIKF79rax6aZ` |
| Semestral | R$ 289,99 | 3.3% | `price_1RxgLiH8jGtRbIKFjjtdhuQ4` |
| Anual | R$ 274,99 | 8.3% | `price_1RxgLiH8jGtRbIKFSdpy1d3E` |

### **Plano Premium**
| Intervalo | Preço | Desconto | ID do Preço |
|-----------|-------|----------|--------------|
| Mensal | R$ 499,99 | - | `price_1RxgMnH8jGtRbIKFO9Ictegk` |
| Semestral | R$ 489,99 | 2% | `price_1RxgNdH8jGtRbIKFugHg15Dv` |
| Anual | R$ 449,99 | 10% | `price_1RxgNdH8jGtRbIKFsVrqDeHq` |

## **🔄 Como Mudar de Conta do Stripe**

### **Resposta: SIM, é só mudar as chaves!**

1. **Acesse sua nova conta do Stripe**
2. **Crie produtos com os mesmos nomes** (Básico, Pro, Premium)
3. **Configure preços mensais, semestrais e anuais**
4. **Atualize as variáveis de ambiente** com as novas chaves
5. **Reinicie a aplicação**

**O código se adapta automaticamente!**

## **🧪 Testando a Integração**

### **1. Verificar Planos**
```bash
curl http://localhost:3000/api/stripe/plans
```

### **2. Verificar Plano Específico**
```bash
curl http://localhost:3000/api/stripe/plans/basic
```

### **3. Testar Checkout**
```bash
curl -X POST http://localhost:3000/api/stripe/create-signup-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "planType": "basic",
    "userEmail": "test@example.com",
    "userName": "Test User",
    "interval": "monthly"
  }'
```

## **🎯 Novas Funcionalidades**

### **1. Seleção de Intervalo**
- Interface visual para escolher entre mensal/semestral/anual
- Descontos exibidos automaticamente
- Preços atualizados em tempo real

### **2. Webhooks Expandidos**
- `customer.subscription.created` - Nova assinatura
- `customer.subscription.updated` - Assinatura atualizada
- `customer.subscription.deleted` - Assinatura cancelada

### **3. Metadados Enriquecidos**
- Intervalo de pagamento incluído
- Origem do cadastro (signup)
- Informações do usuário

## **🚨 Solução de Problemas**

### **Erro: "Plano não encontrado"**
- ✅ Verificar se os IDs estão corretos no `stripeService.js`
- ✅ Confirmar se as chaves do Stripe estão configuradas
- ✅ Verificar se o plano existe na conta do Stripe

### **Erro: "Intervalo não suportado"**
- ✅ Verificar se o intervalo está sendo enviado corretamente
- ✅ Confirmar se o plano tem preços para o intervalo solicitado

### **Campo do cartão não aparece**
- ✅ Verificar `VITE_STRIPE_PUBLISHABLE_KEY` no frontend
- ✅ Confirmar se o Stripe está carregando no console do navegador

## **📋 Checklist de Verificação**

- [ ] Chaves do Stripe configuradas (backend e frontend)
- [ ] Arquivos `.env` criados em ambos os diretórios
- [ ] IDs dos produtos atualizados no `stripeService.js`
- [ ] Backend rodando na porta 3000
- [ ] Frontend rodando na porta 5173
- [ ] Endpoint `/api/stripe/plans` funcionando
- [ ] Seleção de intervalos aparecendo
- [ ] Descontos sendo exibidos corretamente
- [ ] Checkout funcionando para todos os intervalos

## **🔗 URLs Importantes**

### **Desenvolvimento**
- **API**: `http://localhost:3000/api/stripe`
- **Frontend**: `http://localhost:5173`

### **Produção**
- **API**: `https://fgtsagent.com.br/api/stripe`
- **Frontend**: `https://fgtsagent.com.br`

## **📞 Suporte**

Se os problemas persistirem:
1. Verifique os logs do console do navegador
2. Verifique os logs do backend
3. Confirme se as chaves do Stripe são válidas
4. Teste com as chaves de teste do Stripe primeiro

---

**Data de Atualização**: 17/01/2025  
**Versão**: 2.0.0  
**Status**: ✅ Pronto para Produção
