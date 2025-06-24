import React from 'react'
import GetAnunciosResults from './GetAnunciosResults'
import Mapbox from './MapboxWrapper'

const AnunciosResults = () => {
  return (
    <div className='h-screen flex mt-2 xl:pl-16 justify-center  xl:justify-between'>
      <GetAnunciosResults />
      <Mapbox />
    </div>
  )
}

export default AnunciosResults
