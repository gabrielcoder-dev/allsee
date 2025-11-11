'use client'

import { useState } from 'react'
import { Monitor, Printer, X } from 'lucide-react'

const tiposMidia = [
  { label: 'Digital', value: 'digital', icon: <Monitor className="w-5 h-5" /> },
  { label: 'Impresso', value: 'impresso', icon: <Printer className="w-5 h-5" /> },
]

export default function FilterModal({ open, onClose, onFilter }: { open: boolean, onClose: () => void, onFilter?: (tipo: string | null) => void }) {
  const [selectedTipo, setSelectedTipo] = useState<string[]>([])

  if (!open) return null

  const toggleTipo = (tipo: string) => {
    setSelectedTipo(prev => {
      const newSelection = prev.includes(tipo) ? [] : [tipo];
      return newSelection;
    })
  }

  const limparFiltro = () => {
    setSelectedTipo([])
  }

  return (
    <div className="fixed inset-0 z-[9999] flex">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />

      {/* Modal lateral */}
      <div className="
        relative h-full w-full max-w-md bg-white shadow-xl flex flex-col
        transition-transform duration-300
      
        ml-0
        md:ml-0 md:mr-auto
      ">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <span className="text-2xl font-semibold">filtro <span className="text-base font-normal text-gray-500">{selectedTipo.length > 0 ? `(${selectedTipo.length})` : ''}</span></span>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Tipo de mídia */}
          <div>
            <div className="font-semibold mb-2">Tipo de mídia</div>
            <div className="flex gap-3 mb-4 flex-wrap">
              {tiposMidia.map(tipo => (
                <button
                  key={tipo.label}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm
                    ${selectedTipo.includes(tipo.value) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-900'}
                  `}
                  onClick={() => toggleTipo(tipo.value)}
                  type="button"
                >
                  {tipo.icon}
                  {tipo.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <button
            className="text-gray-600 text-sm"
            onClick={limparFiltro}
            type="button"
          >
            limpar filtro
          </button>
          <button
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg px-6 py-2 text-base"
            onClick={() => {
              if (onFilter) onFilter(selectedTipo[0] || null);
              onClose();
            }}
            type="button"
          >
            filtrar
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M7 12h10m-4 6h4"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}