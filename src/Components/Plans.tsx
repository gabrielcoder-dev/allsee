'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Monitor, Printer, MapPin, PlayIcon, User2, ChevronRight, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

type Anuncio = {
  id: number
  name: string
  image: string | null
  address: string | null
  price: number
  type_screen: string | null
  views?: number | null
  display?: number | null
  screens?: number | null
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Plans() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [loading, setLoading] = useState(true)
  const [cardWidth, setCardWidth] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [autoScrollActive, setAutoScrollActive] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    async function fetchAnuncios() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('anuncios')
          .select('id, name, image, address, price, type_screen, views, display, screens')
          .range(0, 99)
          .order('id', { ascending: false })

        if (error) {
          console.error('Erro ao buscar anúncios:', error)
          setAnuncios([])
        } else if (Array.isArray(data)) {
          console.log('Totens carregados:', data.length)
          setAnuncios(data)
        }
      } catch (err) {
        console.error('Erro inesperado ao buscar anúncios:', err)
        setAnuncios([])
      } finally {
        setLoading(false)
      }
    }

    fetchAnuncios()
  }, [])

  useEffect(() => {
    const GAP = 24 // gap-6

    const calculateCardMetrics = () => {
      const container = scrollRef.current
      if (!container) return

      const width = container.clientWidth
      if (width === 0) return

      let perView = 1
      if (width >= 560) perView = 2
      if (width >= 920) perView = 3
      if (width >= 1200) perView = 4
      if (width >= 1500) perView = 5

      const computedWidth = (width - GAP * (perView - 1)) / perView

      setCardWidth(Math.max(260, computedWidth))
    }

    calculateCardMetrics()
    window.addEventListener('resize', calculateCardMetrics)

    return () => {
      window.removeEventListener('resize', calculateCardMetrics)
    }
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const container = scrollRef.current
    const { clientWidth, scrollWidth } = container

    const cardTotal = (cardWidth ?? clientWidth) + 24
    const cardsPerView = Math.max(1, Math.floor((clientWidth + 24) / cardTotal))
    const step = cardsPerView
    const maxIndex = Math.max(0, anuncios.length - cardsPerView)

    let nextIndex = currentIndex

    if (direction === 'right') {
      nextIndex = currentIndex + step
      if (nextIndex > maxIndex) {
        // Loop back to start
        container.scrollTo({ left: 0, behavior: 'smooth' })
        setCurrentIndex(0)
        return
      }
    } else {
      nextIndex = currentIndex - step
      if (nextIndex < 0) {
        const targetLeft = scrollWidth - clientWidth
        container.scrollTo({ left: targetLeft > 0 ? targetLeft : 0, behavior: 'smooth' })
        setCurrentIndex(maxIndex)
        return
      }
    }

    setCurrentIndex(nextIndex)

    const targetLeft = nextIndex * cardTotal
    container.scrollTo({
      left: Math.max(0, Math.min(targetLeft, scrollWidth)),
      behavior: 'smooth',
    })
  }

  const stopAutoScroll = () => {
    setAutoScrollActive(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    if (!scrollRef.current || !autoScrollActive) {
      if (!autoScrollActive) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
      return
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    intervalRef.current = setInterval(() => {
      scroll('right')
    }, 2000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [autoScrollActive, cardWidth, anuncios.length, currentIndex])

  useEffect(() => {
    setCurrentIndex(0)
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0 })
    }
  }, [anuncios.length])

  return (
    <section className="py-20 bg-white" id='locais'>
      <div className="landing-container">
        {/* Título */}
        <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="uppercase text-sm text-orange-600 font-bold tracking-wider">Telas</p>
            <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-gray-900 leading-tight">Totens de Divulgação</h2>
          </div>

          {/* Navegação */}
          <div className="flex gap-3 mt-2">
            <button
              className="w-12 h-12 md:w-14 md:h-14 xl:w-16 xl:h-16 rounded-full border border-gray-300 flex items-center justify-center text-lg md:text-xl hover:bg-gray-100 cursor-pointer transition"
              onClick={() => {
                stopAutoScroll()
                scroll('left')
              }}
              aria-label="Rolar para esquerda"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              className="w-12 h-12 md:w-14 md:h-14 xl:w-16 xl:h-16 rounded-full bg-black text-white flex items-center justify-center text-lg md:text-xl hover:scale-105 transition cursor-pointer"
              onClick={() => {
                stopAutoScroll()
                scroll('right')
              }}
              aria-label="Rolar para direita"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Cards */}
        <div
          ref={scrollRef}
          className="
            flex gap-6 overflow-x-auto pb-4
            scroll-smooth snap-x snap-mandatory hide-scrollbar
          "
          style={{ scrollbarWidth: 'none' }}
          onWheel={stopAutoScroll}
          onTouchStart={stopAutoScroll}
          onMouseDown={stopAutoScroll}
        >
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="rounded-[24px] h-[360px] bg-white border border-gray-100 shadow-sm animate-pulse flex-shrink-0 snap-start"
                style={
                  cardWidth
                    ? { minWidth: `${cardWidth}px`, maxWidth: `${cardWidth}px` }
                    : undefined
                }
              >
                <div className="h-48 bg-gray-200 rounded-t-[24px]" />
                <div className="p-5 space-y-4">
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-10 bg-gray-200 rounded" />
                </div>
              </div>
            ))
          ) : anuncios.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-10 text-center text-gray-500">
              <span className="text-lg font-semibold text-gray-700">Nenhum totem disponível no momento.</span>
              <p className="text-sm">Estamos atualizando nossa base de totens. Volte em breve!</p>
            </div>
          ) : (
            anuncios.map((anuncio) => (
              <div
                key={anuncio.id}
                className="rounded-[24px] overflow-hidden shadow-md bg-white flex flex-col flex-shrink-0 border border-gray-100 transition-transform hover:-translate-y-1 hover:shadow-xl snap-start"
                style={
                  cardWidth
                    ? { minWidth: `${cardWidth}px`, maxWidth: `${cardWidth}px` }
                    : undefined
                }
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={anuncio.image ?? 'https://placehold.co/600x800?text=Totem'}
                    alt={anuncio.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
                    {anuncio.type_screen?.toLowerCase() === 'impresso' ? (
                      <>
                        <Printer className="w-3.5 h-3.5 text-orange-600" /> Impresso
                      </>
                    ) : (
                      <>
                        <Monitor className="w-3.5 h-3.5 text-orange-600" /> Digital
                      </>
                    )}
                  </span>
                </div>

                <div className="p-6 flex flex-col gap-4 flex-grow">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-900 leading-snug">
                      {anuncio.name}
                    </h3>
                    <p className="text-gray-500 text-sm flex items-start gap-1">
                      <MapPin className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <span>{anuncio.address ?? 'Local a confirmar'}</span>
                    </p>
                    <div className="flex gap-4 text-xs text-gray-600">
                      {anuncio.display !== null && anuncio.display !== undefined && (
                        <span className="font-semibold inline-flex items-center gap-1">
                          <PlayIcon className="w-4 h-4 text-orange-600" />
                          {formatarMilhar(Number(anuncio.display))}
                        </span>
                      )}
                      {anuncio.views !== null && anuncio.views !== undefined && (
                        <span className="font-semibold inline-flex items-center gap-1">
                          <User2 className="w-4 h-4 text-orange-600" />
                          {formatarMilhar(Number(anuncio.views))}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto space-y-3">
                    <p className="text-2xl font-bold text-orange-600">
                      R$ {Number(anuncio.price ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <Link
                      href="/results"
                      className="bg-orange-600 w-full hover:bg-orange-500 text-white text-sm font-semibold py-3 rounded-full transition text-center cursor-pointer block"
                    >
                      QUERO ADQUIRIR
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

function formatarMilhar(valor?: number | null) {
  if (!valor) return '—'
  if (valor >= 1000) {
    return `${(valor / 1000).toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })} mil`
  }
  return valor.toLocaleString('pt-BR')
}
