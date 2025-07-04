'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { PlayIcon, ShoppingCartIcon, TrashIcon, User2 } from 'lucide-react'
import ModalLogin from './ModalLogin'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Anuncio = {
  id: number;
  name: string;
  image: string;
  address: string;
  screens: number;
  price: number;
  duration: string;
  display: number;
  views: number;
  duration_2: boolean;
  duration_4: boolean;
  duration_12: boolean;
  duration_24: boolean;
}

type GetAnunciosResultsProps = {
  selectedDuration?: string;
}

export default function GetAnunciosAdmin({ selectedDuration = '2' }: GetAnunciosResultsProps) {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)

  async function fetchAnuncios() {
    setLoading(true)
    let durationColumn = 'duration_2';
    if (selectedDuration === '4') durationColumn = 'duration_4';
    if (selectedDuration === '12') durationColumn = 'duration_12';
    if (selectedDuration === '24') durationColumn = 'duration_24';
    const { data, error } = await supabase
      .from('anuncios')
      .select('*')
      .eq(durationColumn, true)
      .order('id', { ascending: false })
    if (!error && data) {
      console.log("Anúncios carregados do Supabase:", data);
      // Verificar se todos os anúncios têm o campo address
      data.forEach((anuncio, index) => {
        console.log(`Anúncio ${index}:`, {
          id: anuncio.id,
          name: anuncio.name,
          address: anuncio.address,
          hasAddress: 'address' in anuncio,
          addressType: typeof anuncio.address
        });
      });
      setAnuncios(data)
    } else {
      console.error("Erro ao carregar anúncios:", error);
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAnuncios()
  }, [selectedDuration])

  async function removerTotem(id: number) {
    setRemovingId(id)
    console.log('Tentando remover id:', id, 'typeof:', typeof id);
    const { error, data } = await supabase
      .from('anuncios')
      .delete()
      .eq('id', Number(id))
    console.log('Resultado do delete:', { error, data });
    if (error) {
      alert('Erro ao remover totem: ' + error.message)
    } else {
      await fetchAnuncios()
    }
    setRemovingId(null)
  }

  if (loading) return <div>Carregando anúncios...</div>
  if (!anuncios.length) return <div>Nenhum anúncio encontrado.</div>

  return (
    <>
      {showLoginModal && <ModalLogin onClose={() => setShowLoginModal(false)} />}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 p-4">
          {anuncios.map(anuncio => {
            return (
              <div
                key={anuncio.id}
                className="
                  bg-white rounded-2xl shadow-lg border border-gray-100 p-3 flex flex-col gap-1
                  w-full max-w-xl h-[440px]
                  transition-all
                  hover:shadow-xl
                "
              >
                <div className="rounded-lg overflow-hidden h-40 flex items-center justify-center bg-gray-100 mb-2">
                  <img
                    src={anuncio.image}
                    alt={anuncio.name}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex gap-2 mb-2">
                  <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded font-medium">digital</span>
                </div>
                <h3 className="font-bold text-lg">{anuncio.name}</h3>
                <div className="text-gray-500 text-xs mb-1">{anuncio.address}</div>
                <div className="flex gap-8 mb-1">
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] text-gray-500 font-medium lowercase flex items-center gap-1">exibições <span className="text-[10px]"><PlayIcon className='w-3' /></span></span>
                    <span className="font-bold text-base">{formatarMilhar(anuncio.display)}</span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] text-gray-500 font-medium lowercase flex items-center gap-1">alcance <span className="text-[10px]"><User2 className='w-3' /></span></span>
                    <span className="font-bold text-base">{formatarMilhar(anuncio.views)}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-800 mb-1 font-bold">Telas: {anuncio.screens}</div>
                <div className="text-lg font-bold mb-1 text-green-700">R$ {Number(anuncio.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div className="text-xs text-gray-500 mb-2">/ {selectedDuration} semana{selectedDuration === '24' || selectedDuration === '4' || selectedDuration === '2' ? (Number(selectedDuration) > 1 ? 's' : '') : ''}</div>
                <button
                  className={`w-full cursor-pointer flex items-center justify-center gap-4 border rounded-lg py-2 text-base font-semibold transition border-red-400 text-red-600 hover:bg-red-50 ${removingId === anuncio.id ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => removerTotem(anuncio.id)}
                  disabled={removingId === anuncio.id}
                >
                  {removingId === anuncio.id ? 'Removendo...' : 'Remover totem'}
                  <TrashIcon className="inline w-4 h-4 ml-2" />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function formatarMilhar(valor: number) {
  if (valor >= 1000) {
    return (valor / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' mil';
  }
  return valor?.toLocaleString('pt-BR');
}