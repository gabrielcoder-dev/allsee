'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useCart } from '@/context/CartContext'
import { PlayIcon, ShoppingCartIcon, TrashIcon, User2, ZoomIn } from 'lucide-react'
import ModalLogin from './ModalLogin'
import ImageModal from './ImageModal'

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
  display: number
  views: number
  duration_2: boolean
  duration_4: boolean
  duration_12: boolean
  duration_24: boolean
}

type GetAnunciosResultsProps = {
  onAdicionarProduto?: (produto: Anuncio) => void;
  selectedDuration?: string;
}

export default function GetAnunciosResults({ onAdicionarProduto, selectedDuration = '2' }: GetAnunciosResultsProps) {
  const { adicionarProduto, removerProduto, produtos, atualizarProdutosComNovaDuracao } = useCart()
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [loading, setLoading] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [modalImage, setModalImage] = useState<{ image: string, name: string, address: string } | null>(null)

  useEffect(() => {
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
        // Atualiza os produtos do carrinho com a nova duração
        atualizarProdutosComNovaDuracao(data, selectedDuration);
      } else {
        console.error("Erro ao carregar anúncios:", error);
      }
      setLoading(false)
    }
    fetchAnuncios()
  }, [selectedDuration])

  if (loading) return <div>Carregando anúncios...</div>
  if (!anuncios.length) return <div>Nenhum anúncio encontrado.</div>

  return (
    <>
      {showLoginModal && <ModalLogin onClose={() => setShowLoginModal(false)} />}
      {modalImage && (
        <ImageModal imageUrl={modalImage.image} name={modalImage.name} address={modalImage.address} onClose={() => setModalImage(null)} />
      )}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 p-4">
          {anuncios.map(anuncio => {
            const estaNoCarrinho = produtos.some(p => p.id === anuncio.id.toString())
            // Lógica de cálculo de preço
            const durationsTrue = [
              anuncio.duration_2,
              anuncio.duration_4,
              anuncio.duration_12,
              anuncio.duration_24
            ].filter(Boolean).length;

            // Lógica de desconto por semanas
            const descontos: { [key: string]: number } = {
              '4': 20,
              '12': 60,
              '24': 120,
            };

            let precoCalculado = anuncio.price;
            let displayCalculado = anuncio.display;
            let viewsCalculado = anuncio.views;
            let desconto = 0;

            if (durationsTrue > 1) {
              if (selectedDuration === '4') {
                precoCalculado = anuncio.price * 2;
                displayCalculado = anuncio.display * 2;
                viewsCalculado = anuncio.views * 2;
                desconto = descontos['4'];
              }
              if (selectedDuration === '12') {
                precoCalculado = anuncio.price * 6;
                displayCalculado = anuncio.display * 6;
                viewsCalculado = anuncio.views * 6;
                desconto = descontos['12'];
              }
              if (selectedDuration === '24') {
                precoCalculado = anuncio.price * 12;
                displayCalculado = anuncio.display * 12;
                viewsCalculado = anuncio.views * 12;
                desconto = descontos['24'];
              }
            }
            precoCalculado = precoCalculado - desconto;
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
                <div className="rounded-lg overflow-hidden h-40 flex items-center justify-center bg-gray-100 mb-2 cursor-pointer relative group" onClick={() => setModalImage({ image: anuncio.image, name: anuncio.name, address: anuncio.address })}>
                  <img
                    src={anuncio.image}
                    alt={anuncio.name}
                    className="object-cover w-full h-40"
                  />
                  {/* Overlay de hover */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <ZoomIn className="text-white w-6 h-6" />
                  </div>
                </div>
                <div className="flex gap-2 mb-2">
                  <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded font-medium">Digital</span>
                </div>
                <h3 className="font-bold text-lg">{anuncio.name}</h3>
                <div className="text-gray-500 text-xs mb-1">{anuncio.address}</div>
                <div className="flex gap-8 mb-1">
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] text-gray-500 font-medium lowercase flex items-center gap-1">exibições <span className="text-[10px]"><PlayIcon className='w-3' /></span></span>
                    <span className="font-bold text-base">{formatarMilhar(displayCalculado)}</span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] text-gray-500 font-medium lowercase flex items-center gap-1">alcance <span className="text-[10px]"><User2 className='w-3' /></span></span>
                    <span className="font-bold text-base">{formatarMilhar(viewsCalculado)}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-800 mb-1 font-bold">Telas: {anuncio.screens}</div>
                {/* Preço original riscado e preço com desconto */}
                {(() => {
                  let precoOriginal = anuncio.price;
                  if (durationsTrue > 1) {
                    if (selectedDuration === '4') precoOriginal = anuncio.price * 2;
                    if (selectedDuration === '12') precoOriginal = anuncio.price * 6;
                    if (selectedDuration === '24') precoOriginal = anuncio.price * 12;
                  }
                  return (
                    <div className="mb-1 flex flex-col gap-1">
                      {precoOriginal !== precoCalculado && (
                        <span className="text-sm text-gray-400 line-through">R$ {Number(precoOriginal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      )}
                      <span className="text-lg font-bold text-green-700">R$ {Number(precoCalculado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  );
                })()}
                <div className="text-xs text-gray-500 mb-2">/ {selectedDuration} semana{selectedDuration === '24' || selectedDuration === '4' || selectedDuration === '2' ? (Number(selectedDuration) > 1 ? 's' : '') : ''}</div>
                <button
                  className={`w-full cursor-pointer flex items-center justify-center gap-4 border rounded-lg py-2 text-base font-semibold transition ${estaNoCarrinho ? 'border-red-400 text-red-600 hover:bg-red-50' : 'border-green-400 text-green-600 hover:bg-green-50'}`}
                  onClick={async () => {
                    // Checa autenticação
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                      setShowLoginModal(true);
                      return;
                    }
                    if (estaNoCarrinho) {
                      removerProduto(anuncio.id.toString())
                    } else {
                      adicionarProduto({
                        id: anuncio.id.toString(),
                        nome: anuncio.name,
                        preco: anuncio.price,
                        precoMultiplicado: precoCalculado,
                        selectedDuration: selectedDuration,
                        quantidade: 1,
                        image: anuncio.image,
                        endereco: anuncio.address,
                        screens: anuncio.screens,
                        display: anuncio.display,
                        views: anuncio.views,
                        duration_2: anuncio.duration_2,
                        duration_4: anuncio.duration_4,
                        duration_12: anuncio.duration_12,
                        duration_24: anuncio.duration_24
                      })
                    }
                  }}
                >
                  {estaNoCarrinho ? (
                    <>remover ponto <TrashIcon className="inline w-4 h-4 mr-1" /></>
                  ) : (
                    <>adicionar ponto <ShoppingCartIcon className="inline w-4 h-4 mr-1" /></>
                  )}
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