'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Anuncio = {
  id: number
  name: string
  image: string
  address: string
  screens: number
  price: number
  duration: string
}

export default function GetAnunciosResults() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnuncios() {
      setLoading(true)
      const { data, error } = await supabase
        .from('anuncios')
        .select('*')
        .order('id', { ascending: false })
      if (!error && data) setAnuncios(data)
      setLoading(false)
    }
    fetchAnuncios()
  }, [])

  if (loading) return <div>Carregando anúncios...</div>
  if (!anuncios.length) return <div>Nenhum anúncio encontrado.</div>

  return (
    <div className='flex-1 min-h-0 overflow-y-auto pr-2'>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {anuncios.map(anuncio => (
        <div
          key={anuncio.id}
          className="bg-white rounded-xl shadow border p-3 flex gap-1 flex-col w-80 lg:w-64 mx-auto h-[420px]"
        >
          <div className="rounded-lg overflow-hidden h-40  sm:h-40 flex items-center justify-center bg-gray-100 mb-2">
            <img
              src={anuncio.image}
              alt={anuncio.name}
              className="object-cover w-full h-full"
            />
          </div>
          <div className="flex gap-2 mb-2">
            <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded font-medium">digital</span>
          </div>
          <h3 className="font-bold text-base truncate">{anuncio.name}</h3>
          <div className="text-gray-500 text-xs mb-1 truncate">{anuncio.address}</div>
          {/* <div className="flex gap-3 text-xs mb-1">
            <div>
              <span className="text-gray-400">exibições</span><br />
              <span className="font-bold">21,4 mil</span>
            </div>
            <div>
              <span className="text-gray-400">alcance</span><br />
              <span className="font-bold">1,6 mil</span>
            </div>
            <div>
              <span className="text-gray-400">frequência</span><br />
              <span className="font-bold">10</span>
            </div>
          </div> */}
          <div className="text-xs text-gray-800 mb-1 font-bold">Telas: {anuncio.screens}</div>
          <div className="text-lg font-bold mb-1">R$ {Number(anuncio.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div className="text-xs text-gray-500 mb-2">/ {anuncio.duration}</div>
          <button className="w-full border border-green-400 text-green-600 rounded-lg py-2 text-base font-medium hover:bg-green-50 transition">
            adicionar ponto
          </button>
        </div>
      ))}
    </div>
    </div>
  )
}