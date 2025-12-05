# 🔄 Resumo: Sandbox → Produção

## 🎯 Agora (Sandbox) ✅

```env
ASAAS_ENVIRONMENT=sandbox
KEY_API_ASAAS=chave_do_sandbox
```

- 🌐 Site: https://sandbox.asaas.com/
- 💰 Pagamentos: **Simulados** (sem dinheiro real)
- ✅ Aprovação: Automática
- 🧪 Uso: Testes e desenvolvimento

## 🚀 Depois (Produção) 💼

```env
ASAAS_ENVIRONMENT=production
KEY_API_ASAAS=chave_de_producao
```

- 🌐 Site: https://www.asaas.com/
- 💰 Pagamentos: **REAIS** (com dinheiro de verdade!)
- ✅ Aprovação: Requer documentação
- 🧪 Uso: Aplicação em uso real

## 📋 Passo a Passo Rápido

### 1️⃣ Agora: Teste no Sandbox
- [x] Configure sandbox
- [ ] Teste tudo
- [ ] Certifique-se que funciona

### 2️⃣ Depois: Vá para Produção

**No Vercel (Settings → Environment Variables):**

```
Production Environment:
├── ASAAS_ENVIRONMENT=production
└── KEY_API_ASAAS=chave_de_producao_aqui
```

**Passos:**
1. Obter chave de API em https://www.asaas.com/
2. Configurar variáveis no Vercel
3. Configurar webhook de produção
4. Fazer deploy
5. Testar (com cuidado! 💰)

## ⚠️ ATENÇÃO

| ❌ NÃO Faça | ✅ Faça |
|------------|---------|
| Usar produção antes de testar | Testar tudo no sandbox primeiro |
| Commitar chaves no código | Usar variáveis de ambiente |
| Misturar chaves | Manter sandbox e produção separados |

## 🎯 Estratégia Recomendada

```
┌─────────────────────────────────────────┐
│  DESENVOLVIMENTO (Local)                │
│  └─> Sandbox (.env.local)              │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  TESTES (Vercel Preview)                │
│  └─> Sandbox (ou Production)           │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  PRODUÇÃO (Vercel Production)           │
│  └─> Production                        │
└─────────────────────────────────────────┘
```

## 📚 Guias Completos

- **Sandbox:** `GUIA_RAPIDO_SANDBOX.md`
- **Produção:** `GUIA_PRODUCAO.md`
- **Troubleshooting:** `SANDBOX_TROUBLESHOOTING.md`

## 🔗 Links

- **Sandbox:** https://sandbox.asaas.com/
- **Produção:** https://www.asaas.com/
- **Validação:** `/api/asaas/validate-config`

---

**💡 Lembre-se:** Teste tudo no sandbox primeiro! É melhor encontrar problemas sem dinheiro real envolvido! 😉
