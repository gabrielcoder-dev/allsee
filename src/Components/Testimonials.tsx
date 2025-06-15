'use client'

import { FaStar } from 'react-icons/fa'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

export default function Testimonials() {
  return (
    <section className="relative w-full py-16 md:py-20 overflow-hidden">
      <div className="max-w-2xl md:max-w-4xl mx-auto flex flex-col gap-6 text-center px-4 md:px-8">
        {/* Título */}
        <div>
          <p className="text-orange-500 uppercase font-bold text-sm md:text-lg tracking-widest mb-2">
            Veja o que estão falando
          </p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-black mb-8 md:mb-10">Depoimentos</h2>
        </div>

        {/* Avatar */}
        <div className="flex justify-center mb-4 md:mb-6">
          <img
            src="https://randomuser.me/api/portraits/women/79.jpg"
            alt="Depoente"
            className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-orange-300 shadow-lg"
          />
        </div>

        {/* Nome e Profissão */}
        <div>
          <p className="text-lg md:text-xl font-semibold text-orange-600">
            Laura Cassoni <span className="text-black font-normal">/ Profissão ou idade</span>
          </p>
          {/* Estrelas */}
          <div className="flex justify-center items-center gap-1 text-yellow-400 text-xl md:text-2xl mt-2 mb-2">
            {[...Array(5)].map((_, i) => <FaStar key={i} />)}
          </div>
        </div>

        {/* Depoimento */}
        <blockquote className="text-gray-600 text-base md:text-lg leading-relaxed italic max-w-xl mx-auto">
          “A Allsee me ajudou a alcançar muito mais pessoas e trouxe resultados incríveis para o meu negócio. Recomendo para todos que querem crescer!”
        </blockquote>

        {/* Paginação */}
        <div className="flex justify-center gap-2 mt-4 md:mt-6">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <div className="w-3 h-3 rounded-full bg-gray-300" />
        </div>
      </div>

      {/* Navegação */}
      <div className="hidden md:block absolute left-40 top-1/2 -translate-y-1/2 z-10">
        <button className="w-20 h-20 rounded-full bg-white shadow-md flex items-center justify-center cursor-pointer hover:bg-orange-100 transition">
          <FiChevronLeft className="text-2xl text-gray-800" />
        </button>
      </div>
      <div className="hidden md:block absolute right-40 top-1/2 -translate-y-1/2 z-10">
        <button className="w-20 h-20 rounded-full bg-black shadow-lg flex items-center justify-center cursor-pointer hover:bg-orange-600 transition">
          <FiChevronRight className="text-2xl text-white" />
        </button>
      </div>
    </section>
  )
}
