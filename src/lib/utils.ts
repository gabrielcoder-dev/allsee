import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { createClient } from '@supabase/supabase-js';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function atualizarStatusCompra(id: string, novoStatus: string) {
  const { data, error } = await supabase
    .from('compras')
    .update({ status: novoStatus })
    .eq('id', id);

  if (error) throw error;
  return data;
}
