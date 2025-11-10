'use client'

import Image from 'next/image'
import { FaMapMarkerAlt, FaCalendarAlt, FaTags } from 'react-icons/fa'
import EmpressaImg from "@/assets/empressa-img.png"
import LogoV2 from "@/assets/logo-v2.jpeg"
import { MdEmail } from 'react-icons/md'
import { Smartphone, SmartphoneCharging } from 'lucide-react'


export default function About() {
  return (
    <section className="relative py-20 bg-white overflow-hidden" id='sobre'>
      <div className="landing-container grid grid-cols-1 md:grid-cols-2 items-center gap-12 lg:gap-16">

        {/* Coluna de texto */}
        <div>
          <p className="uppercase text-sm text-orange-600 font-bold tracking-wider mb-1">Sobre</p>
          <h2 className="text-3xl md:text-4xl xl:text-5xl font-extrabold text-black mb-4">ALL SEE</h2>
          <p className="text-gray-500 mb-10">A ALL SEE é a maior empresa de mídia indoor e OOH de Primavera do Leste e uma referência em toda a região. Fundada por empresários com mais de 20 anos de experiência, destaca-se pela inovação, credibilidade e qualidade. Com tecnologia de ponta e telas digitais estrategicamente posicionadas, oferece soluções de comunicação que garantem visibilidade, engajamento e fortalecimento de marcas.</p>

          <div className="space-y-6">
            {/* Item 1 */}
            <div className="flex items-start gap-6">
              <div className="bg-orange-500 text-white p-5 rounded-xl text-2xl">
                <FaMapMarkerAlt />
              </div>
              <div>
                <h3 className="font-bold text-black text-xl">Primavera do Leste - MT</h3>
                <p className="text-sm text-gray-500">Rua Rio de janeiro - 371 - Centro</p>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex items-center gap-6 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
              <div className="bg-yellow-300 text-white p-5 rounded-xl text-2xl">
                <MdEmail />
              </div>
              <div>
                <h3 className="font-bold text-black text-xl">E-mail</h3>
                <p className="text-sm text-gray-500">allseecontatos@gmail.com</p>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex items-center gap-6">
              <div className="bg-orange-500 text-white p-5 rounded-xl text-2xl">
                <Smartphone />
              </div>
              <div>
                <h3 className="font-bold text-black text-xl">Telefone</h3>
                <p className="text-sm text-gray-500">(66) 9 9976-9524</p>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna de imagem */}
        <div className="flex justify-center items-center">
          <div className="relative w-[320px] h-[320px] sm:w-[260px] sm:h-[320px] md:w-[340px] md:h-[480px] bg-gray-100 rounded-[120px] border-2 border-orange-500 overflow-hidden shadow-lg">
            <Image
              src={LogoV2}
              className="w-full h-full object-cover"
              alt="ALL SEE"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  )
}
