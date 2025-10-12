import { useState, useEffect, useCallback } from 'react'

interface AddressSuggestion {
  id: number | string
  name: string
  address: string
  lat?: number
  lng?: number
  type?: 'city' | 'totem'
}

interface UseAddressSearchOptions {
  debounceMs?: number
  minLength?: number
}

export function useAddressSearch({ 
  debounceMs = 300, 
  minLength = 2 
}: UseAddressSearchOptions = {}) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSelected, setIsSelected] = useState(false)

  // Função para buscar endereços
  const searchAddresses = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < minLength || isSelected) {
      setSuggestions([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/search-addresses?q=${encodeURIComponent(searchTerm)}`)
      
      if (!response.ok) {
        throw new Error('Erro ao buscar endereços')
      }

      const data = await response.json()
      setSuggestions(data.addresses || [])
      setIsOpen(true)
    } catch (err) {
      console.error('Erro na busca de endereços:', err)
      setError('Erro ao buscar endereços')
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [minLength, isSelected])

  // Debounce da busca
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        searchAddresses(query.trim())
      } else {
        setSuggestions([])
        setIsLoading(false)
        setIsOpen(false)
        setIsSelected(false) // Resetar estado de seleção quando input ficar vazio
      }
    }, debounceMs)

    return () => clearTimeout(timeoutId)
  }, [query, searchAddresses, debounceMs])

  // Função para selecionar um endereço
  const selectAddress = useCallback((address: AddressSuggestion) => {
    setQuery(address.address)
    setSuggestions([])
    setIsOpen(false)
    setIsLoading(false)
    setIsSelected(true) // Marcar como selecionado para parar buscas futuras
    return address
  }, [])

  // Função para limpar busca
  const clearSearch = useCallback(() => {
    setQuery('')
    setSuggestions([])
    setIsOpen(false)
    setIsLoading(false)
    setError(null)
    setIsSelected(false) // Resetar estado de seleção
  }, [])

  // Função para fechar dropdown
  const closeDropdown = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    query,
    setQuery,
    suggestions,
    isLoading,
    isOpen,
    error,
    selectAddress,
    clearSearch,
    closeDropdown
  }
}
