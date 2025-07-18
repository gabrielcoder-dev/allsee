import React from 'react'

const MapAdmin = () => {
  return (
    <div className="w-full h-full p-3 md:p-6">
      <h2 className="text-2xl md:text-3xl font-bold text-orange-600 mb-4 md:mb-6">Mapa de Anúncios</h2>
      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-300 p-4 md:p-6 h-[calc(100vh-200px)] md:h-[calc(100vh-250px)]">
        <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl md:text-8xl text-gray-300 mb-4">🗺️</div>
            <p className="text-gray-500 text-lg md:text-xl font-medium">Mapa em desenvolvimento</p>
            <p className="text-gray-400 text-sm md:text-base mt-2">Aqui será exibido o mapa com os anúncios</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapAdmin
