// lib/utils.ts

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { createClient } from '@supabase/supabase-js';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Função para atualizar status da compra no banco
export async function atualizarStatusCompra(orderId: string, status: "pendente" | "pago") {
  console.log(`🔄 Atualizando status do order ${orderId} para: ${status}`);
  
  if (!orderId || !status) {
    throw new Error('orderId e status são obrigatórios');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '', 
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
  
  try {
    console.log(`🔍 Verificando se order ${orderId} existe...`);
    
    const { data: existingOrder, error: checkError } = await supabase
      .from('order')
      .select('id, status, id_user')
      .eq('id', orderId)
      .single();

    if (checkError) {
      console.error(`❌ Order ${orderId} não encontrado:`, checkError);
      throw new Error(`Order ${orderId} não encontrado: ${checkError.message}`);
    }

    console.log(`📋 Order encontrado:`, {
      id: existingOrder.id,
      statusAtual: existingOrder.status,
      novoStatus: status,
      id_user: existingOrder.id_user
    });

    const { data, error } = await supabase
      .from('order')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select('id, status, updated_at');

    if (error) {
      console.error(`❌ Erro ao atualizar status do order ${orderId}:`, error);
      throw error;
    }
    
    console.log(`✅ Status do order ${orderId} atualizado com sucesso:`, data[0]);
    return data[0];
  } catch (error) {
    console.error(`❌ Erro na função atualizarStatusCompra para order ${orderId}:`, error);
    throw error;
  }
}
