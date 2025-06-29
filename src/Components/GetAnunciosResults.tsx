'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useCart } from '@/context/CartContext'
import { ShoppingCartIcon, TrashIcon } from 'lucide-react'
import ModalLogin from './ModalLogin'

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

type GetAnunciosResultsProps = {
  onAdicionarProduto?: (produto: Anuncio) => void
}

export default function GetAnunciosResults({ onAdicionarProduto }: GetAnunciosResultsProps) {
  const { adicionarProduto, removerProduto, produtos } = useCart()
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [loading, setLoading] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    async function fetchAnuncios() {
      setLoading(true)
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
    fetchAnuncios()
  }, [])

  if (loading) return <div>Carregando anúncios...</div>
  if (!anuncios.length) return <div>Nenhum anúncio encontrado.</div>

  return (
    <>
      {showLoginModal && <ModalLogin onClose={() => setShowLoginModal(false)} />}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 p-4">
          {anuncios.map(anuncio => {
            const estaNoCarrinho = produtos.some(p => p.id === anuncio.id.toString())
            return (
              <div
                key={anuncio.id}
                className="
                  bg-white rounded-2xl shadow-lg border border-gray-100 p-3 flex flex-col gap-2
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
                <h3 className="font-bold text-lg truncate">{anuncio.name}</h3>
                <div className="text-gray-500 text-xs mb-1 truncate">{anuncio.address}</div>
                <div className="text-xs text-gray-800 mb-1 font-bold">Telas: {anuncio.screens}</div>
                <div className="text-lg font-bold mb-1 text-green-700">R$ {Number(anuncio.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div className="text-xs text-gray-500 mb-2">/ {anuncio.duration}</div>
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
                        quantidade: 1,
                        image: anuncio.image,
                        endereco: anuncio.address
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