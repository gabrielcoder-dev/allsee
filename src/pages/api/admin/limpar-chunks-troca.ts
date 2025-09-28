import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { arte_troca_campanha_id } = req.body;
    
    if (!arte_troca_campanha_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'arte_troca_campanha_id é obrigatório' 
      });
    }

    console.log(`🧹 Limpando chunks de troca para arte ${arte_troca_campanha_id}`);

    // Limpar todos os chunks de troca da arte
    const { error: deleteError } = await supabase
      .from('chunks_temp_troca')
      .delete()
      .eq('arte_troca_id', arte_troca_campanha_id);

    if (deleteError) {
      console.error('❌ Erro ao limpar chunks de troca:', deleteError);
      return res.status(500).json({ 
        success: false, 
        error: `Erro ao limpar chunks de troca: ${deleteError.message}` 
      });
    }

    console.log('✅ Chunks de troca limpos com sucesso');

    return res.status(200).json({ 
      success: true, 
      message: 'Chunks de troca limpos com sucesso'
    });

  } catch (error: any) {
    console.error("❌ Erro no endpoint limpar-chunks-troca:", error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
}
