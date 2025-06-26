'use client'

import React, { useState } from 'react'
import ModalCreateAnuncios from '@/Components/ModalCreateAnuncios'
import NavBarAdmin from '@/Components/NavBarAdmin'

const Page = () => {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className='flex gap-16'>
      <NavBarAdmin />
      <button onClick={() => setShowModal(true)}>
        Adicionar Anúncio
      </button>
      <ModalCreateAnuncios open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}

export default Page
