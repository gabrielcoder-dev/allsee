'use client'

import React, { useState } from 'react'
import HeaderResultsDesktop from '@/Components/HeaderResultsDesktop'
import HeaderResultsMobile from '@/Components/HeaderResultsMobile'
import CartResume from '@/Components/CartResume'
import { ArrowLeft } from 'lucide-react'
import { HeaderResume } from '@/Components/HeaderResume'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { toast } from 'sonner'

const page = () => {
  const router = useRouter();
  const { produtos } = useCart();
  const [isArtSelected, setIsArtSelected] = useState(false);
  return (
    <div className='h-screen flex flex-col'>
      <HeaderResume />
      <CartResume onCartArtSelected={setIsArtSelected} />
      <div className="flex items-center justify-between p-5 border-t border-gray-200">
        <p
          className='flex items-center gap-2 text-orange-500 cursor-pointer font-semibold'
          onClick={() => router.push('/results')}
        >
          <ArrowLeft /> Continuar Comprando
        </p>
        <button
          className='bg-orange-500 text-white px-4 py-2 rounded-md cursor-pointer disabled:bg-orange-300 disabled:cursor-not-allowed'
          disabled={produtos.length === 0}
          onClick={() => {
            if (!isArtSelected) {
              toast.warning('Por favor, selecione uma arte para avançar.');
              return;
            }
            router.push('/pagamento');
          }}
        >
          Avançar
        </button>
      </div>
    </div>
  )
}

export default page
