// c:\Users\Latitude 5490\Desktop\allsee\src\pages\api/admin/criar-arte-campanha.ts
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
    const { id_order, caminho_imagem, id_user } = req.body;

    if (!id_order || !caminho_imagem || !id_user) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: arteCampanha, error } = await supabase
      .from('arte_campanha')
      .insert([{ id_order, caminho_imagem, id_user }])
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar arte da campanha:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log('Arte da campanha criada:', arteCampanha);

    return res.status(200).json({ 
      success: true, 
      arte_campanha_id: arteCampanha.id 
    });

  } catch (error) {
    console.error("Erro no endpoint criar-arte-campanha:", error);
    return res.status(500).json({ success: false, error: 'Erro ao criar arte da campanha' });
  }
}