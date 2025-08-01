# 🎯 Sistema de Modais Customizados

## 📋 Visão Geral

Substituímos os popups nativos do navegador (`alert()`, `confirm()`, `prompt()`) por modais customizados que seguem a identidade visual do projeto com tema escuro e gradientes azul/cyan.

## 🚀 Como Usar

### 1. **Importar os Componentes**

```typescript
import { ErrorModal } from '../ErrorModal';
import { useErrorModal } from '../../hooks/useErrorModal';
```

### 2. **Usar o Hook no Componente**

```typescript
export function MeuComponente() {
  // Hook para gerenciar modais de erro
  const { modalState, showError, showWarning, showInfo, showSuccess, closeModal } = useErrorModal();

  // ... resto do código
}
```

### 3. **Adicionar o Modal no JSX**

```typescript
return (
  <div>
    {/* Seu conteúdo aqui */}
    
    {/* Modal de Erro Customizado */}
    <ErrorModal
      isOpen={modalState.isOpen}
      onClose={closeModal}
      title={modalState.title}
      message={modalState.message}
      type={modalState.type}
      metaCode={modalState.metaCode}
      metaSubcode={modalState.metaSubcode}
    />
  </div>
);
```

## 🎨 Tipos de Modal

### **1. Modal de Erro**
```typescript
showError(
  'Mensagem de erro aqui',
  'Título do Erro',
  metaCode, // Código da Meta API (opcional)
  metaSubcode // Subcódigo da Meta API (opcional)
);
```

### **2. Modal de Aviso**
```typescript
showWarning(
  'Mensagem de aviso aqui',
  'Título do Aviso'
);
```

### **3. Modal de Informação**
```typescript
showInfo(
  'Mensagem informativa aqui',
  'Título da Informação'
);
```

### **4. Modal de Sucesso**
```typescript
showSuccess(
  'Operação realizada com sucesso!',
  'Sucesso'
);
```

## 📱 Exemplos Práticos

### **Exemplo 1: Erro de API**
```typescript
try {
  const response = await api.someEndpoint();
  const result = await response.json();
  
  if (result.success) {
    showSuccess('Dados salvos com sucesso!', 'Sucesso');
  } else {
    showError(
      result.error,
      'Erro ao Salvar',
      result.metaCode,
      result.metaSubcode
    );
  }
} catch (err) {
  showError(
    'Erro de conexão: ' + err.message,
    'Erro de Rede'
  );
}
```

### **Exemplo 2: Validação de Formulário**
```typescript
const handleSubmit = (data) => {
  if (!data.email) {
    showWarning('Por favor, preencha o campo de email.', 'Campo Obrigatório');
    return;
  }
  
  if (!isValidEmail(data.email)) {
    showError('Email inválido. Verifique o formato.', 'Email Inválido');
    return;
  }
  
  // Continuar com o envio...
};
```

### **Exemplo 3: Confirmação de Ação**
```typescript
const handleDelete = () => {
  showWarning(
    'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.',
    'Confirmar Exclusão'
  );
};
```

## 🎨 Identidade Visual

### **Tema Escuro com Gradientes**
- **Fundo**: Gradientes escuros com transparência
- **Bordas**: Cores específicas por tipo com transparência
- **Texto**: Branco/cinza claro para melhor contraste
- **Botões**: Gradientes coloridos com efeitos hover

### **Cores por Tipo**
- **Erro**: Gradiente vermelho/rosa (`from-red-900/90 to-pink-900/90`)
- **Aviso**: Gradiente amarelo/âmbar (`from-yellow-900/90 to-amber-900/90`)
- **Informação**: Gradiente cyan/azul (`from-cyan-900/90 to-blue-900/90`)
- **Sucesso**: Gradiente verde/esmeralda (`from-green-900/90 to-emerald-900/90`)

### **Ícones**
- **Erro**: `FaExclamationTriangle` (vermelho claro)
- **Aviso**: `FaExclamationTriangle` (amarelo claro)
- **Informação**: `FaInfoCircle` (cyan claro)
- **Sucesso**: `FaCheckCircle` (verde claro)

### **Efeitos Visuais**
- **Backdrop**: Fundo escuro com blur
- **Animações**: Transições suaves de entrada/saída
- **Hover**: Efeitos de escala e sombra nos botões
- **Bordas**: Transparência e gradientes

## 🔧 Migração de Alert()

### **Antes (Alert Nativo)**
```typescript
alert('Erro ao salvar dados: ' + error.message);
```

### **Depois (Modal Customizado)**
```typescript
showError('Erro ao salvar dados: ' + error.message, 'Erro ao Salvar');
```

## 📊 Vantagens

### **✅ Benefícios**
1. **Identidade Visual**: Segue o design escuro do projeto
2. **Melhor UX**: Animações suaves e feedback visual
3. **Flexibilidade**: Diferentes tipos de modal
4. **Códigos Meta**: Suporte específico para erros da Meta API
5. **Responsivo**: Funciona bem em mobile
6. **Acessibilidade**: Melhor suporte a leitores de tela

### **❌ Problemas Resolvidos**
1. **Popups Bloqueados**: Não depende de bloqueadores de popup
2. **UX Inconsistente**: Agora segue o padrão do projeto
3. **Limitações de Estilo**: Totalmente customizável
4. **Informações Técnicas**: Foco na experiência do usuário

## 🚨 Casos Especiais

### **Erros da Meta API**
```typescript
showError(
  result.error_user_msg || 'Erro desconhecido',
  result.error_user_title || 'Erro da Meta API',
  result.metaCode,
  result.metaSubcode
);
```

### **Logs de Debug (Apenas no Console)**
```typescript
// Log técnico apenas no console para desenvolvedores
console.error('Detalhes técnicos:', error.stack, context);

// Modal limpo para o usuário
showError('Erro interno do sistema', 'Erro Técnico');
```

## 📝 Checklist de Migração

- [ ] Importar `ErrorModal` e `useErrorModal`
- [ ] Adicionar hook no componente
- [ ] Substituir `alert()` por `showError()`
- [ ] Substituir `confirm()` por modal customizado
- [ ] Adicionar `ErrorModal` no JSX
- [ ] Testar todos os cenários de erro
- [ ] Verificar responsividade
- [ ] Testar acessibilidade

---

**🎯 Resultado**: Modais nativos do aplicativo com identidade visual consistente e foco na experiência do usuário! ✨ 