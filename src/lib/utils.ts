import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { createClient } from '@supabase/supabase-js';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Função para atualizar status da compra no banco
export async function atualizarStatusCompra(orderId: string, status: string) {
  console.log(`🔄 Atualizando status do order ${orderId} para: ${status}`);
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '', 
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
  
  try {
    const { data, error } = await supabase
      .from('order')
      .update({ status: status })
      .eq('id', orderId)
      .select('id, status');

    if (error) {
      console.error(`❌ Erro ao atualizar status do order! ${orderId}:`, error);
      throw error;
    }
    
    console.log(`✅ Status do order ${orderId} atualizado com sucesso:`, data);
    return data;
  } catch (error) {
    console.error(`❌ Erro na função atualizarStatusCompra:`, error);
    throw error;
  }
}

