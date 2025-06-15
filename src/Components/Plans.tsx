'use client'

import { useRef } from 'react'
import { FaStar } from 'react-icons/fa'
import feiraImg from "@/assets/feira.jpg"
import resImg from "@/assets/restaurante.jpg"
import restauranteImg from "@/assets/restaurante-2.jpg"
import Image from 'next/image'

const locais = [
  {
    titulo: 'Feira Municipal',
    descricao: 'Mais de 10 mil sp por mês',
    img: feiraImg,
    preco: 'R$ 250,90/Mês',
    button: 'QUERO ADQUIRIR',
  },
  {
    titulo: 'Restaurante Gabriela',
    descricao: 'Mais de 8 mil sp por mês',
    img: resImg,
    preco: 'R$ 290,90/Mês',
    button: 'QUERO COMPRAR',
  },
  {
    titulo: 'Restaurante Skinão',
    descricao: 'Mais de 12 mil sp por mês',
    img: restauranteImg,
    preco: 'R$ 250,90/Mês',
    button: 'QUERO COMPRAR',
  },
]

export default function Plans() {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current
      scrollRef.current.scrollBy({
        left: direction === 'right' ? clientWidth * 0.8 : -clientWidth * 0.8,
        behavior: 'smooth',
      })
    }
  }

  return (
    <section className="px-2 md:px-6 lg:px-32 py-20 bg-white" id='locais'>
      <div className="max-w-7xl mx-auto">
        {/* Título */}
        <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="uppercase text-sm text-orange-600 font-bold tracking-wider">Planos</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Locais mais Requisitados</h2>
          </div>

          {/* Navegação */}
          <div className="flex gap-3 mt-2">
            <button
              className="w-12 h-12 md:w-16 md:h-16 rounded-full border border-gray-300 flex items-center justify-center text-xl hover:bg-gray-100"
              onClick={() => scroll('left')}
              aria-label="Scroll left"
            >
              ←
            </button>
            <button
              className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-black text-white flex items-center justify-center text-xl hover:scale-105 transition"
              onClick={() => scroll('right')}
              aria-label="Scroll right"
            >
              →
            </button>
          </div>
        </div>

        {/* Cards */}
        <div
          ref={scrollRef}
          className="
            flex gap-6 overflow-x-auto pb-4
            scroll-smooth
            lg:grid lg:grid-cols-3 lg:gap-8 lg:overflow-x-visible hide-scrollbar
            "
          style={{ scrollbarWidth: 'thin' }}
        >
          {locais.map((local, i) => (
            <div
              key={i}
              className="rounded-[24px] min-w-[270px] max-w-xs w-full overflow-hidden shadow-md bg-white flex flex-col flex-shrink-0"
            >
              {/* Imagem */}
              <Image
                src={local.img ?? feiraImg}
                alt={local.titulo}
                className='border-2 rounded-t-3xl h-60 object-cover border-orange-600 w-full'
              />

              {/* Conteúdo */}
              <div className="p-5 flex flex-col justify-between gap-3 flex-grow">
                <div>
                  <p className="text-xs text-orange-600 font-semibold">{local.descricao}</p>
                  <h3 className="text-md font-bold text-gray-900">{local.titulo}</h3>
                  <p className="text-gray-400 text-sm">Localizado ...</p>
                </div>
                <div>
                  <p className="text-orange-600 font-bold text-2xl flex items-center gap-2 mt-2">
                    {local.preco}
                    <FaStar className="text-orange-600" />
                  </p>
                  <button className="bg-orange-600 w-full hover:bg-orange-500 text-white mt-4 text-sm font-semibold p-4 rounded-full transition">
                    {local.button}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
