# 📱 Status da API da Meta WhatsApp Business

## 🔍 **Endpoint de Verificação**
```bash
GET https://graph.facebook.com/v23.0/{WHATSAPP_BUSINESS_PHONE_NUMBER_ID}?fields=status
Authorization: Bearer {ACCESS_TOKEN}
```

## 📊 **Status Possíveis da API da Meta**

### ✅ **Status Positivos (Verde)**
| **Status** | **Descrição** | **Significado** |
|------------|---------------|-----------------|
| `CONNECTED` | Número conectado e ativo | Número está funcionando normalmente |
| `VERIFIED` | Número verificado | Número passou pela verificação da Meta |
| `APPROVED` | Número aprovado | Número foi aprovado para uso comercial |

### ⏳ **Status Pendentes (Amarelo/Azul)**
| **Status** | **Descrição** | **Significado** |
|------------|---------------|-----------------|
| `PENDING` | Aguardando verificação | Número está em processo de verificação |
| `IN_REVIEW` | Em revisão | Número está sendo revisado pela Meta |

### ❌ **Status Negativos (Vermelho)**
| **Status** | **Descrição** | **Significado** |
|------------|---------------|-----------------|
| `REJECTED` | Número rejeitado | Número foi rejeitado pela Meta |
| `DECLINED` | Número recusado | Número foi recusado na verificação |
| `SUSPENDED` | Número suspenso | Número foi suspenso temporariamente |

### ⚪ **Status Neutros (Cinza)**
| **Status** | **Descrição** | **Significado** |
|------------|---------------|-----------------|
| `DISABLED` | Número desabilitado | Número foi desabilitado permanentemente |

### 🟠 **Status Intermediários (Laranja)**
| **Status** | **Descrição** | **Significado** |
|------------|---------------|-----------------|
| `UNVERIFIED` | Número não verificado | Número ainda não passou pela verificação |

## 🎨 **Mapeamento Visual no Sistema**

### **Cores dos Badges**
- 🟢 **Verde**: `connected`, `verified`, `approved`
- 🟡 **Amarelo**: `pending`, `configuracao_pendente`
- 🔵 **Azul**: `connecting`, `in_review`
- 🔴 **Vermelho**: `disconnected`, `rejected`, `declined`, `suspended`
- ⚪ **Cinza**: `disabled`
- 🟠 **Laranja**: `aguardando_configuracao`, `unverified`

### **Ícones**
- ✅ **Check**: Status positivos
- ⏳ **Hourglass**: Status pendentes
- ❌ **Exclamation**: Status negativos
- 🚫 **Ban**: Status desabilitados
- ❓ **Question**: Status desconhecidos

## 🔄 **Fluxo de Status Típico**

```
UNVERIFIED → PENDING → IN_REVIEW → VERIFIED/APPROVED
     ↓           ↓         ↓              ↓
  Não verificado → Aguardando → Em revisão → Aprovado
```

## 📝 **Exemplo de Resposta da API**

```json
{
  "status": "CONNECTED",
  "id": "123456789012345"
}
```

## 🛠️ **Implementação no Sistema**

### **Backend (Node.js)**
```javascript
const statusMapping = {
  'CONNECTED': 'connected',
  'VERIFIED': 'verified', 
  'PENDING': 'pending',
  'REJECTED': 'rejected',
  'DISABLED': 'disabled',
  'UNVERIFIED': 'unverified',
  'IN_REVIEW': 'in_review',
  'APPROVED': 'approved',
  'DECLINED': 'declined',
  'SUSPENDED': 'suspended'
};
```

### **Frontend (React)**
```typescript
const getStatusConfig = (status: string) => {
  switch (status.toLowerCase()) {
    case 'connected':
    case 'verified':
    case 'approved':
      return { color: 'bg-green-100 text-green-800', label: 'Conectado' };
    // ... outros casos
  }
};
```

## 🔍 **Como Verificar Status**

### **Via API do Sistema**
```bash
# Verificar status de um número específico
GET /api/whatsapp-credentials/{id}/check-status

# Verificar status de todos os números
GET /api/whatsapp-credentials/check-all-status
```

### **Via Interface**
1. Acesse a página de credenciais WhatsApp
2. Para credenciais do tipo "ads":
   - Clique em "Verificar Status" no card individual
   - Ou clique em "Verificar Todos" no cabeçalho
3. O status será atualizado automaticamente

## ⚠️ **Observações Importantes**

1. **Frequência de Verificação**: Evite verificar status muito frequentemente para não sobrecarregar a API da Meta
2. **Cache**: O sistema armazena o último status verificado no banco de dados
3. **Timeout**: A verificação tem timeout de 10 segundos
4. **Erros**: Se a API da Meta retornar erro, o status será marcado como "unknown"

## 📈 **Monitoramento**

O sistema registra logs detalhados para cada verificação:
- Status original retornado pela Meta
- Status mapeado para o sistema
- Erros de comunicação
- Tempo de resposta

---

**Última atualização**: 26/07/2025
**Versão da API Meta**: v23.0 