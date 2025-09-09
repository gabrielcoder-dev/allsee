"use client";

import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "./ui/select";
import { useCart } from "@/context/CartContext";
import { SiPix } from "react-icons/si";
import { FaRegCreditCard } from "react-icons/fa";
import { MdCreditCard } from "react-icons/md";
import { PiBarcodeBold } from "react-icons/pi";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useUser } from "@supabase/auth-helpers-react";

const PagamantosPart = () => {
  const user = useUser();
  const { produtos, selectedDurationGlobal, formData, updateFormData } = useCart();
  // Duração fixa igual ao padrão do carrinho
  const duration = "2";

  // Preencher automaticamente os campos quando a página carregar
  useEffect(() => {
    // Se já temos dados de pessoa física preenchidos, seleciona automaticamente
    if (formData.cpf && formData.cep && formData.endereco) {
      setOpenAccordion("fisica");
    }
    // Se já temos dados de pessoa jurídica preenchidos, seleciona automaticamente
    else if (formData.cnpj && formData.razaoSocial) {
      setOpenAccordion("juridica");
    }
  }, [formData]);

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

  // Subtotal (original) e total (com desconto)
  const precoOriginal = produtos.reduce((acc, item) => acc + calcularPrecoOriginal(item), 0);
  const precoComDesconto = produtos.reduce((acc, item) => acc + calcularPrecoComDesconto(item), 0);
  const total = precoComDesconto;
  const [openAccordion, setOpenAccordion] = useState<
    "fisica" | "juridica" | null
  >(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  // Função para verificar se todos os campos obrigatórios estão preenchidos (exceto complemento)
  const isFormValid = () => {
    // Pessoa Física
    if (openAccordion === "fisica") {
      return (
        !!formData.cpf &&
        !!formData.telefone &&
        !!formData.cep &&
        !!formData.endereco &&
        !!formData.numero &&
        !!formData.bairro &&
        !!formData.cidade &&
        !!formData.estado
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
        !!formData.estadoJ
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

    // Verifica se o usuário está autenticado
    if (!user?.id) {
      setErro("Você precisa estar logado para concluir a compra.");
      setCarregando(false);
      return;
    }

    try {
      // Mapeamento explícito: cada campo do frontend para a coluna da tabela order
      const orderPayload = {
        id_user: user.id, // id_user: id do usuário autenticado (agora sempre string e nunca null)
        id_produto: produtos[0]?.id || null, // id_produto: id do produto selecionado (primeiro do carrinho)
        nome_campanha: formData.campaignName || null, // nome_campanha: input de nome da campanha (CartResume)
        duracao_campanha: selectedDurationGlobal || null, // duracao_campanha: valor do select de duração
        inicio_campanha: formData.startDate ? formData.startDate.split('T')[0] : null, // inicio_campanha: valor do popover de data, formato yyyy-MM-dd, igual ao exibido
        arte_campanha: formData.selectedImage || null, // arte_campanha: arquivo selecionado no input de arte (base64 ou url)
        cpf: formData.cpf || null, // cpf: input de CPF (PagamantosPart)
        cnpj: formData.cnpj || null, // cnpj: input de CNPJ (PagamantosPart)
        razao_social: formData.razaoSocial || null, // razao_social: input de razão social (PagamantosPart)
        setor: formData.segmento || null, // setor: select de setor (PagamantosPart)
        telefone: formData.telefone || formData.telefonej || null, // telefone: input de telefone (PF ou PJ)
        cep: formData.cep || formData.cepJ || null, // cep: input de CEP (PF ou PJ)
        endereco: formData.endereco || formData.enderecoJ || null, // endereco: input de endereço (PF ou PJ)
        numero: formData.numero || formData.numeroJ || null, // numero: input de número (PF ou PJ)
        bairro: formData.bairro || formData.bairroJ || null, // bairro: input de bairro (PF ou PJ)
        complemento: formData.complemento || formData.complementoJ || null,
        cidade: formData.cidade || formData.cidadeJ || null, // cidade: input de cidade (PF ou PJ)
        estado: formData.estado || formData.estadoJ || null, // estado: input de estado (PF ou PJ)
        preco: precoComDesconto, // preço total exibido no resumo de valores
      };
      console.log('Payload enviado para o backend:', orderPayload);
      console.log("Payload do pedido:", orderPayload);

      // 1. Criar order no banco
      console.log("📤 Enviando dados para criar-compra...");
      const orderRes = await fetch("/api/pagamento/criar-compra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });
      const orderData = await orderRes.json();
      console.log("📥 Resposta do criar-compra:", orderData);
      
      if (!orderData.success || !orderData.orderId) {
        console.error("❌ Erro ao criar pedido:", orderData);
        setErro(orderData.error || "Erro ao criar pedido");
        setCarregando(false);
        return;
      }
      
      console.log("✅ Order criado com sucesso, ID:", orderData.orderId);

      // 2. Preparar dados do pagador
      const payerData = {
        name: formData.cpf ? 'Pessoa Física' : formData.razaoSocial || 'Cliente Allsee',
        email: user.email || 'cliente@allsee.com',
        cpf: formData.cpf || null,
        telefone: formData.telefone || formData.telefonej || null,
        cep: formData.cep || formData.cepJ || null,
        endereco: formData.endereco || formData.enderecoJ || null,
        numero: formData.numero || formData.numeroJ || null,
        bairro: formData.bairro || formData.bairroJ || null,
        cidade: formData.cidade || formData.cidadeJ || null,
        estado: formData.estado || formData.estadoJ || null,
      };

      // 3. Chamar checkout com orderId e dados do pagador
      console.log("💳 Enviando dados para checkout...");
      const response = await fetch("/api/pagamento/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          total, 
          orderId: orderData.orderId,
          payerData 
        }),
      });
      const data = await response.json();
      console.log("📥 Resposta do checkout:", data);
      
      if (data.success && data.init_point) {
        console.log("✅ Redirecionando para:", data.init_point);
        window.location.href = data.init_point;
      } else {
        console.error("❌ Erro no checkout:", data);
        setErro(data.error || "Erro ao iniciar pagamento");
      }
    } catch (e) {
      setErro("Erro ao conectar ao servidor");
      console.error("Erro no handleCheckout:", e);
    } finally {
      setCarregando(false);
    }
  };

  const router = useRouter();

  // Remover qualquer referência a funções, estados ou variáveis que não existem mais (ex: handleConcluir, formData, campos de pessoa física/jurídica, nome de campanha, imagem, etc). Deixe apenas o fluxo de pagamento essencial e o que for necessário para funcionamento do componente.

  return (
    <div className="flex flex-col items-center w-full min-h-screen py-8 bg-[#fcfcfc] px-2 md:px-0">
      <div className="max-w-2xl w-full mx-auto flex flex-col gap-10">

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
        <div className="bg-white rounded-xl shadow border border-gray-100 p-4 md:p-8 flex flex-col gap-6">
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

        {/* Dados do faturamento */}
        <div className="bg-white rounded-xl shadow border border-gray-100 p-4 md:p-8 flex flex-col gap-4">
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
                {/* <p className='text-center text-xs text-gray-500'>A NOTA FISCAL SERÁ ENCAMINHADA VIA WHATSAPP E E-MAIL</p> */}
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
                <p className="text-center text-xs text-gray-500">
                  A NOTA FISCAL SERÁ ENCAMINHADA VIA WHATSAPP E E-MAIL
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mensagem de erro */}
        {erro && (
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
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500 mt-2">
              Debug: carregando={carregando.toString()}, 
              produtos={produtos.length}, 
              formValido={isFormValid().toString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PagamantosPart;
