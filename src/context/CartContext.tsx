// context/CartContext.tsx
'use client'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { toast } from 'sonner'



type Produto = {
  id: string
  nome: string
  image: string
  preco: number
  quantidade: number
  endereco: string
}

type CartContextType = {
  produtos: Produto[]
  adicionarProduto: (produto: Produto) => void
  removerProduto: (id: string) => void
  limparCarrinho: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [produtos, setProdutos] = useState<Produto[]>([])

  // 🔄 Carregar carrinho do localStorage
  useEffect(() => {
    const storedCart = localStorage.getItem('cart')
    if (storedCart) {
      const parsedCart = JSON.parse(storedCart)
      console.log("Carrinho carregado do localStorage:", parsedCart);
      setProdutos(parsedCart)
    }
  }, [])

  // 💾 Salvar carrinho no localStorage sempre que mudar
  useEffect(() => {
    console.log("Salvando carrinho no localStorage:", produtos);
    localStorage.setItem('cart', JSON.stringify(produtos))
  }, [produtos])

  const adicionarProduto = (produto: Produto) => {
    console.log("Adicionando produto:", produto);
    setProdutos((prev) => {
      const existente = prev.find((p) => p.id === produto.id)
      if (existente) {
        return prev.map((p) =>
          p.id === produto.id
            ? { ...p, quantidade: p.quantidade + produto.quantidade }
            : p
        )
      }
      return [...prev, produto]
    })
    toast.success(`${produto.nome} adicionado ao carrinho`)
  }

  const removerProduto = (id: string) => {
    setProdutos((prev) => prev.filter((p) => p.id !== id))
    toast.warning(`Produto removido do carrinho`)
  }

  const limparCarrinho = () => setProdutos([])

  return (
    <CartContext.Provider value={{ produtos, adicionarProduto, removerProduto, limparCarrinho }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart deve ser usado dentro de um CartProvider')
  return context
}
