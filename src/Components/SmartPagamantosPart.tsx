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
import { useSmartUpload } from '@/hooks/useSmartUpload';
import { useBackgroundUpload } from '@/hooks/useBackgroundUpload';
import { UploadProgress } from './UploadProgress';
import { toast } from 'sonner';

/**
 * Componente de pagamento INTELIGENTE que escolhe automaticamente:
 * 1. Upload normal para arquivos pequenos (usuário fica na página)
 * 2. Upload em background para arquivos grandes (usuário pode ir para checkout)
 */

export const SmartPagamantosPart = () => {
  const user = useUser();
  const { produtos, selectedDurationGlobal, formData, updateFormData } = useCart();
  const duration = "2";
  
  // Hooks para upload
  const smartUpload = useSmartUpload({
    onProgress: (progress) => {
      console.log(`📊 Upload normal (${progress.strategy}): ${progress.percentage}%`);
    }
  });

  const backgroundUpload = useBackgroundUpload({
    onProgress: (progress) => {
      console.log(`📊 Upload background (${progress.strategy}): ${progress.percentage}%`);
    },
    onComplete: (result) => {
      console.log('✅ Upload background concluído:', result);
      toast.success('Upload concluído em background!');
    },
    onError: (error) => {
      console.error('❌ Erro no upload background:', error);
      toast.error(`Erro no upload: ${error.error}`);
    }
  });

  // Estados
  const [isHydrated, setIsHydrated] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [uploadMode, setUploadMode] = useState<'normal' | 'background' | null>(null);
  const [backgroundUploadId, setBackgroundUploadId] = useState<string | null>(null);

  // Preencher automaticamente os campos
  useEffect(() => {
    if (!isHydrated) return;
    
    if ((formData as any).nome && formData.cpf && formData.cep && formData.endereco) {
      setOpenAccordion("fisica");
    } else if (formData.cnpj && formData.razaoSocial) {
      setOpenAccordion("juridica");
    }
  }, [formData, isHydrated]);

  // Inicializar Service Worker
  useEffect(() => {
    const initServiceWorker = async () => {
      await backgroundUpload.initialize();
    };
    
    initServiceWorker();
  }, []);

  // Controlar hidratação
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Estados do formulário
  const [openAccordion, setOpenAccordion] = useState<"fisica" | "juridica" | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(
    formData.selectedImage instanceof File ? formData.previewUrl : (formData.selectedImage || null)
  );

  // Cálculos de preço
  const calcularPrecoComDesconto = (item: any) => {
    const precoBase = item.preco;
    const desconto = item.desconto || 0;
    return precoBase * (1 - desconto / 100);
  };

  const precoComDesconto = produtos && produtos.length > 0 ? produtos.reduce((acc, item) => acc + calcularPrecoComDesconto(item), 0) : 0;
  const total = precoComDesconto;

  // Validação do formulário
  const isFormValid = () => {
    if (!openAccordion) return false;
    
    if (openAccordion === "fisica") {
      return !!(formData as any).nome && formData.cpf && formData.cep && formData.endereco && formData.cidade && formData.estado && formData.telefone && (formData as any).email;
    } else {
      return !!(formData as any).razaoSocial && formData.cnpj && formData.cep && formData.endereco && formData.cidade && formData.estado && formData.telefone && (formData as any).email;
    }
  };

  // Função principal de checkout
  const handleCheckout = async () => {
    console.log("✅ Form válido:", isFormValid());
    console.log("💰 Total:", total);

    if (!isHydrated) {
      setErro("Ainda carregando dados...");
      return;
    }

    if (!user) {
      setErro("Usuário não autenticado. Faça login para continuar.");
      return;
    }

    if (!produtos || produtos.length === 0) {
      setErro("Não há produtos no carrinho.");
      return;
    }

    if (!isFormValid()) {
      setErro("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const artData = formData.selectedImage || imageUrl;
    if (!artData) {
      setErro("Por favor, selecione ou faça upload da arte da campanha (imagem ou vídeo).");
      return;
    }

    setCarregando(true);
    setErro("");

    try {
      let publicUrl: string;

      // Verificar se é um arquivo para upload
      if (artData instanceof File) {
        const fileSizeMB = artData.size / (1024 * 1024);
        
        // Decidir estratégia baseada no tamanho do arquivo
        if (fileSizeMB <= 15) {
          // Arquivo pequeno/médio - upload normal (usuário espera)
          console.log('🚀 Usando upload normal para arquivo pequeno');
          setUploadMode('normal');
          
          const uploadResult = await smartUpload.uploadFile(artData, 'arte-campanhas');
          
          if (!uploadResult) {
            throw new Error(smartUpload.error || 'Erro ao fazer upload do arquivo');
          }
          
          publicUrl = uploadResult.public_url;
          
        } else {
          // Arquivo grande - upload em background (usuário pode ir para checkout)
          console.log('🚀 Usando upload em background para arquivo grande');
          setUploadMode('background');
          
          // Iniciar upload em background
          const uploadId = await backgroundUpload.startBackgroundUpload(artData, 'arte-campanhas');
          setBackgroundUploadId(uploadId);
          
          // Para arquivos grandes, criar um placeholder e continuar para checkout
          // O upload continuará em background e será processado pelo Service Worker
          publicUrl = `background://${uploadId}`;
          
          toast.info('Upload iniciado em background. Você pode continuar para o checkout.');
        }
      } else {
        // URL já existente
        publicUrl = artData;
      }

      // Criar pedido no banco
      const orderData = {
        id_user: user.id,
        produtos: produtos.map(p => ({
          id_produto: p.id,
          quantidade: p.quantidade || 1,
          preco: p.preco,
          desconto: (p as any).desconto || 0
        })),
        total,
        duracao: duration,
        arte_campanha_url: publicUrl,
        status: 'pending'
      };

      const createOrderResponse = await fetch('/api/admin/criar-pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!createOrderResponse.ok) {
        throw new Error('Erro ao criar pedido');
      }

      const { orderId } = await createOrderResponse.json();

      // Dados do pagador
      const payerData = openAccordion === "fisica" ? {
        name: (formData as any).nome,
        email: (formData as any).email,
        identification: {
          type: "CPF",
          number: formData.cpf
        },
        address: {
          street_name: formData.endereco,
          street_number: "123",
          zip_code: formData.cep
        }
      } : {
        name: (formData as any).razaoSocial,
        email: (formData as any).email,
        identification: {
          type: "CNPJ",
          number: formData.cnpj
        },
        address: {
          street_name: formData.endereco,
          street_number: "123",
          zip_code: formData.cep
        }
      };

      // Criar preferência de pagamento
      const response = await fetch('/api/pagamento/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total,
          orderId: orderId,
          arteCampanhaUrl: publicUrl,
          payerData
        }),
      });

      const data = await response.json();

      if (data.init_point) {
        // Redirecionar para checkout do Mercado Pago
        window.location.href = data.init_point;
      } else {
        throw new Error('Erro ao criar preferência de pagamento');
      }

    } catch (error: any) {
      console.error('❌ Erro no checkout:', error);
      setErro(`Erro: ${error.message}`);
      setCarregando(false);
    }
  };

  // Renderizar interface
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Finalizar Pedido</h1>

        {/* Informações do pedido */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Resumo do Pedido</h2>
          {produtos?.map((produto, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b">
              <span>{produto.nome}</span>
              <span className="font-semibold">
                R$ {calcularPrecoComDesconto(produto).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="flex justify-between items-center py-2 font-bold text-lg">
            <span>Total:</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Dados pessoais */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Dados Pessoais</h2>
          
          {/* Seleção de tipo */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Cliente
            </label>
            <Select value={openAccordion || ""} onValueChange={(value) => setOpenAccordion(value as "fisica" | "juridica" | null)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fisica">Pessoa Física</SelectItem>
                <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campos do formulário baseados no tipo selecionado */}
          {openAccordion && (
            <div className="space-y-4">
              {openAccordion === "fisica" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={(formData as any).nome || ""}
                      onChange={(e) => updateFormData({ nome: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CPF *
                    </label>
                    <input
                      type="text"
                      value={formData.cpf || ""}
                      onChange={(e) => updateFormData({ cpf: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Razão Social *
                    </label>
                    <input
                      type="text"
                      value={(formData as any).razaoSocial || ""}
                      onChange={(e) => updateFormData({ razaoSocial: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CNPJ *
                    </label>
                    <input
                      type="text"
                      value={formData.cnpj || ""}
                      onChange={(e) => updateFormData({ cnpj: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </>
              )}

              {/* Campos comuns */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                    <input
                      type="email"
                      value={(formData as any).email || ""}
                      onChange={(e) => updateFormData({ email: e.target.value } as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone *
                </label>
                <input
                  type="tel"
                  value={formData.telefone || ""}
                  onChange={(e) => updateFormData({ telefone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CEP *
                </label>
                <input
                  type="text"
                  value={formData.cep || ""}
                  onChange={(e) => updateFormData({ cep: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço *
                </label>
                <input
                  type="text"
                  value={formData.endereco || ""}
                  onChange={(e) => updateFormData({ endereco: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cidade *
                </label>
                <input
                  type="text"
                  value={formData.cidade || ""}
                  onChange={(e) => updateFormData({ cidade: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado *
                </label>
                <input
                  type="text"
                  value={formData.estado || ""}
                  onChange={(e) => updateFormData({ estado: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          )}
        </div>

        {/* Upload de arte */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Arte da Campanha</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  updateFormData({ selectedImage: file });
                  const url = URL.createObjectURL(file);
                  updateFormData({ previewUrl: url });
                  setImageUrl(url);
                }
              }}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="text-gray-500">
                {imageUrl ? (
                  <div>
                    <p className="text-sm">Arquivo selecionado: {formData.selectedImage instanceof File ? formData.selectedImage.name : 'URL'}</p>
                    {formData.selectedImage instanceof File && (
                      <p className="text-xs text-gray-400 mt-1">
                        Tamanho: {(formData.selectedImage.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-lg">Clique para selecionar arquivo</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Imagens e vídeos até 50MB
                    </p>
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Progresso do upload */}
        <UploadProgress
          progress={uploadMode === 'normal' ? smartUpload.progress : {
            chunksUploaded: 0,
            totalChunks: 0,
            percentage: backgroundUpload.uploads.find(u => u.uploadId === backgroundUploadId)?.percentage || 0,
            phase: backgroundUpload.uploads.find(u => u.uploadId === backgroundUploadId)?.status === 'completed' ? 'completed' : 
                  backgroundUpload.uploads.find(u => u.uploadId === backgroundUploadId)?.status === 'error' ? 'error' : 'uploading',
            fileSizeMB: formData.selectedImage instanceof File ? formData.selectedImage.size / (1024 * 1024) : 0,
            currentSpeed: undefined,
            estimatedTime: undefined
          }}
          isUploading={carregando || smartUpload.isUploading || !!backgroundUploadId}
          error={erro || smartUpload.error || backgroundUpload.uploads.find(u => u.uploadId === backgroundUploadId)?.error || null}
          fileName={formData.selectedImage instanceof File ? formData.selectedImage.name : undefined}
        />

        {/* Mensagem de erro */}
        {!carregando && !smartUpload.isUploading && !backgroundUploadId && erro && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-6">
            ❌ {erro}
          </div>
        )}

        {/* Botões */}
        <div className="flex justify-between items-center">
          <Button
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-8 py-2 rounded-md cursor-pointer"
            type="button"
            onClick={() => window.history.back()}
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
