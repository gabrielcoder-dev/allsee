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
  const { produtos, formData } = useCart();
  const [artError, setArtError] = useState<string | undefined>(undefined);
  const [campaignError, setCampaignError] = useState<string | undefined>(undefined);

  const handleAvançar = () => {
    let hasError = false;
    if (!formData.isArtSelected) {
      setArtError('Por favor, selecione uma arte para avançar.');
      hasError = true;
    } else {
      setArtError(undefined);
    }
    if (!formData.campaignName.trim()) {
      setCampaignError('Por favor, escolha um nome para a campanha.');
      hasError = true;
    } else {
      setCampaignError(undefined);
    }
    if (hasError) {
      if (!formData.isArtSelected && !formData.campaignName.trim()) {
        toast.warning('Por favor, selecione uma arte e escolha um nome para a campanha.');
      } else if (!formData.isArtSelected) {
        toast.warning('Por favor, selecione uma arte para avançar.');
      } else if (!formData.campaignName.trim()) {
        toast.warning('Por favor, escolha um nome para a campanha.');
      }
      return;
    }
    router.push('/pagamento');
  };

  return (
    <div className='h-screen flex flex-col'>
      <HeaderResume />
      <CartResume 
        artError={artError}
        campaignError={campaignError}
      />
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
          onClick={handleAvançar}
        >
          Avançar
        </button>
      </div>
    </div>
  )
}

export default page
