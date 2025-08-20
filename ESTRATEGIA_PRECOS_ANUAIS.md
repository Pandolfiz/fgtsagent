# 💰 **Estratégia de Preços Anuais - FGTS Agent**

## **🎯 Objetivo da Estratégia**

Implementar uma **estratégia de preços contrastante** que estimule os usuários a escolher planos anuais, aumentando o **LTV (Lifetime Value)** e reduzindo a **churn rate**.

## **📊 Estrutura de Preços Implementada**

### **1. Plano Básico**
| Tipo | Preço | Economia | ID Stripe |
|------|-------|----------|-----------|
| **Mensal** | ~~R$ 100,00/mês~~ | - | `price_1RxYwzH8jGtRbIKFzM62Xmkj` |
| **Anual** | **R$ 90,00/mês** | **R$ 120,00/ano** | `price_1RxYwzH8jGtRbIKFOZFuYVGV` |

### **2. Plano Pro**
| Tipo | Preço | Economia | ID Stripe |
|------|-------|----------|-----------|
| **Mensal** | ~~R$ 299,99/mês~~ | - | `price_1RxgK6H8jGtRbIKF79rax6aZ` |
| **Anual** | **R$ 274,99/mês** | **R$ 300,00/ano** | `price_1RxgLiH8jGtRbIKFSdpy1d3E` |

### **3. Plano Premium**
| Tipo | Preço | Economia | ID Stripe |
|------|-------|----------|-----------|
| **Mensal** | ~~R$ 499,99/mês~~ | - | `price_1RxgMnH8jGtRbIKFO9Ictegk` |
| **Anual** | **R$ 449,99/mês** | **R$ 600,00/ano** | `price_1RxgNdH8jGtRbIKFsVrqDeHq` |

## **💳 Modelo de Cobrança**

### **Cobrança Mensal com Desconto Anual**
- **Todos os planos** são cobrados **mensalmente**
- **Desconto anual** é aplicado automaticamente quando o usuário escolhe o plano anual
- **Compromisso anual** garante o desconto mensal durante 12 meses
- **Cancelamento** pode ser feito a qualquer momento (sem multa)

### **Exemplo de Funcionamento:**
- **Plano Pro Mensal**: R$ 299,99/mês (cobrado mensalmente)
- **Plano Pro Anual**: R$ 274,99/mês (cobrado mensalmente com desconto garantido por 12 meses)
- **Economia**: R$ 25,00/mês × 12 meses = R$ 300,00/ano

## **🎨 Implementação Visual**

### **1. Landing Page Principal (`Home.jsx`)**
- ✅ **Preço mensal riscado** em cinza claro
- ✅ **Preço anual em destaque** com cor vibrante
- ✅ **Indicador de economia** com emoji 💰
- ✅ **Botões direcionam para plano anual** por padrão
- ✅ **Seção de dica de economia** destacada

### **2. Componente de Seleção (`PricingPlans.jsx`)**
- ✅ **Contraste visual** entre mensal e anual
- ✅ **Desconto destacado** em verde
- ✅ **Indicador de economia anual** abaixo do botão

### **3. Página de Sucesso (`CheckoutSuccess.jsx`)**
- ✅ **Preços anuais** com economia destacada
- ✅ **Informação clara** sobre cobrança mensal com desconto anual

## **🧠 Psicologia da Estratégia**

### **1. Efeito de Contraste**
- **Preço mensal riscado** cria referência de "preço normal"
- **Preço anual destacado** parece uma oferta especial
- **Economia visualizada** torna a decisão mais fácil

### **2. Ancoragem de Preço**
- Usuário vê primeiro o preço mensal como referência
- Preço anual parece uma "oferta imperdível"
- Economia anual é um bônus psicológico

### **3. Redução de Fricção**
- **Decisão simplificada**: anual é claramente melhor
- **Valor percebido** aumenta com a economia
- **Compromisso antecipado** reduz churn
- **Flexibilidade** mantida (cobrança mensal)

## **📈 Benefícios Esperados**

### **1. Para o Negócio**
- **LTV aumentado** em 20-30%
- **Churn reduzido** por compromisso anual
- **Cash flow estável** com cobranças mensais
- **Custo de aquisição** diluído ao longo do ano

### **2. Para o Usuário**
- **Economia real** de R$ 120 a R$ 600 por ano
- **Previsibilidade** de custos mensais
- **Acesso imediato** a todos os recursos
- **Flexibilidade** para cancelar quando necessário
- **Desconto garantido** por 12 meses

## **🔧 Implementação Técnica**

### **1. Frontend**
- **Preços hardcoded** na landing page principal
- **Componentes dinâmicos** para seleção de planos
- **URLs com parâmetro** `interval=annual` por padrão

### **2. Backend**
- **IDs de preços** atualizados para produção
- **Suporte a intervalos** mensal/semestral/anual
- **Webhooks** para eventos de assinatura

### **3. Stripe**
- **Produtos configurados** com preços anuais
- **Descontos automáticos** aplicados mensalmente
- **Webhooks** para sincronização

## **📱 Experiência do Usuário**

### **1. Fluxo de Conversão**
1. **Usuário vê landing page** com preços contrastantes
2. **Preço anual destacado** chama atenção
3. **Economia visualizada** facilita decisão
4. **Botão direciona** para plano anual
5. **Checkout otimizado** para intervalo anual

### **2. Elementos Visuais**
- **Preço mensal riscado** em cinza
- **Preço anual em destaque** com cor do plano
- **Emoji 💰** para economia
- **Bordas e sombras** para destaque
- **Gradientes** para atratividade

## **📊 Métricas de Sucesso**

### **1. Conversão**
- **Taxa de conversão** de visitantes para assinantes
- **Proporção** de planos anuais vs mensais
- **Abandono** no checkout

### **2. Receita**
- **ARPU** (Average Revenue Per User)
- **LTV** (Lifetime Value)
- **Churn rate** por tipo de plano

### **3. Engajamento**
- **Retenção** de usuários anuais
- **Uso da plataforma** por tipo de plano
- **Satisfação** do cliente

## **🚀 Próximos Passos**

### **1. Testes A/B**
- **Versão atual** vs versão anterior
- **Diferentes layouts** de preços
- **Variações** de cores e emojis

### **2. Otimizações**
- **Copywriting** para conversão
- **Elementos visuais** de destaque
- **Call-to-actions** otimizados

### **3. Expansão**
- **Planos semestrais** como opção intermediária
- **Cupons** para novos usuários
- **Programa de fidelidade**

---

**Data de Implementação**: 17/01/2025  
**Status**: ✅ Implementado  
**Versão**: 1.1.0  
**Objetivo**: Aumentar conversão para planos anuais com cobrança mensal
**Modelo de Cobrança**: Mensal com desconto anual garantido
