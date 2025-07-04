"use client";
import { useCart } from "@/context/CartContext";
import { ArrowLeft, CalendarIcon, ChevronDownIcon, X } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/Components/ui/select";
import { Calendar } from "@/Components/ui/calendar";
import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/Components/ui/popover";
import { Button } from "./ui/button";

export default function CartResume({ onCartArtSelected, onCampaignNameChange, artError = false, campaignError = false }: { onCartArtSelected?: (selected: boolean) => void, onCampaignNameChange?: (name: string) => void, artError?: boolean, campaignError?: boolean } = {}) {
  const { produtos, removerProduto, adicionarProduto } = useCart();

  // Valor inicial: menor duração disponível ou '2'
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState("2");
  const [campaignName, setCampaignName] = useState("");

  // Ao carregar o carrinho, setar o select global conforme o primeiro produto
  useEffect(() => {
    if (produtos.length > 0) {
      const p = produtos[0];
      if (p.selectedDuration) setDuration(p.selectedDuration);
      else setDuration("2");
    }
  }, [produtos]);

  const durations = [
    { label: "2 semanas", value: "2" },
    { label: "4 semanas", value: "4" },
    { label: "12 semanas", value: "12" },
    { label: "24 semanas", value: "24" },
  ];

  // Debug: verificar se os produtos estão sendo carregados
  console.log("Produtos no carrinho:", produtos);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      if (onCartArtSelected) onCartArtSelected(true);
    }
  };

  const handleDurationChange = (value: string) => {
    setDuration(value);
  };

  const calcularPreco = (item: any) => {
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
      if (duration === "4") {
        preco = item.preco * 2;
        desconto = descontos['4'];
      }
      if (duration === "12") {
        preco = item.preco * 6;
        desconto = descontos['12'];
      }
      if (duration === "24") {
        preco = item.preco * 12;
        desconto = descontos['24'];
      }
    }
    preco = preco - desconto;
    return preco;
  };

  return (
    <div className="w-full h-full px-4 md:px-12 py-6 flex flex-col gap-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Plano de Mídia</h2>
        <button
          onClick={() => {
            localStorage.removeItem("cart");
            window.location.reload();
          }}
          className="text-sm bg-red-500 text-white px-4 py-2 rounded-md cursor-pointer disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          disabled={produtos.length === 0}
        >
          Limpar carrinho
        </button>
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-1/2 h-full overflow-auto">
          {produtos.length === 0 ? (
            <p>Nenhum produto adicionado.</p>
          ) : (
            produtos.map((item) => {
              console.log("Item individual:", item);
              // Lógica de cálculo de preço igual ao HeaderResults/GetAnunciosResults
              let precoCalculado = calcularPreco(item);
              return (
                <div
                  key={item.id}
                  className="border p-4 mb-3 rounded-lg flex sm:flex-row justify-between items-center bg-white shadow-sm"
                >
                  <div className="flex flex-col gap-2 flex-1 min-w-0 mb-3 sm:mb-0">
                    <div className="flex items-center gap-2">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.nome}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <h3 className="font-semibold text-lg">{item.nome}</h3>
                    </div>
                    {item.endereco ? (
                      <p className="text-sm text-gray-600 break-words">
                        {item.endereco}
                      </p>
                    ) : (
                      <p className="text-sm text-red-500">
                        Endereço não disponível
                      </p>
                    )}

                    {/* Preço original riscado e preço com desconto */}
                    {(() => {
                      let precoOriginal = item.preco;
                      const durationsTrue = [
                        item.duration_2,
                        item.duration_4,
                        item.duration_12,
                        item.duration_24,
                      ].filter(Boolean).length;
                      if (durationsTrue > 1) {
                        if (duration === "4") precoOriginal = item.preco * 2;
                        if (duration === "12") precoOriginal = item.preco * 6;
                        if (duration === "24") precoOriginal = item.preco * 12;
                      }
                      return (
                        <div className="flex flex-col gap-1">
                          {precoOriginal !== precoCalculado && (
                            <span className="text-sm text-gray-400 line-through">R$ {Number(precoOriginal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} x {item.quantidade}</span>
                          )}
                          <span className="font-semibold text-green-700">
                            R$ {precoCalculado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} x {item.quantidade}
                            <span className="ml-2 text-xs text-gray-500">/ {duration} semana(s)</span>
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white px-4 py-2 rounded-md cursor-pointer"
                    onClick={() => removerProduto(item.id)}
                  >
                    Remover
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Painel lateral com resumo do plano */}
        {produtos.length > 0 && (
          <div className="w-full lg:w-1/2 bg-white rounded-lg shadow p-6 flex flex-col gap-6 border border-neutral-200">
            {/* Input do nome da campanha */}
            <div className="flex flex-col gap-1 mb-2">
              <label htmlFor="campaign-name" className="block text-sm font-bold mb-1">Nome da campanha</label>
              <input
                id="campaign-name"
                type="text"
                className={`w-80 border text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${campaignError ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Digite o nome da campanha"
                value={campaignName}
                onChange={e => {
                  setCampaignName(e.target.value);
                  if (onCampaignNameChange) onCampaignNameChange(e.target.value);
                }}
              />
            </div>
            {/* Bloco de duração como select global e início */}
            <div className="flex gap-4 mb-2 items-end">
              <div className="flex flex-col gap-1">
                <span className="block text-xs text-gray-500">duração</span>
                <Select value={duration} onValueChange={handleDurationChange}>
                  <SelectTrigger className="w-32 bg-gray-50 rounded-lg px-3 py-2">
                    <SelectValue placeholder="duração" />
                  </SelectTrigger>
                  <SelectContent>
                    {durations.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <span className="block text-xs text-gray-500 mb-1">Início</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-2"
                    >
                      <CalendarIcon className="w-4 h-4 text-orange-500" />
                      <span>
                        {startDate
                          ? startDate.toLocaleDateString("pt-BR")
                          : "início"}
                      </span>
                      <ChevronDownIcon className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {/* Performance projetada */}
            <div>
              <h2 className="text-lg font-bold mb-2">Performance projetada</h2>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="block text-xs text-gray-500">exibições</span>
                  <span className="font-bold">
                    {(() => {
                      let total = 0;
                      produtos.forEach((p) => {
                        let display = Number(p.display) || 0;
                        const durationsTrue = [
                          p.duration_2,
                          p.duration_4,
                          p.duration_12,
                          p.duration_24,
                        ].filter(Boolean).length;
                        if (durationsTrue > 1) {
                          if (duration === "4") display = display * 2;
                          if (duration === "12") display = display * 6;
                          if (duration === "24") display = display * 12;
                        }
                        total += display;
                      });
                      return total >= 1000
                        ? (total / 1000).toLocaleString("pt-BR", {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          }) + " mil"
                        : total.toLocaleString("pt-BR");
                    })()}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">alcance</span>
                  <span className="font-bold">
                    {(() => {
                      let total = 0;
                      produtos.forEach((p) => {
                        let views = Number(p.views) || 0;
                        const durationsTrue = [
                          p.duration_2,
                          p.duration_4,
                          p.duration_12,
                          p.duration_24,
                        ].filter(Boolean).length;
                        if (durationsTrue > 1) {
                          if (duration === "4") views = views * 2;
                          if (duration === "12") views = views * 6;
                          if (duration === "24") views = views * 12;
                        }
                        total += views;
                      });
                      return total >= 1000
                        ? (total / 1000).toLocaleString("pt-BR", {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          }) + " mil"
                        : total.toLocaleString("pt-BR");
                    })()}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">telas</span>
                  <span className="font-bold">
                    {produtos.reduce(
                      (acc, p) => acc + (Number(p.screens) || 0),
                      0
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="block text-lg font-bold mb-3">
                Carregar arte de exibição
              </span>
              <div className="flex items-center gap-4 relative">
                {!previewUrl ? (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      id="upload-art"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    <label
                      htmlFor="upload-art"
                      className={`cursor-pointer border px-4 py-2 rounded transition hover:bg-gray-50 ${artError ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      Selecionar arte
                    </label>
                  </>
                ) : (
                  <div className="relative flex justify-center items-center gap-4">
                    <button
                      onClick={() => {
                        setPreviewUrl(null);
                        setSelectedImage(null);
                        if (onCartArtSelected) onCartArtSelected(false);
                      }}
                      className="absolute -top-3 -right-3 w-6 h-6 flex  items-center justify-center  border border-gray-300 rounded-full bg-white text-xl font-bold cursor-pointer z-10"
                      aria-label="Remover arte"
                    >
                      <X className="w-4" />
                    </button>
                    <img
                      src={previewUrl}
                      alt="Arte selecionada"
                      className="w-12 h-12 object-cover rounded"
                    />
                    <span>Arte selecionada</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-3">Foto/Vídeo Máximo 40 Segundos, Proporção 1080x1920 px.</p>
            </div>

            {/* Valor */}
            <div>
              <h2 className="text-lg font-bold mb-2">Valor</h2>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600">Subtotal</span>
                {(() => {
                  let precoOriginal = produtos.reduce((acc, item) => {
                    let preco = item.preco;
                    const durationsTrue = [
                      item.duration_2,
                      item.duration_4,
                      item.duration_12,
                      item.duration_24,
                    ].filter(Boolean).length;
                    if (durationsTrue > 1) {
                      if (duration === "4") preco = item.preco * 2;
                      if (duration === "12") preco = item.preco * 6;
                      if (duration === "24") preco = item.preco * 12;
                    }
                    return acc + preco * item.quantidade;
                  }, 0);
                  let precoComDesconto = produtos.reduce((acc, item) => acc + calcularPreco(item) * item.quantidade, 0);
                  return (
                    <span className="flex flex-col items-end">
                      {precoOriginal !== precoComDesconto && (
                        <span className="text-sm text-gray-400 line-through">R$ {precoOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      )}
                      <span className="font-semibold text-black">R$ {precoComDesconto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </span>
                  );
                })()}
              </div>
              <a
                href="#"
                className="text-xs text-blue-600 underline mb-2 block"
              >
                Possui um cupom de desconto?
              </a>
              <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                <span>Total</span>
                <span>
                  R${" "}
                  {produtos
                    .reduce((acc: number, item) => acc + calcularPreco(item) * item.quantidade, 0)
                    .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}
        {/* Fim do painel lateral */}
      </div>
    </div>
  );
}
