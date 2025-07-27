import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { address } = req.body
    console.log('Verificando totem para endereço:', address);

    if (!address) {
      return res.status(400).json({ error: 'Address is required' })
    }

    const { data, error } = await supabase
      .from('anuncios')
      .select('id, name, adress, endereco')
      .or(`adress.ilike.%${address}%,endereco.ilike.%${address}%,name.ilike.%${address}%`) // Case-insensitive search

    if (error) {
      console.error('Erro ao buscar totem:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }

    console.log('Resultados encontrados:', data);
    console.log('Endereço buscado:', address);

    if (data && data.length > 0) {
      // Tentar encontrar uma correspondência mais precisa
      const exactMatch = data.find(totem => 
        totem.adress?.toLowerCase().includes(address.toLowerCase()) ||
        totem.endereco?.toLowerCase().includes(address.toLowerCase()) ||
        totem.name?.toLowerCase().includes(address.toLowerCase())
      );
      
      if (exactMatch) {
        console.log('Totem encontrado (match exato):', exactMatch);
        return res.status(200).json({ data: { isSpecificTotem: true, totemId: exactMatch.id } })
      }
      
      // Se não encontrou match exato, usar o primeiro resultado
      console.log('Totem encontrado (primeiro resultado):', data[0]);
      return res.status(200).json({ data: { isSpecificTotem: true, totemId: data[0].id } })
    }

    console.log('Nenhum totem encontrado');
    return res.status(200).json({ data: { isSpecificTotem: false } })
  } catch (error) {
    console.error('Erro na API:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
} 