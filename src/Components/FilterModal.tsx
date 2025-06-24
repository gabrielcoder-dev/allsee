'use client'

import { useState } from 'react'
import { Monitor, Printer, X } from 'lucide-react'

const ambientes = [
  'Centro', 'Jardim Itália', 'Centro Leste', 'Jardim Riva 2'
]

const tiposMidia = [
  { label: 'Digital', icon:  <Monitor className="w-5 h-5" />}
]

export default function FilterModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  const [selectedTipo, setSelectedTipo] = useState<string[]>([])
  const [selectedAmbientes, setSelectedAmbientes] = useState<string[]>([])

  if (!open) return null

  const toggleTipo = (tipo: string) => {
    setSelectedTipo(prev =>
      prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]
    )
  }

  const toggleAmbiente = (amb: string) => {
    setSelectedAmbientes(prev =>
      prev.includes(amb) ? prev.filter(a => a !== amb) : [...prev, amb]
    )
  }

  const marcarTodos = () => {
    if (selectedAmbientes.length === ambientes.length) {
      setSelectedAmbientes([])
    } else {
      setSelectedAmbientes(ambientes)
    }
  }

  const limparFiltro = () => {
    setSelectedTipo([])
    setSelectedAmbientes([])
  }

  return (
    <div className="fixed inset-0 z-50 flex">
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
          <span className="text-2xl font-semibold">filtro <span className="text-base font-normal text-gray-500">{selectedTipo.length + selectedAmbientes.length > 0 ? `(${selectedTipo.length + selectedAmbientes.length})` : ''}</span></span>
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
                    ${selectedTipo.includes(tipo.label) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-900'}
                  `}
                  onClick={() => toggleTipo(tipo.label)}
                  type="button"
                >
                  {tipo.icon}
                  {tipo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ambientes */}
          <div className="mb-2 font-semibold">Selecione bairros para anunciar</div>
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              checked={selectedAmbientes.length === ambientes.length}
              onChange={marcarTodos}
              id="marcar-todos"
              className="mr-2 accent-orange-500"
            />
            <label htmlFor="marcar-todos" className="text-gray-700 text-sm">Marcar todos</label>
          </div>
          <div className="flex flex-wrap gap-3">
            {ambientes.map(amb => (
              <button
                key={amb}
                className={`flex items-center px-4 py-2 rounded-full border text-sm
                  ${selectedAmbientes.includes(amb) ? 'bg-gray-100 border-orange-400 text-orange-600' : 'bg-white border-gray-300 text-gray-900'}
                `}
                onClick={() => toggleAmbiente(amb)}
                type="button"
              >
                {/* Aqui você pode colocar o ícone de cada ambiente, se quiser */}
                {amb}
              </button>
            ))}
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
            onClick={onClose}
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