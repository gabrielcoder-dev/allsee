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

/**
 * Componente de pagamento com upload SUPER RÁPIDO
 * 
 * Características:
 * - Upload inteligente baseado no tamanho do arquivo
 * - Arquivos pequenos: Upload direto (sem chunks)
 * - Arquivos médios/grandes: Chunks otimizados
 * - Interface limpa e progresso em tempo real
 */

export const FastPagamantosPart = () => {
  const user = useUser();
  const { produtos, formData, updateFormData } = useCart();
  
  // Hook de upload rápido
  const { uploadFile, progress: uploadProgress, isUploading, error: uploadError } = useFastUpload({
    onProgress: (progress) => {
      console.log(`📊 Upload progress: ${progress.percentage}%`);
    }
  });

  // Estados
  const [isHydrated, setIsHydrated] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [openAccordion, setOpenAccordion] = useState<"fisica" | "juridica" | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(
    formData.selectedImage instanceof File ? formData.previewUrl : (formData.selectedImage || null)
  );

  // Controlar hidratação
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Preencher automaticamente os campos
  useEffect(() => {
    if (!isHydrated) return;
    
    if ((formData as any).nome && formData.cpf && formData.cep && formData.endereco) {
      setOpenAccordion("fisica");
    } else if (formData.cnpj && formData.razaoSocial) {
      setOpenAccordion("juridica");
    }
  }, [formData, isHydrated]);

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

    const hasArt = !!formData.isArtSelected || !!imageUrl;
    if (!hasArt) {
      setErro("Por favor, selecione ou faça upload da arte da campanha (imagem ou vídeo).");
      return;
    }

    setCarregando(true);
    setErro("");

    try {
      let publicUrl: string;

      // Pegar arte - pode ser File ou URL
      const artData = formData.selectedImage || imageUrl;

      if (!artData) {
        throw new Error("Arte não encontrada. Por favor, selecione uma arte.");
      }

      // Verificar se é um arquivo para upload
      if (artData instanceof File) {
        console.log('🚀 Iniciando upload rápido...');
        
        const uploadResult = await uploadFile(artData, 'arte-campanhas');
        
        if (!uploadResult) {
          throw new Error(uploadError || 'Erro ao fazer upload do arquivo');
        }
        
        publicUrl = uploadResult.public_url;
        toast.success('Upload concluído com sucesso!');
        
      } else {
        // URL já existente
        publicUrl = artData as string;
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
        duracao: "2",
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

      // Salvar orderId no formData para uso posterior (ex: upload de artes)
      updateFormData({ orderId } as any);

      // Se houver totensArtes no formData, fazer upload automaticamente
      if (formData.totensArtes && Object.keys(formData.totensArtes).length > 0) {
        try {
          const { uploadArtesDoPedido } = await import('@/services/arteCampanha');
          const results = await uploadArtesDoPedido({
            orderId,
            userId: user.id,
            produtos,
            totensArtes: formData.totensArtes,
          });
          
          const errors = results.filter(r => !r.apiOk);
          if (errors.length > 0) {
            console.warn('Alguns uploads falharam:', errors);
            toast.warning('Algumas artes não foram enviadas. Tente novamente no modal de seleção de arte.');
          } else {
            toast.success(`${results.length} arte(s) enviada(s) com sucesso!`);
          }
        } catch (uploadError: any) {
          console.error('Erro ao fazer upload das artes:', uploadError);
          toast.warning('Erro ao fazer upload das artes. Você pode enviá-las depois no modal de seleção de arte.');
        }
      }

      // Sistema de pagamento removido - Integração com Mercado Pago desativada
      console.log("💳 Pagamento removido - Integração com Mercado Pago desativada");
      // TODO: Implementar novo sistema de pagamento
      throw new Error('Sistema de pagamento temporariamente indisponível. Entre em contato com o suporte.');

    } catch (error: any) {
      console.error('❌ Erro no checkout:', error);
      setErro(`Erro: ${error.message}`);
      setCarregando(false);
    }
  };

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


        {/* Mensagem de erro */}
        {!isUploading && erro && !uploadError && (
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
