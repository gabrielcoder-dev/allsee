'use client'

import { ReactNode } from 'react'
import { FaMapMarkerAlt, FaUsers, FaTrophy, FaStar } from 'react-icons/fa'

const Card = ({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) => (
  <div className="bg-white rounded-[32px] justify-between p-8 text-center shadow-lg flex flex-col items-center gap-4 h-full">
    <div className="text-orange-600 text-5xl">{icon}</div>
    <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
    <p className="text-gray-500 text-base leading-relaxed">{description}</p>
  </div>
)

export default function AllseeSection() {
  return (
    <section className="relative overflow-hidden py-20 bg-gradient-to-r md:mt-9">
      <div className="landing-container relative text-center">
        <div className="pointer-events-none absolute -z-10 w-[460px] h-[460px] top-16 -left-40 rounded-full bg-orange-100 blur-3xl opacity-60 sm:w-[520px] sm:h-[520px] sm:-left-28 lg:w-[620px] lg:h-[620px] lg:-left-20 xl:w-[680px] xl:h-[680px]"></div>
        <div className="pointer-events-none absolute -z-10 w-[760px] h-[360px] top-56 -right-60 rounded-full bg-gray-200 blur-3xl opacity-50 sm:-right-40 lg:w-[860px] lg:h-[420px] lg:-right-32 xl:w-[940px] xl:h-[460px]"></div>

        <h2 className="text-2xl md:text-4xl font-bold mb-16 leading-snug">
          <span className="text-orange-600">ALL SEE,</span> onde todos te veem!
        </h2>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            icon={<FaMapMarkerAlt />}
            title="Locais mais movimentados da região"
            description="Estudamos os locais com o maior público de Primavera para que todos vejam seus anúncios."
          />
          <Card
            icon={<FaUsers />}
            title="Atraia mais clientes!"
            description="Quanto mais pessoas virem seus anúncios maior a chance de vender."
          />
          <Card
            icon={<FaTrophy />}
            title="Passe dos seus Concorrentes"
            description="Se você não anunciar, seu concorrente vai estar sempre à sua frente."
          />
          <Card
            icon={<FaStar />}
            title="Destaque sua Marca!"
            description="Seja lembrado da melhor maneira e por todos da sua região."
          />
        </div>
      </div>
    </section>
  )
}
