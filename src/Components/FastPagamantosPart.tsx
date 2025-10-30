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
  const { uploadFile, isUploading, error: uploadError } = useFastUpload({
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
    
    if (formData.nome && formData.cpf && formData.cep && formData.endereco) {
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
      return !!formData.nome && formData.cpf && formData.cep && formData.endereco && formData.cidade && formData.estado && formData.telefone && formData.email;
    } else {
      return !!formData.razaoSocial && formData.cnpj && formData.cep && formData.endereco && formData.cidade && formData.estado && formData.telefone && formData.email;
    }
  };

  // Salvar pedido (sem checkout/pagamento)
  const handleSalvarPedido = async () => {
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

    // Não bloquear salvamento por validação de formulário neste momento

    setCarregando(true);
    setErro("");

    try {
      let publicUrl: string | undefined;

      const artData = formData.selectedImage || imageUrl;
      if (artData instanceof File) {
        const uploadResult = await uploadFile(artData, 'arte-campanhas');
        if (!uploadResult) {
          throw new Error(uploadError || 'Erro ao fazer upload do arquivo');
        }
        publicUrl = uploadResult.public_url;
      } else if (typeof artData === 'string') {
        publicUrl = artData;
      }

      let cliente: any;
      if (openAccordion === 'fisica' || (!openAccordion && !formData.cnpj)) {
        cliente = {
          tipo: 'fisica',
          nome: formData.nome,
          cpf: formData.cpf,
          email: formData.email,
          telefone: formData.telefone,
          cep: formData.cep,
          endereco: formData.endereco,
          cidade: formData.cidade,
          estado: formData.estado,
        };
      } else if (openAccordion === 'juridica' || (!openAccordion && formData.cnpj)) {
        cliente = {
          tipo: 'juridica',
          razaoSocial: formData.razaoSocial,
          cnpj: formData.cnpj,
          email: formData.email,
          telefone: formData.telefone,
          cep: formData.cep,
          endereco: formData.endereco,
          cidade: formData.cidade,
          estado: formData.estado,
        };
      } else {
        cliente = {
          tipo: 'desconhecido',
          email: formData.email,
          telefone: formData.telefone,
          cep: formData.cep,
          endereco: formData.endereco,
          cidade: formData.cidade,
          estado: formData.estado,
        };
      }

      const orderData: any = {
        id_user: user.id,
        produtos: produtos.map(p => ({
          id_produto: p.id,
          quantidade: p.quantidade || 1,
          preco: p.preco,
          desconto: (p as any).desconto || 0
        })),
        total,
        duracao: "2",
        status: 'draft',
        cliente,
      };

      if (publicUrl) {
        orderData.arte_campanha_url = publicUrl;
      }

      const createOrderResponse = await fetch('/api/admin/criar-pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!createOrderResponse.ok) {
        throw new Error('Erro ao criar pedido');
      }

      const { orderId } = await createOrderResponse.json();
      updateFormData({ orderId } as any);

      if (formData.totensArtes && Object.keys(formData.totensArtes).length > 0) {
        try {
          const { uploadArtesDoPedido } = await import('@/services/arteCampanha');
          const results = await uploadArtesDoPedido({
            orderId,
            userId: user.id,
            produtos,
            totensArtes: formData.totensArtes,
          });
          const errors = results.filter((r: any) => !r.apiOk);
          if (errors.length > 0) {
            toast.warning('Algumas artes não foram enviadas. Você pode tentar novamente depois.');
          }
        } catch (e) {
          console.error('Erro ao enviar artes dos totens:', e);
          toast.warning('Erro ao enviar artes dos totens. Você pode enviar depois.');
        }
      }

      toast.success('Pedido salvo com sucesso!');
      setCarregando(false);
    } catch (error: any) {
      console.error('Erro ao salvar pedido:', error);
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
                      value={formData.nome || ""}
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
                      value={formData.razaoSocial || ""}
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
                  value={formData.email || ""}
                  onChange={(e) => updateFormData({ email: e.target.value })}
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
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-2 rounded-md cursor-pointer pointer-events-auto relative z-10 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            disabled={carregando || !isFormValid()}
            onClick={handleSalvarPedido}
          >
            {carregando ? "Processando..." : "Concluir"}
          </Button>
        </div>
      </div>
    </div>
  );
};
