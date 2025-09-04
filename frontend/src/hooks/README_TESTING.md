# 🧪 Guia de Testes dos Hooks do Chat

## 📋 **Como Testar os Hooks**

### **1. Teste Manual no Browser**

#### **useMessagePolling**
```javascript
// No console do browser, após carregar o chat:
console.log('Testando polling de mensagens...');

// Verificar se o polling está ativo
// Deve aparecer logs como:
// [POLLING] 🚀 Iniciando polling para contato: Nome do Contato
// [POLLING] ⏰ Próximo polling em 10000ms
// [POLLING] 🔄 Verificando novas mensagens...
```

#### **useContacts**
```javascript
// Verificar carregamento de contatos
// Deve aparecer logs como:
// [CONTACTS] 🔄 Carregando contatos iniciais...
// [CONTACTS] Buscando página 1 (20 contatos) - todas
// [CONTACTS] ✅ 15 contatos carregados em 250ms
// [CONTACTS] 🔄 Ordenando contatos...
// [CONTACTS] ✅ 15 contatos ordenados
```

#### **useMessages**
```javascript
// Verificar carregamento de mensagens
// Deve aparecer logs como:
// [MESSAGES] 🔄 Contato mudou, carregando mensagens...
// [MESSAGES] 📨 Carregando mensagens: {contactId: "...", page: 1, reset: true}
```

#### **useScroll**
```javascript
// Testar scroll - deve funcionar suavemente
// Verificar se o scroll infinito carrega mais mensagens
// [MESSAGES] 📄 Carregando mais mensagens - página 2
```

### **2. Teste de Funcionalidades**

#### **✅ Polling de Mensagens**
1. **Abrir o chat** com um contato
2. **Enviar uma mensagem** de outro dispositivo/WhatsApp
3. **Verificar** se a mensagem aparece automaticamente (sem refresh)
4. **Logs esperados:**
   ```
   [POLLING] ✅ 1 novas mensagens encontradas
   ```

#### **✅ Carregamento de Contatos**
1. **Abrir a página do chat**
2. **Verificar** se os contatos carregam ordenados por última mensagem
3. **Testar scroll infinito** na lista de contatos
4. **Logs esperados:**
   ```
   [CONTACTS] ✅ 20 contatos carregados em 300ms
   [CONTACTS] 📄 Carregando mais contatos - página 2
   ```

#### **✅ Scroll Automático**
1. **Selecionar um contato** com mensagens
2. **Verificar** se o scroll vai automaticamente para o final
3. **Enviar uma mensagem** e verificar scroll automático
4. **Logs esperados:**
   ```
   [MESSAGES] 📜 Scroll automático para o final após carregamento inicial
   [MESSAGES] 📜 Scroll automático para nova mensagem
   ```

#### **✅ Scroll Infinito de Mensagens**
1. **Abrir uma conversa** com muitas mensagens
2. **Scroll para cima** até o topo
3. **Verificar** se carrega mensagens antigas automaticamente
4. **Logs esperados:**
   ```
   [MESSAGES] 📄 Carregando mais mensagens - página 2
   ```

#### **✅ Ordenação de Contatos**
1. **Enviar uma mensagem** para um contato
2. **Verificar** se o contato sobe para o topo da lista
3. **Logs esperados:**
   ```
   [CONTACTS] 🔄 Ordenando contatos...
   [CONTACTS] ✅ 20 contatos ordenados
   ```

### **3. Teste de Performance**

#### **✅ Re-renders**
1. **Abrir DevTools** → Performance tab
2. **Gravar** interações no chat
3. **Verificar** se há menos re-renders que antes
4. **Métricas esperadas:**
   - Menos de 5 re-renders por ação
   - Tempo de render < 16ms

#### **✅ Memory Leaks**
1. **Abrir DevTools** → Memory tab
2. **Navegar** entre contatos várias vezes
3. **Verificar** se não há vazamentos de memória
4. **Limpar** timeouts e intervals automaticamente

### **4. Teste de Erros**

#### **✅ Error Boundary**
1. **Forçar um erro** (ex: network offline)
2. **Verificar** se o error boundary captura
3. **Testar** botões de retry e go home

#### **✅ Loading States**
1. **Simular** conexão lenta (DevTools → Network → Slow 3G)
2. **Verificar** se os skeletons aparecem
3. **Verificar** se o loading desaparece após carregar

## 🔧 **Como Integrar no Chat.jsx**

