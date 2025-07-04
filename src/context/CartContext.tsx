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
  display: number
  views: number
  screens?: number
  duration_2?: boolean
  duration_4?: boolean
  duration_12?: boolean
  duration_24?: boolean
  selectedDuration?: string
  precoMultiplicado?: number
}

type CartContextType = {
  produtos: Produto[]
  adicionarProduto: (produto: Produto) => void
  removerProduto: (id: string) => void
  limparCarrinho: () => void
  atualizarProdutosComNovaDuracao: (anuncios: any[], selectedDuration: string) => void;
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
      const existente = prev.find((p) => p.id === produto.id);
      if (existente) {
        // Atualiza os campos do produto, mas mantém a quantidade original
        return prev.map((p) =>
          p.id === produto.id
            ? { ...p, ...produto, quantidade: p.quantidade }
            : p
        );
      }
      return [...prev, produto];
    });
    // toast.success(`${produto.nome} adicionado ao carrinho`);
  }

  const removerProduto = (id: string) => {
    setProdutos((prev) => prev.filter((p) => p.id !== id))
    toast.warning(`Produto removido do carrinho`)
  }

  const limparCarrinho = () => setProdutos([])

  // Função para atualizar produtos do carrinho ao trocar a duração
  const atualizarProdutosComNovaDuracao: (anuncios: any[], selectedDuration: string) => void = (anuncios, selectedDuration) => {
    setProdutos(produtosAntigos =>
      produtosAntigos.map(produto => {
        const anuncio = anuncios.find(a => a.id.toString() === produto.id);
        if (!anuncio) return produto;
        // Lógica de cálculo igual ao GetAnunciosResults
        let precoCalculado = anuncio.price;
        let desconto = 0;
        const durationsTrue = [
          anuncio.duration_2,
          anuncio.duration_4,
          anuncio.duration_12,
          anuncio.duration_24
        ].filter(Boolean).length;
        const descontos = { '4': 20, '12': 60, '24': 120 };
        if (durationsTrue > 1) {
          if (selectedDuration === '4') precoCalculado = anuncio.price * 2;
          if (selectedDuration === '12') precoCalculado = anuncio.price * 6;
          if (selectedDuration === '24') precoCalculado = anuncio.price * 12;
          desconto = descontos[selectedDuration as keyof typeof descontos] || 0;
        }
        precoCalculado = precoCalculado - desconto;
        return {
          ...produto,
          precoMultiplicado: precoCalculado,
          selectedDuration,
        };
      })
    );
  };

  return (
    <CartContext.Provider value={{ produtos, adicionarProduto, removerProduto, limparCarrinho, atualizarProdutosComNovaDuracao }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart deve ser usado dentro de um CartProvider')
  return context
}
