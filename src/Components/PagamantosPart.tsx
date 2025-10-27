// c:\Users\Latitude 5490\Desktop\allsee\src\Components\PagamantosPart.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/Components/ui/select";
import { useCart } from "@/context/CartContext";
import { SiPix } from "react-icons/si";
import { FaRegCreditCard } from "react-icons/fa";
import { MdCreditCard } from "react-icons/md";
import { PiBarcodeBold } from "react-icons/pi";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useUser } from "@supabase/auth-helpers-react";
import { useFastUpload } from '@/hooks/useFastUpload';
import { toast } from 'sonner';
// Upload otimizado com compressão (sem limitações do Next.js)

// Função para comprimir imagens e reduzir tempo de upload (OTIMIZADA)
const compressImage = async (base64: string, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Redimensionar mais agressivamente para arquivos grandes (mantém proporção)
      let { width, height } = img;
      const maxSize = 1600; // Reduzido de 1920 para 1600px para arquivos menores
      
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Desenhar imagem redimensionada
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Converter para base64 com qualidade reduzida (mais compressão)
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    
    img.src = base64;
  });
};


export const PagamantosPart = () => {
  const user = useUser();
  const { produtos, selectedDurationGlobal, formData, updateFormData } = useCart();
  // Duração fixa igual ao padrão do carrinho
  const duration = "2";
  
  // Hook para upload super rápido
  const { uploadFile, progress: uploadProgress, isUploading, error: uploadError } = useFastUpload({
    onProgress: (progress) => {
      console.log(`📊 Progresso do upload: ${progress.percentage}%`);
      if (progress.totalChunks) {
        console.log(`📦 Chunks: ${progress.chunksUploaded}/${progress.totalChunks}`);
      }
    }
  });
  
  // Estado para controlar se o componente está hidratado
  const [isHydrated, setIsHydrated] = useState(false);

  // Controlar hidratação
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Preencher automaticamente os campos quando a página carregar
  useEffect(() => {
    if (!isHydrated) return;
    
    // Se já temos dados de pessoa física preenchidos, seleciona automaticamente
    if ((formData as any).nome && formData.cpf && formData.cep && formData.endereco) {
      setOpenAccordion("fisica");
    }
    // Se já temos dados de pessoa jurídica preenchidos, e seleciona automaticamente
    else if (formData.cnpj && formData.razaoSocial) {
      setOpenAccordion("juridica");
    }
  }, [formData, isHydrated]);

  // Função de cálculo do preço original (sem desconto)
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
    return typeof preco === "number" ? preco * item.quantidade : 0;
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
    return typeof preco === "number" ? preco * item.quantidade : 0;
  };

  // Subtotal (original) e total (com desconto) - com verificação de segurança
  const precoOriginal = produtos && produtos.length > 0 ? produtos.reduce((acc, item) => acc + calcularPrecoOriginal(item), 0) : 0;
  const precoComDesconto = produtos && produtos.length > 0 ? produtos.reduce((acc, item) => acc + calcularPrecoComDesconto(item), 0) : 0;
  const total = precoComDesconto;
  const [openAccordion, setOpenAccordion] = useState<
    "fisica" | "juridica" | null
  >(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  // ** (1) Image/Video Upload: State for the selected file URL **
  const [imageUrl, setImageUrl] = useState<string | null>(
    formData.selectedImage instanceof File ? formData.previewUrl : (formData.selectedImage || null)
  );

  // ** (2) Image/Video Upload: Handle the selected file from form data (if applicable)**
  useEffect(() => {
    if (formData.selectedImage instanceof File) {
      // Para File objects, usar previewUrl
      setImageUrl(formData.previewUrl || null);
    } else {
      // Para Base64 strings (compatibilidade)
      setImageUrl(formData.selectedImage || null);
    }
  }, [formData.selectedImage, formData.previewUrl]);

  // Função para verificar se todos os campos obrigatórios estão preenchidos (exceto complemento)
  const isFormValid = () => {
    // Verificar se os dados estão disponíveis
    if (!formData || !isHydrated) return false;
    
    // Verificar se há arte selecionada (imagem ou vídeo)
    const hasArtSelected = !!formData.selectedImage || !!formData.previewUrl || !!imageUrl;
    
    // Pessoa Física
    if (openAccordion === "fisica") {
      return (
        !!(formData as any).nome &&  // Nome é obrigatório
        !!formData.cpf &&
        !!formData.telefone &&
        !!formData.cep &&
        !!formData.endereco &&
        !!formData.numero &&
        !!formData.bairro &&
        !!formData.cidade &&
        !!formData.estado &&
        hasArtSelected  // Ensure art is selected (image or video)
      );
    }
    // Pessoa Jurídica
    if (openAccordion === "juridica") {
      return (
        !!formData.cnpj &&
        !!formData.razaoSocial &&
        !!formData.segmento &&
        !!formData.telefonej &&
        !!formData.cepJ &&
        !!formData.enderecoJ &&
        !!formData.numeroJ &&
        !!formData.bairroJ &&
        !!formData.cidadeJ &&
        !!formData.estadoJ &&
        hasArtSelected // Ensure art is selected (image or video)
      );
    }
    // Nenhum selecionado
    return false;
  };

  const handleCheckout = async () => {
    setErro("");
    setCarregando(true);
    console.log("🛒 Iniciando checkout...");
    console.log("👤 User:", user);
    console.log("📦 Produtos:", produtos);
    console.log("📝 FormData:", formData);
    console.log("✅ Form válido:", isFormValid());
    console.log("💰 Total:", total);

    // Verificar se a hidratação está completa
    if (!isHydrated) {
      setErro("Ainda carregando dados...");
      setCarregando(false);
      return;
    }

    // Verificar se há produtos no carrinho
    if (!produtos || produtos.length === 0) {
      setErro("Não há produtos no carrinho.");
      setCarregando(false);
      return;
    }

    // Verifica se o usuário está autenticado
    if (!user?.id) {
      setErro("Você precisa estar logado para concluir a compra.");
      setCarregando(false);
      return;
    }

    try {
      // Sistema de pagamento removido - Integração com Mercado Pago desativada
      console.log("💳 Pagamento removido - Integração com Mercado Pago desativada");
      // TODO: Implementar novo sistema de pagamento
      setErro("Sistema de pagamento temporariamente indisponível. Entre em contato com o suporte.");
    } catch (e) {
      setErro("Erro ao conectar ao servidor");
      console.error("Erro no handleCheckout:", e);
    } finally {
      setCarregando(false);
    }
  };

  const router = useRouter();

  // Não renderizar até que a hidratação esteja completa
  if (!isHydrated) {
    return (
      <div className="flex flex-col gap-8 items-center w-full min-h-screen py-8 bg-[#fcfcfc] px-2 md:px-0">
        <div className="text-center flex items-center justify-center flex-col gap-2 px-2 md:px-0">
          <h1 className="text-3xl font-bold">Pagamento</h1>
          <p className="text-gray-600 text-base w-64 lg:w-full">
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 items-center w-full min-h-screen py-8 bg-[#fcfcfc] px-2 md:px-0">
      {/* Título e subtítulo */}
      <div className="text-center flex items-center justify-center flex-col gap-2 px-2 md:px-0">
        <h1 className="text-3xl font-bold">Pagamento</h1>
        <p className="text-gray-600 text-base w-64 lg:w-full">
          Você está a um passo de reservar seu lugar nas telas da <span className="text-orange-600">ALL SEE</span>!
          <br />
          Confirme os valores e preencha os dados de faturamento
        </p>
      </div>

      {/* Resumo de valores */}
     

      {/* Dados do faturamento */}
      <div className="bg-white rounded-xl shadow border border-gray-100 p-4 md:p-8 flex flex-col gap-8">
      
      
      <div className="bg-white rounded-xl  p-4 md:p-8 flex flex-col gap-4">
          <h2 className="text-xl font-bold mb-2">Resumo de valores</h2>
          <div className="border-b border-gray-200 mb-4"></div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-base">
              <span>Subtotal</span>
              <span className="flex flex-col items-end">
                {precoOriginal !== precoComDesconto && (
                  <span className="text-sm text-gray-400 line-through">R$ {precoOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                )}
                <span className="font-medium text-black">R$ {precoComDesconto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </span>
            </div>
            <a href="#" className="text-sm text-gray-700 underline">
              Possui um cupom de desconto?
            </a>
          </div>
          <div className="border-b border-gray-200 my-2"></div>
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total</span>
            <span className="text-black">
              R$ {precoComDesconto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>



        <h2 className="text-xl font-bold mb-1">Dados do faturamento</h2>
        <p className="text-gray-500 text-sm mb-4">
          Essas informações serão usadas para fins de faturamento. Escolha a
          opção que melhor se aplica a você.
        </p>
        <div className="flex flex-col gap-0">
          {/* Pessoa Física */}
          <div
            className={`flex items-center px-4 h-14 border-b border-gray-200 cursor-pointer bg-gray-50 rounded-t-lg select-none ${
              openAccordion === "fisica" ? "font-semibold" : ""
            }`}
            onClick={() =>
              setOpenAccordion(openAccordion === "fisica" ? null : "fisica")
            }
          >
            <span
              className={`mr-2 text-gray-500 transition-transform ${
                openAccordion === "fisica" ? "rotate-90" : ""
              }`}
            >
              &#8250;
            </span>
            <span className="font-medium text-sm text-gray-800">
              Pessoa Física
            </span>
          </div>
          {openAccordion === "fisica" && (
            <div className="bg-white border-b border-gray-200 px-2 md:px-6 py-6 md:py-8 flex flex-col gap-6 animate-fade-in">
              <div className="grid grid-cols-1 gap-4">
                <input
                  type="text"
                  placeholder="Nome completo"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={(formData as any).nome}
                  onChange={(e) => updateFormData({ nome: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <input
                  type="text"
                  placeholder="CPF"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={formData.cpf}
                  onChange={(e) => updateFormData({ cpf: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <input
                  type="text"
                  placeholder="Telefone"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={formData.telefone}
                  onChange={(e) => updateFormData({ telefone: e.target.value })}
                />
              </div>
              <hr />
              <div className="grid grid-cols-1 gap-4">
                <input
                  type="text"
                  placeholder="CEP"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={formData.cep}
                  onChange={(e) => updateFormData({ cep: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Endereço"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={formData.endereco}
                  onChange={(e) => updateFormData({ endereco: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Número"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={formData.numero}
                  onChange={(e) => updateFormData({ numero: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Bairro"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={formData.bairro}
                  onChange={(e) => updateFormData({ bairro: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Complemento"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={formData.complemento}
                  onChange={(e) => updateFormData({ complemento: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Cidade"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={formData.cidade}
                  onChange={(e) => updateFormData({ cidade: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Estado"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={formData.estado}
                  onChange={(e) => updateFormData({ estado: e.target.value })}
                />
              </div>
              {/* <p className="text-center text-xs text-gray-500">A NOTA FISCAL SERÁ ENCAMINHADA VIA WHATSAPP E E-MAIL</p> */}
            </div>
          )}
          {/* Pessoa Jurídica */}
          <div
            className={`flex items-center px-4 h-14 cursor-pointer bg-gray-50 rounded-b-lg select-none ${
              openAccordion === "juridica" ? "font-semibold" : ""
            }`}
            onClick={() =>
              setOpenAccordion(
                openAccordion === "juridica" ? null : "juridica"
              )
            }
          >
            <span
              className={`mr-2 text-gray-500 transition-transform ${
                openAccordion === "juridica" ? "rotate-90" : ""
              }`}
            >
              &#8250;
            </span>
            <span className="font-medium text-sm text-gray-800">
              Pessoa Jurídica
            </span>
          </div>
          {openAccordion === "juridica" && (
            <div className="bg-white border-b border-gray-200 px-2 md:px-6 py-6 md:py-8 flex flex-col gap-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="CNPJ"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={formData.cnpj}
                  onChange={(e) => updateFormData({ cnpj: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Razão Social"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={formData.razaoSocial}
                  onChange={(e) => updateFormData({ razaoSocial: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select value={formData.segmento} onValueChange={(value) => updateFormData({ segmento: value })}>
                  <SelectTrigger className="px-4 py-6">
                    <SelectValue placeholder="Setor/Segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mercado">Mercado</SelectItem>
                <SelectItem value="banco">Banco</SelectItem>
                    <SelectItem value="servicos">Serviços</SelectItem>
                    <SelectItem value="industria">Indústria</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
                <input
                  type="text"
                  placeholder="Telefone"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={formData.telefonej}
                  onChange={(e) => updateFormData({ telefonej: e.target.value })}
                />
              </div>
              <hr />
              <div className="grid grid-cols-1 gap-4">
                <input
                  type="text"
                  placeholder="CEP"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={formData.cepJ}
                  onChange={(e) => updateFormData({ cepJ: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Endereço"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={formData.enderecoJ}
                  onChange={(e) => updateFormData({ enderecoJ: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Número"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={formData.numeroJ}
                  onChange={(e) => updateFormData({ numeroJ: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Bairro"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={formData.bairroJ}
                  onChange={(e) => updateFormData({ bairroJ: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Complemento"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={formData.complementoJ}
                  onChange={(e) => updateFormData({ complementoJ: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Cidade"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={formData.cidadeJ}
                  onChange={(e) => updateFormData({ cidadeJ: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Estado"
                  className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={formData.estadoJ}
                  onChange={(e) => updateFormData({ estadoJ: e.target.value })}
                />
              </div>
              {/* <p className="text-center text-xs text-gray-500">A NOTA FISCAL SERÁ ENCAMINHADA VIA WHATSAPP E E-MAIL</p> */}
            </div>
          )}
        </div>


        {/* Mensagem de erro (apenas quando não está fazendo upload) */}
        {!isUploading && erro && !uploadError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            ❌ {erro}
          </div>
        )}

        {/* Botão voltar e concluir */}
        <div className="flex justify-between items-center px-2 md:px-0 mt-2">
          <Button
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-8 py-2 rounded-md cursor-pointer"
            type="button"
            onClick={() => router.push("/resumo")}
          >
            <ArrowLeft />
            Voltar
          </Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-2 rounded-md cursor-pointer"
            type="button"
            disabled={carregando || produtos.length === 0 || !isFormValid()}
            onClick={handleCheckout}
          >
            {carregando ? "Processando..." : "Concluir"}
          </Button>
        </div>
      </div>
    </div>
  );
};