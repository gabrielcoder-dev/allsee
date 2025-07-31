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

    // Normalizar o endereço de busca
    const normalizedAddress = address.toLowerCase().trim()

    // Buscar por correspondência mais precisa primeiro - otimizado para velocidade
    const { data: anunciosData, error: anunciosError } = await supabase
      .from('anuncios')
      .select('id, name, adress, endereco')
      .or(`adress.ilike.%${normalizedAddress}%,endereco.ilike.%${normalizedAddress}%,name.ilike.%${normalizedAddress}%`)
      .limit(10) // Aumentar limite para maior precisão

    if (anunciosError) {
      console.error('Erro ao buscar totem:', anunciosError)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }

    console.log('Resultados encontrados:', anunciosData);
    console.log('Endereço buscado:', normalizedAddress);

    if (anunciosData && anunciosData.length > 0) {
      console.log('🔍 Analisando', anunciosData.length, 'totens encontrados...');
      
      // Tentar encontrar uma correspondência mais precisa
      const bestMatch = anunciosData.find(totem => {
        const totemAddress = (totem.adress || '').toLowerCase();
        const totemEndereco = (totem.endereco || '').toLowerCase();
        const totemName = (totem.name || '').toLowerCase();
        
        console.log('🔍 Comparando:', {
          normalizedAddress,
          totemAddress,
          totemEndereco,
          totemName
        });
        
        // Verificar correspondência exata primeiro
        if (totemAddress === normalizedAddress || 
            totemEndereco === normalizedAddress || 
            totemName === normalizedAddress) {
          console.log('✅ Match exato encontrado para totem:', totem);
          return true;
        }
        
        // Verificar se o endereço buscado está contido em qualquer campo do totem
        const match = totemAddress.includes(normalizedAddress) ||
               totemEndereco.includes(normalizedAddress) ||
               totemName.includes(normalizedAddress) ||
               normalizedAddress.includes(totemAddress) ||
               normalizedAddress.includes(totemEndereco) ||
               normalizedAddress.includes(totemName);
        
        if (match) {
          console.log('✅ Match parcial encontrado para totem:', totem);
        }
        
        return match;
      });
      
      if (bestMatch) {
        console.log('🎯 Totem selecionado:', bestMatch);
        
        // Buscar o marker correspondente
        const { data: markerData, error: markerError } = await supabase
          .from('markers')
          .select('id, lat, lng')
          .eq('anuncio_id', bestMatch.id)
          .single()

        if (markerError) {
          console.error('❌ Erro ao buscar marker:', markerError)
          return res.status(200).json({ 
            data: { 
              isSpecificTotem: true, 
              totemId: bestMatch.id,
              markerId: null,
              coords: null
            } 
          })
        }

        console.log('📍 Marker encontrado:', markerData);

        return res.status(200).json({ 
          data: { 
            isSpecificTotem: true, 
            totemId: bestMatch.id,
            markerId: markerData?.id || null,
            coords: markerData ? { lat: markerData.lat, lng: markerData.lng } : null
          } 
        })
      }
      
      // Se não encontrou match melhor, usar o primeiro resultado
      console.log('Usando primeiro resultado:', anunciosData[0]);
      
      // Buscar o marker correspondente
      const { data: markerData, error: markerError } = await supabase
        .from('markers')
        .select('id, lat, lng')
        .eq('anuncio_id', anunciosData[0].id)
        .single()

      if (markerError) {
        console.error('Erro ao buscar marker:', markerError)
        return res.status(200).json({ 
          data: { 
            isSpecificTotem: true, 
            totemId: anunciosData[0].id,
            markerId: null,
            coords: null
          } 
        })
      }

      console.log('Marker encontrado:', markerData);

      return res.status(200).json({ 
        data: { 
          isSpecificTotem: true, 
          totemId: anunciosData[0].id,
          markerId: markerData?.id || null,
          coords: markerData ? { lat: markerData.lat, lng: markerData.lng } : null
        } 
      })
    }

    console.log('Nenhum totem encontrado');
    return res.status(200).json({ data: { isSpecificTotem: false } })
  } catch (error) {
    console.error('Erro na API:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
} 