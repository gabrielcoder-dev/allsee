import React from 'react'
import HeaderResultsDesktop from '@/Components/HeaderResultsDesktop'
import AnunciosResults from '@/Components/AnunciosResults'
import MobileHeader from '@/Components/HeaderResultsMobile'

const page = () => {
  return (
    <div className=''>
      <HeaderResultsDesktop />
      <MobileHeader />
      <AnunciosResults />
    </div>
  )
}

export default page
