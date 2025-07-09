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

type FormData = {
  campaignName: string
  startDate: string | null   //ISO string format
  selectedImage: string | null // Base64 string
  previewUrl: string | null
  isArtSelected: boolean
  // Dados de pagamento - Pessoa Física
  cpf: string
  telefone: string
  cep: string
  endereco: string
  numero: string
  bairro: string
  complemento: string
  cidade: string
  estado: string
  // Dados de pagamento - Pessoa Jurídica
  cnpj: string
  razaoSocial: string
  segmento: string
  telefonej: string
  cepJ: string
  enderecoJ: string
  numeroJ: string
  bairroJ: string
  complementoJ: string
  cidadeJ: string
  estadoJ: string
  tipo_pessoa?: string // <-- Adicionado para resolver erro de tipagem
}

type CartContextType = {
  produtos: Produto[];
  adicionarProduto: (produto: Produto) => void;
  removerProduto: (id: string) => void;
  limparCarrinho: () => void;
  atualizarProdutosComNovaDuracao: (anuncios: any[], selectedDuration: string) => void;
  selectedDurationGlobal: string;
  setSelectedDurationGlobal: (duration: string) => void;
  // Form data
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  clearFormData: () => void;
  total: number; // <-- Adicionado aqui
  precoComDesconto: number; // <-- Adicionado aqui
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selectedDurationGlobal, setSelectedDurationGlobal] = useState<string>("2");
  const [formData, setFormData] = useState<FormData>({
    campaignName: "",
    startDate: null,
    selectedImage: null,
    previewUrl: null,
    isArtSelected: false,
    // Dados de pagamento - Pessoa Física
    cpf: "",
    telefone: "",
    cep: "",
    endereco: "",
    numero: "",
    bairro: "",
    complemento: "",
    cidade: "",
    estado: "",
    // Dados de pagamento - Pessoa Jurídica
    cnpj: "",
    razaoSocial: "",
    segmento: "",
    telefonej: "",
    cepJ: "",
    enderecoJ: "",
    numeroJ: "",
    bairroJ: "",
    complementoJ: "",
    cidadeJ: "",
    estadoJ: ""
  });

  // 🔄 Carregar carrinho do localStorage
  useEffect(() => {
    const storedCart = localStorage.getItem('cart')
    if (storedCart) {
      const parsedCart = JSON.parse(storedCart)
      console.log("Carrinho carregado do localStorage:", parsedCart);
      setProdutos(parsedCart)
    }
  }, [])

  // // 🔄 Carregar form data do localStorage
  // useEffect(() => {
  //   const storedFormData = localStorage.getItem('formData')
  //   if (storedFormData) {
  //     const parsedFormData = JSON.parse(storedFormData)
  //     setFormData({
  //       ...parsedFormData,
  //       cpf: parsedFormData.cpf || "",
  //       telefone: parsedFormData.telefone || "",
  //       cep: parsedFormData.cep || "",
  //       endereco: parsedFormData.endereco || "",
  //       numero: parsedFormData.numero || "",
  //       bairro: parsedFormData.bairro || "",
  //       complemento: parsedFormData.complemento || "",
  //       cidade: parsedFormData.cidade || "",
  //       estado: parsedFormData.estado || "",
  //       cnpj: parsedFormData.cnpj || "",
  //       razaoSocial: parsedFormData.razaoSocial || "",
  //       segmento: parsedFormData.segmento || "",
  //       telefoneJ: parsedFormData.telefonej || "",
  //       cepJ: parsedFormData.cepJ || "",
  //       enderecoJ: parsedFormData.enderecoJ || "",
  //       numeroJ: parsedFormData.numeroJ || "",
  //       bairroJ: parsedFormData.bairroJ || "",
  //       complementoJ: parsedFormData.complementoJ || "",
  //       cidadeJ: parsedFormData.cidadeJ || "",
  //       estadoJ: parsedFormData.estadoJ || "",
  //     });
  //   }
  // }, []);

  // 💾 Salvar carrinho no localStorage sempre que mudar
  useEffect(() => {
    console.log("Salvando carrinho no localStorage:", produtos);
    localStorage.setItem('cart', JSON.stringify(produtos))
  }, [produtos])

  // // 💾 Salvar form data no localStorage sempre que mudar
  // useEffect(() => {
  //   console.log("Salvando form data no localStorage:", formData);
  //   localStorage.setItem('formData', JSON.stringify(formData))
  // }, [formData])

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

  // Função para atualizar form data
  const updateFormData = (data: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  // Função para limpar form data
  const clearFormData = () => {
    setFormData({
      campaignName: "",
      startDate: "",
      selectedImage: null,
      previewUrl: null,
      isArtSelected: false,
      // Dados de pagamento - Pessoa Física
      cpf: "",
      telefone: "",
      cep: "",
      endereco: "",
      numero: "",
      bairro: "",
      complemento: "",
      cidade: "",
      estado: "",
      // Dados de pagamento - Pessoa Jurídica
      cnpj: "",
      razaoSocial: "",
      segmento: "",
      telefonej: "",
      cepJ: "",
      enderecoJ: "",
      numeroJ: "",
      bairroJ: "",
      complementoJ: "",
      cidadeJ: "",
      estadoJ: ""
    });
  };

  // Funções de cálculo de preço
  const calcularPrecoOriginal = (item: any) => {
    let preco = item.preco;
    const durationsTrue = [
      item.duration_2,
      item.duration_4,
      item.duration_12,
      item.duration_24,
    ].filter(Boolean).length;
    if (durationsTrue > 1) {
      if (selectedDurationGlobal === "4") preco = item.preco * 2;
      if (selectedDurationGlobal === "12") preco = item.preco * 6;
      if (selectedDurationGlobal === "24") preco = item.preco * 12;
    }
    return typeof preco === 'number' ? preco : 0;
  };

  // Função de cálculo do preço com desconto (igual CartResume)
  const calcularPrecoComDesconto = (item: any) => {
    let preco = item.preco;
    const durationsTrue = [
      item.duration_2,
      item.duration_4,
      item.duration_12,
      item.duration_24,
    ].filter(Boolean).length;
    // Lógica de desconto por semanas
    const descontos: { [key: string]: number } = {
      '4': 20,
      '12': 60,
      '24': 120,
    };
    let desconto = 0;
    if (durationsTrue > 1) {
      if (selectedDurationGlobal === "4") {
        preco = item.preco * 2;
        desconto = descontos['4'];
      }
      if (selectedDurationGlobal === "12") {
        preco = item.preco * 6;
        desconto = descontos['12'];
      }
      if (selectedDurationGlobal === "24") {
        preco = item.preco * 12;
        desconto = descontos['24'];
      }
    }
    preco = preco - desconto;
    return typeof preco === "number" ? preco : 0;
  };

  const precoComDesconto = produtos.reduce((acc, item) => acc + calcularPrecoComDesconto(item), 0);

  // O total agora é apenas a soma dos preços originais
  const total = produtos.reduce((acc, item) => acc + calcularPrecoOriginal(item), 0);

  return (
    <CartContext.Provider value={{
      produtos,
      adicionarProduto,
      removerProduto,
      limparCarrinho,
      atualizarProdutosComNovaDuracao,
      selectedDurationGlobal,
      setSelectedDurationGlobal,
      formData,
      updateFormData,
      clearFormData,
      total,
      precoComDesconto, // <-- Adicionado aqui
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart deve ser usado dentro de um CartProvider')
  return context
}
