'use client'

import { TrashIcon, X } from 'lucide-react'

type ConfirmDeleteModalProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  totemName: string
}

export default function ConfirmDeleteModal({ isOpen, onClose, onConfirm, totemName }: ConfirmDeleteModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-sm sm:max-w-md w-full shadow-xl mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Confirmar exclusão</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        
        <div className="mb-4 sm:mb-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="bg-red-100 p-1.5 sm:p-2 rounded-full flex-shrink-0 mt-0.5">
              <TrashIcon className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm sm:text-base text-gray-700 font-medium">
                Tem certeza que quer excluir esse totem?
              </p>
              {totemName && (
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  <strong>{totemName}</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm sm:text-base text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Não
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="flex-1 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-red-700 transition-colors"
          >
            Sim
          </button>
        </div>
      </div>
    </div>
  )
} 