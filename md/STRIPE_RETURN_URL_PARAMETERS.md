# 🔄 Parâmetros da URL de Retorno do Stripe

## 📋 Visão Geral

Quando o Stripe retorna o usuário após um processo de pagamento (especialmente após 3D Secure), ele inclui parâmetros específicos na URL de retorno que precisamos processar corretamente.

## 🔗 URL de Retorno Típica

```
http://localhost:5173/payment/return?payment_intent=pi_3RygvvH8jGtRbIKF1Loymo0m&payment_intent_client_secret=pi_3RygvvH8jGtRbIKF1Loymo0m_secret_McW5v1H5hhVq1AbIf1NowWGWR&source_type=card
```

## 📝 Parâmetros da URL

### 1. `payment_intent`
- **Descrição**: ID único do PaymentIntent criado no Stripe
- **Formato**: `pi_xxxxxxxxxxxxxxxxxxxxx`
- **Uso**: Identificar o pagamento específico para verificar status

### 2. `payment_intent_client_secret`
- **Descrição**: Chave secreta do cliente para confirmar o pagamento
- **Formato**: `pi_xxxxxxxxxxxxxxxxxxxxx_secret_xxxxxxxxxxxxxxxxxxxxx`
- **Uso**: Confirmação adicional de segurança

### 3. `source_type`
- **Descrição**: Tipo de fonte de pagamento
- **Valores comuns**: `card`, `bank_account`, `sepa_debit`
- **Uso**: Identificar o método de pagamento usado

## 🎯 Como Processamos

### Frontend (PaymentReturn.jsx)

```javascript
// ✅ PROCESSAR: Todos os parâmetros da URL de retorno do Stripe
const processStripeReturnParams = () => {
  const paymentIntentId = searchParams.get('payment_intent');
  const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
  const sourceType = searchParams.get('source_type');
  
  console.log('🔍 PaymentReturn: Parâmetros da URL de retorno do Stripe:', {
    payment_intent: paymentIntentId,
    payment_intent_client_secret: paymentIntentClientSecret,
    source_type: sourceType
  });
  
  if (paymentIntentId) {
    // ✅ VERIFICAR: Status do pagamento no backend
    checkPaymentStatus(paymentIntentId);
    
    // ✅ ARMAZENAR: Parâmetros para uso posterior
    const stripeParams = {
      paymentIntentId,
      paymentIntentClientSecret,
      sourceType,
      timestamp: new Date().toISOString()
    };
    
    sessionStorage.setItem('stripe_return_params', JSON.stringify(stripeParams));
    return stripeParams;
  }
  
  return null;
};
```

### Backend (stripeRoutes.js)

```javascript
// ✅ ROTA: Verificar status do pagamento
router.get('/payment-status/:paymentIntentId', async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    
    // ✅ OBTER: Status do pagamento do Stripe
    const paymentStatus = await stripeService.getPaymentIntent(paymentIntentId);
    
    if (paymentStatus) {
      res.status(200).json({
        success: true,
        data: paymentStatus
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Pagamento não encontrado'
      });
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno ao verificar status do pagamento'
    });
  }
});
```

## 🔄 Fluxo de Processamento

### 1. **Recebimento da URL**
- Usuário retorna do Stripe com parâmetros na URL
- Página `PaymentReturn.jsx` é carregada

### 2. **Extração dos Parâmetros**
- `useSearchParams()` extrai todos os parâmetros
- Parâmetros são validados e processados

### 3. **Verificação do Status**
- `payment_intent` é usado para consultar o backend
- Backend consulta o Stripe via API

### 4. **Armazenamento Temporário**
- Parâmetros são armazenados em `sessionStorage`
- Dados ficam disponíveis para a página de sucesso

### 5. **Redirecionamento**
- Após processamento, usuário é redirecionado para `/payment/signup/success`
- Todos os dados são passados via `state` do React Router

## 🎨 Interface do Usuário

### Seção de Parâmetros do Stripe
```jsx
{/* ✅ PARÂMETROS DO STRIPE - Mostrar dados da URL de retorno */}
{(() => {
  const paymentIntentId = searchParams.get('payment_intent');
  const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
  const sourceType = searchParams.get('source_type');
  
  if (paymentIntentId) {
    return (
      <div className="mb-3 p-2 rounded-lg border border-emerald-500/30 bg-emerald-600/10">
        <p className="text-emerald-300 text-xs font-medium mb-1">
          Parâmetros do Stripe:
        </p>
        <p className="text-emerald-300 text-xs">
          Payment Intent: <span className="text-emerald-200">{paymentIntentId.substring(0, 20)}...</span>
        </p>
        {paymentIntentClientSecret && (
          <p className="text-emerald-300 text-xs">
            Client Secret: <span className="text-emerald-200">{paymentIntentClientSecret.substring(0, 20)}...</span>
          </p>
        )}
        {sourceType && (
          <p className="text-emerald-300 text-xs">
            Tipo: <span className="text-emerald-200">{sourceType}</span>
          </p>
        )}
      </div>
    );
  }
  return null;
})()}
```

## 🔒 Segurança

### 1. **Validação de Parâmetros**
- Todos os parâmetros são extraídos de forma segura
- `payment_intent` é validado antes de consultar o backend

### 2. **Armazenamento Temporário**
- Parâmetros são armazenados apenas em `sessionStorage`
- Dados são limpos automaticamente ao fechar a aba

### 3. **Verificação no Backend**
- Backend valida o `payment_intent` com o Stripe
- Resposta é autenticada antes de ser retornada

## 🧪 Teste

### 1. **URL de Teste**
```
http://localhost:5173/payment/return?payment_intent=pi_test_123&payment_intent_client_secret=pi_test_123_secret_456&source_type=card
```

### 2. **Verificações**
- ✅ Parâmetros são exibidos na interface
- ✅ Status do pagamento é verificado no backend
- ✅ Dados são passados para a página de sucesso
- ✅ Logs mostram o processamento correto

### 3. **Logs Esperados**
```
🔍 PaymentReturn: Parâmetros da URL de retorno do Stripe: {
  payment_intent: "pi_test_123",
  payment_intent_client_secret: "pi_test_123_secret_456",
  source_type: "card"
}
✅ PaymentReturn: Payment Intent ID encontrado na URL: pi_test_123
🔄 PaymentReturn: Verificando status do pagamento: pi_test_123
```

## 🚨 Problemas Comuns

### 1. **Parâmetros Ausentes**
- **Sintoma**: URL sem parâmetros do Stripe
- **Causa**: Usuário acessou a página diretamente
- **Solução**: Redirecionar para página de erro ou cadastro

### 2. **Payment Intent Inválido**
- **Sintoma**: Erro 404 ao verificar status
- **Causa**: ID inválido ou expirado
- **Solução**: Mostrar erro e opção de retry

### 3. **Client Secret Ausente**
- **Sintoma**: Parâmetro `payment_intent_client_secret` não encontrado
- **Causa**: Configuração incorreta do Stripe
- **Solução**: Verificar configuração do webhook e return_url

## 📚 Referências

- [Stripe Return URL Documentation](https://stripe.com/docs/payments/3d-secure#return-url)
- [Payment Intent API Reference](https://stripe.com/docs/api/payment_intents)
- [React Router useSearchParams](https://reactrouter.com/docs/en/v6/hooks/use-search-params)
