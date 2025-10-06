import React, { useRef, useEffect } from 'react'
import { MapPinIcon, X } from 'lucide-react'

interface AddressSuggestion {
  id: number
  name: string
  address: string
  lat?: number
  lng?: number
}

interface AddressAutocompleteProps {
  query: string
  setQuery: (query: string) => void
  suggestions: AddressSuggestion[]
  isLoading: boolean
  isOpen: boolean
  error: string | null
  onSelectAddress: (address: AddressSuggestion) => void
  onCloseDropdown: () => void
  placeholder?: string
  className?: string
}

export default function AddressAutocomplete({
  query,
  setQuery,
  suggestions,
  isLoading,
  isOpen,
  error,
  onSelectAddress,
  onCloseDropdown,
  placeholder = "Ex: Rua das Flores, Centro, Primavera do Leste",
  className = ""
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        onCloseDropdown()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onCloseDropdown])

  // Fechar dropdown com ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseDropdown()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCloseDropdown])

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className="bg-transparent outline-none flex-1 w-full text-sm rounded-lg border border-gray-200 focus:border-orange-500 transition-colors pl-9 pr-8 py-2"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) {
              onCloseDropdown()
            }
          }}
        />
        
        {/* Ícone de localização */}
        <MapPinIcon className="w-4 h-5 text-orange-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
        
        {/* Botão de limpar */}
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <span className="text-xs text-red-500 mt-1">{error}</span>
      )}

      {/* Dropdown de Sugestões */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.id}-${index}`}
              type="button"
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
              onClick={() => onSelectAddress(suggestion)}
            >
              <div className="flex items-start gap-3">
                <MapPinIcon className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">
                    {suggestion.name}
                  </div>
                  <div className="text-gray-500 text-xs mt-1 line-clamp-2">
                    {suggestion.address}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
            <span className="text-sm text-gray-600">Buscando endereços...</span>
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {isOpen && !isLoading && suggestions.length === 0 && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
          <div className="text-center text-gray-500 text-sm">
            Nenhum totem encontrado para "{query}"
          </div>
        </div>
      )}
    </div>
  )
}
