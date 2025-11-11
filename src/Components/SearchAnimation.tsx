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
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-orange-200"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin"></div>
      </div>
    </div>
  )
}
