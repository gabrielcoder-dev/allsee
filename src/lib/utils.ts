import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { createClient } from '@supabase/supabase-js';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Função para atualizar status da compra no banco
export async function atualizarStatusCompra(orderId: string, status: string) {
  console.log(`🔄 Atualizando status do order ${orderId} para: ${status}`);
  
  // Validar parâmetros
  if (!orderId || !status) {
    throw new Error('orderId e status são obrigatórios');
  }

  // Validar status permitidos
  const statusPermitidos = ['pendente', 'pago', 'rejeitado', 'cancelado', 'em_processamento'];
  if (!statusPermitidos.includes(status)) {
    console.warn(`⚠️ Status não reconhecido: ${status}. Usando 'pendente' como padrão.`);
    status = 'pendente';
  }
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '', 
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
  
  try {
    // Verificar se o order existe
    const { data: existingOrder, error: checkError } = await supabase
      .from('order')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (checkError) {
      console.error(`❌ Order ${orderId} não encontrado:`, checkError);
      throw new Error(`Order ${orderId} não encontrado`);
    }

    console.log(`📋 Order encontrado:`, {
      id: existingOrder.id,
      statusAtual: existingOrder.status,
      novoStatus: status
    });

    // Atualizar status
    const { data, error } = await supabase
      .from('order')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select('id, status, updated_at');

    if (error) {
      console.error(`❌ Erro ao atualizar status do order ${orderId}:`, error);
      throw error;
    }
    
    console.log(`✅ Status do order ${orderId} atualizado com sucesso:`, {
      id: data[0].id,
      status: data[0].status,
      updated_at: data[0].updated_at
    });
    
    return data[0];
  } catch (error) {
    console.error(`❌ Erro na função atualizarStatusCompra para order ${orderId}:`, error);
    throw error;
  }
}

