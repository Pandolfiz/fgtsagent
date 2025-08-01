# 🚀 Estratégia Híbrida de Rate Limiting

## 📋 Visão Geral

Implementamos uma **estratégia híbrida** que combina **Rate Limiting** e **Speed Limiting** para oferecer máxima proteção com melhor experiência do usuário.

## 🎯 Estratégia Implementada

### **Rate Limiting (Proteção Contra Ataques Massivos)**
- **Limite alto**: Bloqueia apenas ataques massivos
- **Proteção crítica**: Impede sobrecarga do servidor
- **Última linha de defesa**: Ativado apenas em casos extremos

### **Speed Limiting (Melhor UX)**
- **Desaceleração gradual**: Usuários legítimos continuam usando
- **Feedback progressivo**: Usuário percebe que algo está acontecendo
- **Proteção inteligente**: Dificulta ataques sem bloquear operações

## 📊 Configurações por Categoria

### **1. Global**
```javascript
// Rate Limiting
max: 5000 requisições / 15 minutos

// Speed Limiting
delayAfter: 200 requisições
delayMs: 100ms por requisição adicional
maxDelayMs: 3000ms (3 segundos)
```

### **2. APIs**
```javascript
// Rate Limiting
max: 3000 requisições / 15 minutos

// Speed Limiting
delayAfter: 150 requisições
delayMs: 200ms por requisição adicional
maxDelayMs: 5000ms (5 segundos)
```

### **3. Autenticação**
```javascript
// Rate Limiting
max: 100 tentativas / 15 minutos

// Speed Limiting
delayAfter: 10 tentativas
delayMs: 1000ms por tentativa adicional
maxDelayMs: 15000ms (15 segundos)
```

### **4. Uploads**
```javascript
// Rate Limiting
max: 50 uploads / 15 minutos

// Speed Limiting
delayAfter: 5 uploads
delayMs: 2000ms por upload adicional
maxDelayMs: 20000ms (20 segundos)
```

### **5. SMS (Mantido Original)**
```javascript
// Rate Limiting Específico (NÃO alterado)
minIntervalMs: 5 minutos entre requisições
maxAttemptsPerHour: 3 tentativas
blockDurationMs: 30 minutos de bloqueio
```

## 🔄 Fluxo de Proteção

### **Fase 1: Uso Normal**
- ✅ Resposta imediata
- ⏱️ Sem atraso
- 🚀 Performance máxima

### **Fase 2: Speed Limiting**
- ⏳ Atraso progressivo
- 📈 Atraso crescente por requisição
- 🔄 Requisições ainda processadas

### **Fase 3: Rate Limiting (Extremo)**
- 🛑 Bloqueio total
- ❌ Erro 429
- ⏰ Aguardar reset da janela

## 🎯 Benefícios da Estratégia

### **Para Usuários Legítimos**
- ✅ Operações não são perdidas abruptamente
- ✅ Feedback gradual sobre uso excessivo
- ✅ Possibilidade de concluir operações importantes
- ✅ Melhor experiência geral

### **Para Segurança**
- 🛡️ Proteção contra ataques massivos
- 🛡️ Dificulta ataques de força bruta
- 🛡️ Previne scraping automatizado
- 🛡️ Protege recursos do servidor

### **Para Monitoramento**
- 📊 Headers informativos sobre status
- 📊 Logs detalhados de rate limiting
- 📊 Métricas de uso por categoria
- 📊 Alertas para uso anormal

## 📈 Headers de Resposta

### **Speed Limiting**
```
X-Slow-Down: 500        // Atraso atual em ms
X-Slow-Down-Remaining: 50 // Requisições restantes antes do atraso
```

### **Rate Limiting**
```
X-RateLimit-Limit: 5000     // Limite total
X-RateLimit-Remaining: 4500 // Requisições restantes
X-RateLimit-Reset: 1234567890 // Timestamp do reset
```

## 🔧 Configuração por Ambiente

### **Desenvolvimento**
- ❌ Rate limiting desabilitado
- ❌ Speed limiting desabilitado
- ✅ Desenvolvimento sem restrições

### **Produção**
- ✅ Rate limiting habilitado
- ✅ Speed limiting habilitado
- ✅ Proteção completa ativa

## 📝 Logs e Monitoramento

### **Logs de Speed Limiting**
```
[SPEED_LIMIT] Desaceleração aplicada para IP: 192.168.1.1
[SPEED_LIMIT] Atraso: 500ms, Requisições: 250/200
```

### **Logs de Rate Limiting**
```
[RATE_LIMIT] Limite excedido para IP: 192.168.1.1
[RATE_LIMIT] Bloqueio aplicado até: 2025-08-01T16:00:00Z
```

## 🚀 Próximos Passos

1. **Monitoramento**: Implementar alertas para uso anormal
2. **Métricas**: Dashboard de uso de rate limiting
3. **Ajustes**: Fine-tuning baseado em uso real
4. **Documentação**: Guia para desenvolvedores

## 💡 Dicas de Uso

### **Para Desenvolvedores**
- Sempre verificar headers de resposta
- Implementar retry com backoff exponencial
- Monitorar logs de rate limiting
- Testar limites em ambiente de desenvolvimento

### **Para Usuários**
- Aguardar tempo necessário antes de tentar novamente
- Verificar mensagens de erro para orientação
- Contatar suporte se problemas persistirem
- Usar funcionalidades de forma responsável

---

**Implementado em**: Agosto 2025  
**Versão**: 1.0  
**Status**: Ativo em Produção 