'use client'

import React, { useState } from 'react'
import ModalCreateAnuncios from '@/Components/ModalCreateAnuncios'

const Page = () => {
  const [showModal, setShowModal] = useState(false)

  return (
    <div>
      <button onClick={() => setShowModal(true)}>
        Adicionar Anúncio
      </button>
      <ModalCreateAnuncios open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}

export default Page
