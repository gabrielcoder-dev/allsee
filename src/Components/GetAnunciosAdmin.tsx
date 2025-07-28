'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { PlayIcon, ShoppingCartIcon, TrashIcon, User2, Monitor, Printer, Pencil } from 'lucide-react'
import ModalLogin from './ModalLogin'
import ModalCreateAnuncios from './ModalCreateAnuncios'
import ConfirmDeleteModal from './ConfirmDeleteModal'

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
  type_screen: 'digital' | 'impresso';
  nicho?: 'restaurante' | 'academia' | 'comercio' | 'padaria' | 'outro';
}

type GetAnunciosResultsProps = {
  selectedDuration?: string;
  onFetchAnunciosRef?: (ref: () => Promise<void>) => void;
}

export default function GetAnunciosAdmin({ selectedDuration = '2', onFetchAnunciosRef }: GetAnunciosResultsProps) {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [anuncioEditando, setAnuncioEditando] = useState<Anuncio | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [totemToDelete, setTotemToDelete] = useState<Anuncio | null>(null)

  const fetchAnuncios = useCallback(async () => {
    setLoading(true)
    console.log("Buscando anúncios com selectedDuration:", selectedDuration);
    let durationColumn = 'duration_2';
    if (selectedDuration === '4') durationColumn = 'duration_4';
    if (selectedDuration === '12') durationColumn = 'duration_12';
    if (selectedDuration === '24') durationColumn = 'duration_24';
    console.log("Usando coluna de duração:", durationColumn);
    
    // Primeiro, vamos verificar a estrutura da tabela
    const { data: tableInfo, error: tableError } = await supabase
      .from('anuncios')
      .select('*')
      .limit(1);
    console.log("Estrutura da tabela (primeiro registro):", tableInfo);
    
    const { data, error } = await supabase
      .from('anuncios')
      .select('*')
      .order('id', { ascending: false })
    if (!error && data) {
      console.log("Anúncios carregados do Supabase:", data);
      // Verificar se todos os anúncios têm o campo address
      data.forEach((anuncio, index) => {
        console.log(`Anúncio ${index}:`, {
          id: anuncio.id,
          name: anuncio.name,
          address: anuncio.address,
          type_screen: anuncio.type_screen,
          display: anuncio.display,
          views: anuncio.views,
          price: anuncio.price,
          hasAddress: 'address' in anuncio,
          addressType: typeof anuncio.address
        });
      });
      setAnuncios(data)
    } else {
      console.error("Erro ao carregar anúncios:", error);
    }
    setLoading(false)
  }, [selectedDuration])

  useEffect(() => {
    fetchAnuncios()
  }, [selectedDuration])

  // Expor a função fetchAnuncios para o componente pai
  useEffect(() => {
    if (onFetchAnunciosRef) {
      onFetchAnunciosRef(fetchAnuncios)
    }
  }, [onFetchAnunciosRef, fetchAnuncios])

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

  function handleDeleteClick(anuncio: Anuncio) {
    setTotemToDelete(anuncio)
    setShowDeleteModal(true)
  }

  function handleConfirmDelete() {
    if (totemToDelete) {
      removerTotem(totemToDelete.id)
    }
  }

  if (loading) return <div>Carregando anúncios...</div>
  if (!anuncios.length) return <div>Nenhum anúncio encontrado.</div>

  return (
    <>
      {showLoginModal && <ModalLogin onClose={() => setShowLoginModal(false)} />}
      {showEditModal && anuncioEditando && (
        <ModalCreateAnuncios
          open={showEditModal}
          onClose={() => { setShowEditModal(false); setAnuncioEditando(null); }}
          anuncio={anuncioEditando}
          onSaved={() => {
            console.log("onSaved chamado, recarregando anúncios...");
            fetchAnuncios();
          }}
        />
      )}
      {showDeleteModal && totemToDelete && (
        <ConfirmDeleteModal
          isOpen={showDeleteModal}
          onClose={() => { setShowDeleteModal(false); setTotemToDelete(null); }}
          onConfirm={handleConfirmDelete}
          totemName={totemToDelete.name}
        />
      )}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 p-2 md:p-4">
          {anuncios.map(anuncio => {
            return (
              <div
                key={anuncio.id}
                className="
                  bg-white rounded-xl md:rounded-2xl shadow-lg border border-gray-100 p-3 md:p-4 flex flex-col gap-2 md:gap-3
                  w-full h-auto min-h-[400px] md:min-h-[440px]
                  transition-all duration-200
                  hover:shadow-xl
                "
              >
                <div className="rounded-lg overflow-hidden h-28 md:h-32 flex items-center justify-center bg-gray-100 mb-2">
                  <img
                    src={anuncio.image}
                    alt={anuncio.name}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex gap-2 mb-2">
                  {anuncio.type_screen?.toLowerCase() === 'impresso' ? (
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded font-medium flex items-center gap-1">
                      <Printer className="w-3 h-3 mr-1 inline" /> impresso
                    </span>
                  ) : (
                    <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded font-medium flex items-center gap-1">
                      <Monitor className="w-3 h-3 mr-1 inline" /> digital
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-base md:text-lg line-clamp-2">{anuncio.name}</h3>
                <div className="text-gray-500 text-xs mb-1 break-words">{anuncio.address}</div>
                <div className="flex gap-4 md:gap-8 mb-1">
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] text-gray-500 font-medium lowercase flex items-center gap-1">exibições <span className="text-[10px]"><PlayIcon className='w-3' /></span></span>
                    <span className="font-bold text-sm md:text-base">
                      {anuncio.type_screen === 'digital'
                        ? formatarMilhar(calcularDisplayPorSemana(anuncio, selectedDuration))
                        : formatarMilhar(anuncio.display)}
                    </span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] text-gray-500 font-medium lowercase flex items-center gap-1">alcance <span className="text-[10px]"><User2 className='w-3' /></span></span>
                    <span className="font-bold text-sm md:text-base">
                      {anuncio.type_screen === 'digital'
                        ? formatarMilhar(calcularViewsPorSemana(anuncio, selectedDuration))
                        : formatarMilhar(anuncio.views)}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-800 mb-1 font-bold">Telas: {anuncio.screens}</div>
                <div className="text-base md:text-lg font-bold mb-1 text-green-700">R$ {Number(anuncio.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div className="text-xs text-gray-500 mb-2">/ {selectedDuration} semana{selectedDuration === '24' || selectedDuration === '4' || selectedDuration === '2' ? (Number(selectedDuration) > 1 ? 's' : '') : ''}</div>
                <div className="flex gap-2 mt-auto">
                  <button
                    className={`flex-1 cursor-pointer flex items-center justify-center gap-2 border rounded-lg py-2 text-xs md:text-sm font-semibold transition border-red-400 text-red-600 hover:bg-red-50 ${removingId === anuncio.id ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => handleDeleteClick(anuncio)}
                    disabled={removingId === anuncio.id}
                  >
                    <span className="hidden sm:inline">{removingId === anuncio.id ? 'Removendo...' : 'Remover'}</span>
                    <span className="sm:hidden">{removingId === anuncio.id ? '...' : 'Remover'}</span>
                    <TrashIcon className="inline w-3 h-3 md:w-4 md:h-4" />
                  </button>
                  <button
                    className="w-10 md:w-12 flex items-center justify-center border rounded-lg py-2 text-xs md:text-sm font-semibold transition border-blue-400 text-blue-600 hover:bg-blue-50"
                    title="Editar"
                    onClick={() => { setAnuncioEditando(anuncio); setShowEditModal(true); }}
                  >
                    <Pencil className="inline w-3 h-3 md:w-4 md:h-4" />
                  </button>
                </div>
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

function calcularDisplayPorSemana(anuncio: any, selectedDuration: string) {
  const durationsTrue = [
    anuncio.duration_2,
    anuncio.duration_4,
    anuncio.duration_12,
    anuncio.duration_24
  ].filter(Boolean).length;
  let display = anuncio.display;
  if (anuncio.type_screen === 'digital' && durationsTrue > 1) {
    if (selectedDuration === '4') display = display * 2;
    if (selectedDuration === '12') display = display * 6;
    if (selectedDuration === '24') display = display * 12;
  }
  return display;
}

function calcularViewsPorSemana(anuncio: any, selectedDuration: string) {
  const durationsTrue = [
    anuncio.duration_2,
    anuncio.duration_4,
    anuncio.duration_12,
    anuncio.duration_24
  ].filter(Boolean).length;
  let views = anuncio.views;
  if (anuncio.type_screen === 'digital' && durationsTrue > 1) {
    if (selectedDuration === '4') views = views * 2;
    if (selectedDuration === '12') views = views * 6;
    if (selectedDuration === '24') views = views * 12;
  }
  return views;
}