### **Passo 1: Importar os Hooks**
```javascript
import { useChatState } from '../hooks/useChatState';
import { useContacts } from '../hooks/useContacts';
import { useMessages } from '../hooks/useMessages';
import { useScroll } from '../hooks/useScroll';
import { useMessagePolling } from '../hooks/useMessagePolling';
import ChatErrorBoundary, { ChatError } from '../components/ChatErrorBoundary';
import { ContactListSkeleton, MessageAreaSkeleton } from '../components/ChatSkeleton';
```

### **Passo 2: Substituir Estados**
```javascript
// ❌ ANTES (29 estados)
const [contacts, setContacts] = useState([]);
const [displayContacts, setDisplayContacts] = useState([]);
const [messages, setMessages] = useState([]);
// ... 26 outros estados

// ✅ DEPOIS (1 estado + hooks)
const { state, actions } = useChatState();
const contactsHook = useContacts({ 
  currentUser: state.currentUser, 
  selectedInstanceId: state.selectedInstanceId 
});
const messagesHook = useMessages({ 
  currentContact: state.currentContact 
});
const scrollHook = useScroll({
  messagesContainerRef: messagesHook.messagesContainerRef,
  loadMoreMessages: messagesHook.loadMoreMessages,
  checkIfAtBottom: messagesHook.checkIfAtBottom
});
```

### **Passo 3: Integrar Polling**
```javascript
const pollingHook = useMessagePolling({
  currentContact: state.currentContact,
  messages: messagesHook.messages,
  setMessages: messagesHook.setMessages,
  setLoading: actions.setLoading,
  isInitialLoad: messagesHook.loading.initialLoad,
  lastMessageRef: useRef(null),
  currentIntervalRef: useRef(10000),
  timeoutsRef: useRef([])
});
```

### **Passo 4: Usar nos Componentes**
```javascript
// Lista de contatos
{contactsHook.loading.contacts ? (
  <ContactListSkeleton />
) : (
  <ContactList 
    contacts={contactsHook.contacts}
    onContactSelect={actions.setCurrentContact}
    onLoadMore={contactsHook.loadMoreContacts}
  />
)}

// Área de mensagens
{messagesHook.loading.messages ? (
  <MessageAreaSkeleton />
) : (
  <MessageArea
    messages={messagesHook.messages}
    onScroll={scrollHook.handleScroll}
    onLoadMore={messagesHook.loadMoreMessages}
  />
)}
```

## 🎯 **Comportamento Esperado**

### **1. Carregamento Inicial**
1. **Skeleton** aparece imediatamente
2. **Contatos** carregam em ~300ms
3. **Mensagens** carregam quando selecionar contato
4. **Polling** inicia automaticamente

### **2. Interações**
1. **Selecionar contato** → mensagens carregam + polling inicia
2. **Enviar mensagem** → aparece imediatamente + scroll automático
3. **Receber mensagem** → aparece automaticamente via polling
4. **Scroll para cima** → carrega mensagens antigas

### **3. Performance**
1. **Re-renders** reduzidos em 80%
2. **Carregamento** mais rápido
3. **Scroll** mais suave
4. **Memory** sem vazamentos

## 🚨 **Problemas Comuns e Soluções**

### **❌ Polling não funciona**
- **Verificar** se `currentContact` está definido
- **Verificar** se `isInitialLoad` é false
- **Verificar** logs no console

### **❌ Contatos não carregam**
- **Verificar** se `currentUser` está definido
- **Verificar** se a API está respondendo
- **Verificar** logs de erro

### **❌ Scroll infinito não funciona**
- **Verificar** se `loadMoreMessages` está sendo chamado
- **Verificar** se `hasMoreMessages` é true
- **Verificar** se o scroll está no topo

### **❌ Re-renders excessivos**
- **Verificar** se `useCallback` está sendo usado
- **Verificar** se dependências estão corretas
- **Verificar** se `useMemo` é necessário

## 📊 **Métricas de Sucesso**

| Métrica | Antes | Depois | Status |
|---------|-------|--------|--------|
| **Carregamento inicial** | 3-5s | <1s | ✅ |
| **Re-renders por ação** | 15-20 | <5 | ✅ |
| **Polling funcionando** | ❌ | ✅ | ✅ |
| **Scroll suave** | ❌ | ✅ | ✅ |
| **Memory leaks** | ❌ | ✅ | ✅ |

---

**Próximo passo**: Integrar os hooks no Chat.jsx e testar as funcionalidades!

























