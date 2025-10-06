'use client'

import React from 'react'

interface SearchAnimationProps {
  isVisible: boolean
}

export default function SearchAnimation({ isVisible }: SearchAnimationProps) {
  if (!isVisible) return null

  return (
    <div className="fixed z-40 bg-white/95 backdrop-blur-sm flex items-center justify-center" style={{ 
      top: '0px', 
      left: '0px', 
      right: '0px', 
      bottom: '0px',
      marginTop: '120px',
      marginBottom: '80px'
    }}>
      <div className="flex flex-col items-center gap-6">
        {/* Ícone de lupa com animação */}
        <div className="relative">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
            <svg 
              className="w-8 h-8 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>
          {/* Animação de ondas */}
          <div className="absolute inset-0 w-16 h-16 bg-blue-500 rounded-full animate-ping opacity-20"></div>
          <div className="absolute inset-0 w-16 h-16 bg-blue-500 rounded-full animate-ping opacity-10" style={{ animationDelay: '0.5s' }}></div>
        </div>

        {/* Texto */}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-800">
            Buscando os melhores pontos para você
          </h3>
        </div>

        {/* Barra de progresso animada */}
        <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-orange-500 rounded-full animate-pulse"></div>
        </div>

        {/* Pontos de carregamento */}
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  )
}
