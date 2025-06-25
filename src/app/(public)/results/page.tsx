import React from 'react'
import HeaderResultsDesktop from '@/Components/HeaderResultsDesktop'
import MobileHeader from '@/Components/HeaderResultsMobile'
import HeaderPrice from '@/Components/HeaderPrice'
import Mapbox from '@/Components/MapboxClient'
import GetAnunciosResults from '@/Components/GetAnunciosResults'

const page = () => {
  return (
    <div className="flex flex-col h-screen">
      <HeaderResultsDesktop />
      <MobileHeader />

      {/* Área principal com scroll controlado */}
      <div className="flex flex-1 min-h-0 overflow-hidden xl:pl-16 justify-center xl:justify-between">
        <GetAnunciosResults />
        <Mapbox />
      </div>

      <HeaderPrice quantidade={1} valor={399.99} />
    </div>

  )
}

export default page
