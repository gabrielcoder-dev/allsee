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
    <section className="relative overflow-hidden py-20 bg-gradient-to-r px-6 md:mt-9 md:px-24">

      <div className="absolute bg-orange-100 w-96 h-96 -z-10 rounded-full top-20 -right-30 blur-3xl"></div>
      <div className="absolute bg-gray-200 w-7xl h-72 -z-10 rounded-full top-72 right-30 blur-3xl"></div>

      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-2xl md:text-4xl font-bold mb-16 leading-snug">
          <span className="text-orange-600">ALLSEE,</span> onde todos te veem!
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
