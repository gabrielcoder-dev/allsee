# 🔧 Solução para Problema de Verificação de Identidade - Mercado Pago

## 🐛 Problema Identificado

O erro de "verificação de identidade" no Mercado Pago durante o checkout PIX estava sendo causado por:

1. **Falta de dados do pagador**: O Mercado Pago precisa de informações completas do pagador para verificação
2. **Configuração incompleta da preferência**: Faltavam campos importantes como `payer` e `payment_methods`
3. **Possível problema com token**: Token de teste em produção ou vice-versa

## ✅ Soluções Implementadas

### 1. **Dados do Pagador (Payer)**

Adicionamos o objeto `payer` na criação da preferência com todos os dados necessários:

```typescript
payer: {
  name: payerData.name || 'Cliente Allsee',
  email: payerData.email || 'cliente@allsee.com',
  identification: {
    type: 'CPF',
    number: payerData.cpf.replace(/\D/g, '')
  },
  phone: {
    area_code: payerData.telefone.replace(/\D/g, '').substring(0, 2),
    number: payerData.telefone.replace(/\D/g, '').substring(2)
  },
  address: {
    zip_code: payerData.cep.replace(/\D/g, ''),
    street_name: payerData.endereco,
    street_number: payerData.numero,
    neighborhood: payerData.bairro,
    city: payerData.cidade,
    state: payerData.estado
  }
}
```

### 2. **Configuração de Métodos de Pagamento**

Adicionamos configurações específicas para melhorar a experiência:

```typescript
payment_methods: {
  excluded_payment_types: [{ id: "ticket" }], // Excluir boleto se necessário
  installments: 1, // Forçar pagamento à vista
  default_installments: 1
}
```

### 3. **Configurações Adicionais**

- **Expiração**: 30 minutos para completar o pagamento
- **Statement Descriptor**: "ALLSEE" para identificação no extrato
- **Logs detalhados**: Para debug e monitoramento

### 4. **Validação de Configuração**

Adicionamos validação do token e configurações:

```typescript
// Verificar se é token de teste ou produção
const isTestToken = process.env.MERCADO_PAGO_ACCESS_TOKEN.includes('TEST');
console.log(`🔧 Mercado Pago configurado em modo: ${isTestToken ? 'TESTE' : 'PRODUÇÃO'}`);
```

## 🔄 Fluxo Atualizado

### **1. Frontend (PagamantosPart.tsx)**
```typescript
// Preparar dados do pagador
const payerData = {
  name: formData.cpf ? 'Pessoa Física' : formData.razaoSocial || 'Cliente Allsee',
  email: user.email || 'cliente@allsee.com',
  cpf: formData.cpf || null,
  telefone: formData.telefone || formData.telefonej || null,
  // ... outros dados
};

// Enviar para checkout
const response = await fetch("/api/pagamento/checkout", {
  method: "POST",
  body: JSON.stringify({ 
    total, 
    orderId: orderData.id,
    payerData 
  }),
});
```

### **2. Backend (checkout.ts)**
```typescript
// Validar configuração
validateMercadoPagoConfig();

// Criar preferência com dados completos
const preferenceBody = {
  items: [...],
  payer: payerData ? { ... } : undefined,
  payment_methods: { ... },
  expires: true,
  expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  statement_descriptor: 'ALLSEE'
};
```

## 🧪 Como Testar

### **1. Verificar Configuração**
Certifique-se que estas variáveis estão configuradas no `.env.local`:

```env
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-... # Token de produção
NEXT_PUBLIC_BASE_URL=https://seu-dominio.com
```

### **2. Testar Fluxo Completo**
1. Preencher dados de faturamento (CPF/CNPJ obrigatórios)
2. Clicar em "Concluir"
3. Verificar logs no console para confirmar dados enviados
4. Testar pagamento PIX no Mercado Pago

### **3. Verificar Logs**
Os logs agora mostram:
- ✅ Configuração do Mercado Pago (teste/produção)
- ✅ Dados do pagador enviados
- ✅ Preferência criada com sucesso
- ❌ Erros detalhados se houver problemas

## 🚨 Possíveis Causas do Erro Original

### **1. Token Incorreto**
- Token de teste em produção
- Token expirado ou inválido
- Token sem permissões adequadas

### **2. Dados Incompletos**
- CPF/CNPJ não informado
- Email inválido
- Endereço incompleto

### **3. Configuração da Conta Mercado Pago**
- Conta não verificada
- Limites de pagamento atingidos
- Restrições de segurança

## 🔍 Monitoramento

### **Logs para Acompanhar**
```bash
# Configuração
🔧 Mercado Pago configurado em modo: PRODUÇÃO

# Criação da preferência
🔧 Criando preferência com dados: { total: 100, orderId: "123", hasPayerData: true }

# Sucesso
✅ Preferência criada com sucesso: { id: "123456", initPoint: "https://..." }

# Erro
❌ Erro ao criar preferência: { message: "Invalid payer", cause: "..." }
```

## 📞 Suporte

Se o problema persistir:

1. **Verificar logs** no console do servidor
2. **Confirmar dados** do pagador estão completos
3. **Validar token** do Mercado Pago
4. **Testar com dados diferentes** (outro CPF/email)
5. **Contatar suporte** do Mercado Pago se necessário

---

**Status**: ✅ Implementado e testado
**Última atualização**: $(date)
