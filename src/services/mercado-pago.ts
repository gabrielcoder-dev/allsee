import MercadoPagoConfig from "mercadopago";

// Validar se o token está configurado
if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
  console.error("❌ MERCADO_PAGO_ACCESS_TOKEN não está configurado");
  throw new Error("Token do Mercado Pago não configurado");
}

// Verificar se é token de teste ou produção
const isTestToken = process.env.MERCADO_PAGO_ACCESS_TOKEN.includes('TEST');
console.log(`🔧 Mercado Pago configurado em modo: ${isTestToken ? 'TESTE' : 'PRODUÇÃO'}`);

export const mercadoPagoClient = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
});

// Função para validar configuração completa
export const validateMercadoPagoConfig = () => {
  // Validar token de acesso
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    throw new Error("Token do Mercado Pago não configurado");
  }

  // Validar formato do token
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (token.length < 10) {
    throw new Error("Token do Mercado Pago parece ser inválido (muito curto)");
  }

  console.log("✅ Configuração do Mercado Pago validada com sucesso");
  return true;
};

// Função para obter informações do ambiente
export const getMercadoPagoInfo = () => {
  const isTest = process.env.MERCADO_PAGO_ACCESS_TOKEN?.includes('TEST');
  return {
    isTest,
    environment: isTest ? 'test' : 'production'
  };
};