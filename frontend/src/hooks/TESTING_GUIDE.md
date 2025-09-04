# 🧪 Guia de Teste dos Hooks do Chat

## 🚀 **Como Testar os Hooks**

### **1. Acessar o Demo**
```
URL: http://localhost:5173/chat-hooks-demo
```

### **2. Verificar o Console do Browser**
Abra o DevTools (F12) → Console para ver os logs em tempo real.

## 📋 **Testes Passo a Passo**

### **✅ Teste 1: Carregamento Inicial**
1. **Acesse** `/chat-hooks-demo`
2. **Verifique** se aparece o skeleton de loading
3. **Aguarde** o carregamento dos contatos
4. **Logs esperados:**
   ```
   [CONTACTS] 🔄 Carregando contatos iniciais...
   [CONTACTS] Buscando página 1 (20 contatos) - todas
   [CONTACTS] ✅ X contatos carregados em XXXms
   [CONTACTS] 🔄 Ordenando contatos...
   [CONTACTS] ✅ X contatos ordenados
   ```

### **✅ Teste 2: Seleção de Contato**
1. **Clique** em um contato na lista
2. **Verifique** se as mensagens carregam
3. **Verifique** se o scroll vai automaticamente para o final
4. **Verifique** se o polling inicia
5. **Logs esperados:**
   ```
   [MESSAGES] 🔄 Contato mudou, carregando mensagens...
   [MESSAGES] 📨 Carregando mensagens: {contactId: "...", page: 1, reset: true}
   [MESSAGES] 📜 Scroll automático para o final após carregamento inicial
   [POLLING] 🚀 Iniciando polling para contato: Nome do Contato
   [POLLING] ⏰ Próximo polling em 10000ms
   ```

### **✅ Teste 3: Envio de Mensagem**
1. **Digite** uma mensagem no input
2. **Pressione** Enter ou clique em "Enviar"
3. **Verifique** se a mensagem aparece imediatamente
4. **Verifique** se o scroll vai automaticamente para o final
5. **Logs esperados:**
   ```
   [MESSAGES] 📜 Scroll automático para nova mensagem
   ```

### **✅ Teste 4: Polling de Mensagens**
1. **Selecione** um contato
2. **Clique** em "Forçar Polling"
3. **Verifique** os logs de polling
4. **Logs esperados:**
   ```
   [POLLING] 🔄 Verificando novas mensagens...
   [POLLING] ✅ X novas mensagens encontradas
   ```

### **✅ Teste 5: Sincronização de Contatos**
1. **Clique** em "Sincronizar Contatos"
2. **Verifique** se os contatos são recarregados
3. **Logs esperados:**
   ```
   [CONTACTS] 🔄 Sincronizando contatos...
   [CONTACTS] ✅ X contatos carregados em XXXms
   ```

### **✅ Teste 6: Scroll Infinito**
1. **Selecione** um contato com muitas mensagens
2. **Scroll** para cima até o topo
3. **Verifique** se carrega mensagens antigas
4. **Logs esperados:**
   ```
   [MESSAGES] 📄 Carregando mais mensagens - página 2
   ```

### **✅ Teste 7: Error Boundary**
1. **Clique** em "Testar Erro"
2. **Verifique** se o erro aparece
3. **Clique** em "Fechar" para testar o dismiss
4. **Clique** em "Tentar Novamente" para testar o retry

### **✅ Teste 8: Performance**
1. **Abra** DevTools → Performance
2. **Grave** interações no chat
3. **Verifique** se há menos re-renders
4. **Métricas esperadas:**
   - Re-renders < 5 por ação
   - Tempo de render < 16ms

## 🔍 **Verificações Importantes**

### **Status dos Hooks**
- ✅ **Estado do Chat**: Usuário logado, contato selecionado
- ✅ **Contatos**: Total carregado, loading states
- ✅ **Mensagens**: Total carregado, não lidas
- ✅ **Polling**: Ativo, intervalo correto

### **Funcionalidades**
- ✅ **Carregamento**: Skeletons aparecem e desaparecem
- ✅ **Interações**: Cliques funcionam
- ✅ **Scroll**: Suave e responsivo
- ✅ **Polling**: Atualiza automaticamente

### **Comportamento do Scroll**
- ✅ **Seleção de contato**: Scroll automático para o final
- ✅ **Nova mensagem**: Scroll automático se estiver próximo do final
- ✅ **Scroll manual**: Preserva posição quando carrega mensagens antigas
- ✅ **Botão "Scroll para Baixo"**: Força scroll para o final

### **Performance**
- ✅ **Re-renders**: Mínimos
- ✅ **Memory**: Sem vazamentos
- ✅ **Network**: Requests otimizados

## 🚨 **Problemas Comuns**

### **❌ Contatos não carregam**
- **Verificar** se o backend está rodando
- **Verificar** se a API `/api/contacts` responde
- **Verificar** logs de erro no console

### **❌ Polling não funciona**
- **Verificar** se um contato está selecionado
- **Verificar** se `isInitialLoad` é false
- **Verificar** se há erros de rede

### **❌ Mensagens não carregam**
- **Verificar** se o contato tem `remote_jid`
- **Verificar** se a API `/api/chat/messages` responde
- **Verificar** logs de erro

### **❌ Re-renders excessivos**
- **Verificar** se `useCallback` está sendo usado
- **Verificar** se dependências estão corretas
- **Verificar** se `useMemo` é necessário

## 📊 **Métricas de Sucesso**

| Teste | Status | Tempo | Observações |
|-------|--------|-------|-------------|
| Carregamento inicial | ✅ | < 1s | Skeletons funcionam |
| Seleção de contato | ✅ | < 500ms | Mensagens carregam |
| Envio de mensagem | ✅ | Instantâneo | Scroll automático |
| Polling | ✅ | 10s | Atualiza automaticamente |
| Sincronização | ✅ | < 1s | Contatos recarregam |
| Scroll infinito | ✅ | < 500ms | Mensagens antigas |
| Error boundary | ✅ | Instantâneo | Erro capturado |
| Performance | ✅ | < 16ms | Re-renders mínimos |

## 🎯 **Próximos Passos**

1. **✅ Testar** todos os cenários acima
2. **✅ Verificar** logs no console
3. **✅ Confirmar** performance
4. **🔄 Integrar** no Chat.jsx principal
5. **🔄 Testar** em produção

---

**Resultado esperado**: Todos os hooks funcionando perfeitamente, com performance otimizada e UX melhorada!

























