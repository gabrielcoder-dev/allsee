'use client'

import { FaMapMarkerAlt, FaCalendarAlt, FaTags } from 'react-icons/fa'

export default function About() {
  return (
    <section className="relative  md:px-32 px-6 py-20 bg-white overflow-hidden" id='sobre'>
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 items-center gap-10">

        {/* Coluna de texto */}
        <div>
          <p className="uppercase text-sm text-orange-600 font-bold tracking-wider mb-1">Sobre</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-black mb-4">ALLSEE</h2>
          <p className="text-gray-500 mb-10">Texto texto ....</p>

          <div className="space-y-6">
            {/* Item 1 */}
            <div className="flex items-start gap-6">
              <div className="bg-orange-500 text-white p-5 rounded-xl text-2xl">
                <FaMapMarkerAlt />
              </div>
              <div>
                <h3 className="font-bold text-black text-xl">Primavera do Leste - MT</h3>
                <p className="text-sm text-gray-500">.....</p>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex items-start gap-6 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
              <div className="bg-yellow-300 text-white p-5 rounded-xl text-2xl">
                <FaCalendarAlt />
              </div>
              <div>
                <h3 className="font-bold text-black text-xl">A mais de 2 anos no mercado</h3>
                <p className="text-sm text-gray-500">.....</p>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex items-start gap-6">
              <div className="bg-orange-500 text-white p-5 rounded-xl text-2xl">
                <FaTags />
              </div>
              <div>
                <h3 className="font-bold text-black text-xl">Sempre entregando as melhores ofertas</h3>
                <p className="text-sm text-gray-500">.....</p>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna de imagem */}
        <div className="relative flex justify-center items-center">
          {/* Imagem grande */}
          <div className="w-[340px] h-[340px] sm:w-[280px] sm:h-[380px] md:w-[350px] md:h-[520px] bg-gray-100 rounded-[120px] border-2 border-orange-500 overflow-hidden z-10">
            <img
              src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914"
              alt="CEO principal"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Imagem menor */}
          <div className="absolute right-0 bottom-0 w-[150px] h-[180px] sm:w-[180px] sm:h-[220px] bg-gray-100 rounded-full border-4 border-white overflow-hidden z-20 shadow-md">
            <img
              src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914"
              alt="CEO secundário"
              className="w-full h-full object-cover"
            />
            {/* Tag CEO */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-orange-300 text-white text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
              <FaMapMarkerAlt className="text-white text-xs" />
              CEO
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
