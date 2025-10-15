# Sistema de Notificações em Tempo Real

## 📋 Visão Geral

Este sistema implementa notificações em tempo real para aprovações e substituições no dashboard administrativo, similar ao sistema de carrinho existente.

## 🗂️ Arquivos Criados/Modificados

### **Novos Arquivos:**
- `src/context/NotificationContext.tsx` - Context para gerenciar notificações
- `src/hooks/useNotificationSystem.ts` - Hook personalizado para facilitar uso
- `src/Components/NotificationDebugPanel.tsx` - Painel de debug (remover em produção)

### **Arquivos Modificados:**
- `src/Components/NavBarAdmin.tsx` - Adicionadas bolinhas de notificação
- `src/Components/DashboardPage.tsx` - Incluído NotificationProvider
- `src/Components/AproveitionAdmin.tsx` - Adicionados eventos customizados
- `src/Components/ReplacementAdmin.tsx` - Já tinha eventos customizados

## 🔄 Como Funciona

### **1. Sistema de Contagem:**
```typescript
// Busca aprovações pendentes
const fetchApprovalCount = async (): Promise<number> => {
  // Busca arte_campanha e filtra por status no localStorage
}

// Busca substituições pendentes  
const fetchReplacementCount = async (): Promise<number> => {
  // Busca arte_troca_campanha e filtra por status no localStorage
}
```

### **2. Eventos em Tempo Real:**
```typescript
// Quando aprovação é aceita/rejeitada
window.dispatchEvent(new CustomEvent('approvalStatusChanged', {
  detail: { orderId, status, chave }
}));

// Quando substituição é aceita/rejeitada
window.dispatchEvent(new CustomEvent('replacementStatusChanged', {
  detail: { id_campanha, status, chave }
}));
```

### **3. Atualização Automática:**
- **Eventos customizados** - Disparados quando há mudanças
- **Eventos storage** - Para sincronização entre abas
- **Polling** - A cada 30 segundos para garantir atualizações

## 🎯 Funcionalidades Implementadas

### **✅ Bolinhas de Notificação:**
- Aparecem nos itens "Aprovação" e "Substituição" do menu lateral
- Mostram quantidade de solicitações pendentes
- Cor vermelha para chamar atenção
- Desaparecem quando não há notificações

### **✅ Atualização em Tempo Real:**
- Contadores atualizam automaticamente sem reload da página
- Eventos customizados para comunicação entre componentes
- Sistema de polling como backup

### **✅ Interface Responsiva:**
- Funciona em desktop e mobile
- Bolinhas se adaptam ao tamanho do menu
- Animações suaves

## 🚀 Como Usar

### **Para Desenvolvedores:**

```typescript
// Usar o hook em qualquer componente
import { useNotificationSystem } from '@/hooks/useNotificationSystem';

const MyComponent = () => {
  const { counts, hasNotifications, forceRefresh } = useNotificationSystem();
  
  return (
    <div>
      {hasNotifications && <span>Você tem notificações!</span>}
      <button onClick={forceRefresh}>Atualizar</button>
    </div>
  );
};
```

### **Para Testar:**
1. Acesse `/dashboard`
2. Veja o painel de debug no canto inferior direito
3. Teste aprovar/rejeitar artes
4. Observe as bolinhas atualizarem automaticamente

## 🔧 Configurações

### **Polling Interval:**
```typescript
// Em NotificationContext.tsx
const interval = setInterval(() => {
  refreshCounts();
}, 30000); // 30 segundos
```

### **Remover Debug Panel:**
```typescript
// Em DashboardPage.tsx - remover esta linha:
<NotificationDebugPanel />
```

## 📊 Logs do Sistema

### **Contadores Atualizados:**
```
📊 Contadores atualizados: { approvals: 3, replacements: 1 }
```

### **Eventos Disparados:**
```
📡 Evento de aprovação disparado: { orderId: 123, status: 'aprovado' }
📡 Evento de substituição disparado: { id_campanha: 456, status: 'aceita' }
```

### **Detecção de Mudanças:**
```
🔄 Evento storage detectado, atualizando contadores...
✅ Evento de aprovação detectado: { orderId: 123, status: 'aprovado' }
```

## 🎨 Estilo das Bolinhas

```css
/* Bolinha de notificação */
.notification-badge {
  @apply absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1 min-w-[18px] h-[18px] flex items-center justify-center;
}

/* Para números > 99 */
.notification-badge-large {
  @apply text-xs;
}
```

## 🔮 Próximos Passos

1. **Remover painel de debug** antes de ir para produção
2. **Adicionar animações** nas bolinhas (pulse, bounce)
3. **Implementar som** para notificações (opcional)
4. **Adicionar tooltip** com detalhes das notificações
5. **Implementar notificações push** para navegador (futuro)
