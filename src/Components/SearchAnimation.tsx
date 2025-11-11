'use client'

import React from 'react'

interface SearchAnimationProps {
  isVisible: boolean
}

export default function SearchAnimation({ isVisible }: SearchAnimationProps) {
  if (!isVisible) return null

  return (
    <div
      className="fixed inset-0 z-30 bg-white/90 backdrop-blur-sm flex items-center justify-center"
      style={{ marginTop: '110px', marginBottom: '70px' }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-orange-200 border-t-orange-500"></div>
        <span className="text-sm text-gray-600">Carregando...</span>
      </div>
    </div>
  )
}
