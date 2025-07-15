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

// Função utilitária para formatar data em dd/MM/yyyy
function formatDateBR(date: Date | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Função para converter string yyyy-MM-dd para Date
function parseISODateString(isoString: string): Date {
  // Garante que a string está no formato yyyy-MM-dd
  return new Date(isoString + 'T00:00:00');
}

// Função utilitária para criar Date local a partir de yyyy-MM-dd
function parseLocalDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Função para criar string UTC yyyy-MM-ddT00:00:00Z
function toUTCDateString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T00:00:00Z`;
}

// Função para criar Date em UTC a partir de yyyy-MM-dd
function parseUTCDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export default function CartResume({ onCartArtSelected, onCampaignNameChange, artError, campaignError }: {
  onCartArtSelected?: (selected: boolean) => void,
  onCampaignNameChange?: (name: string) => void,
  artError?: string,
  campaignError?: string
} = {}) {
  const { 
    produtos, 
    removerProduto, 
    adicionarProduto, 
    selectedDurationGlobal, 
    setSelectedDurationGlobal,
    formData,
    updateFormData
  } = useCart();

  // Estados locais sincronizados com o contexto global
  const [startDate, setStartDate] = useState<string>(
    formData.startDate ? formData.startDate : new Date().toISOString().split('T')[0]
  );
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(formData.previewUrl);
  const [duration, setDuration] = useState(selectedDurationGlobal);
  const [campaignName, setCampaignName] = useState(formData.campaignName);

  // Sincronizar duration local com o global
  useEffect(() => {
    setDuration(selectedDurationGlobal);
  }, [selectedDurationGlobal]);

  // Sincronizar dados do formulário com o contexto global
  useEffect(() => {
    if (formData.startDate) {
      setStartDate(formData.startDate);
    }
    if (formData.previewUrl) {
      setPreviewUrl(formData.previewUrl);
    }
    setCampaignName(formData.campaignName);
  }, [formData]);

  // Converter File para Base64 para armazenamento
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Converter Base64 para File (para quando precisar usar o arquivo)
  const base64ToFile = (base64: string, filename: string): File => {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const durations = [
    { label: "2 semanas", value: "2" },
    { label: "4 semanas", value: "4" },
    { label: "12 semanas", value: "12" },
    { label: "24 semanas", value: "24" },
  ];

  // Debug: verificar se os produtos estão sendo carregados
  console.log("Produtos no carrinho:", produtos);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      // Converter para Base64 e salvar no contexto
      try {
        const base64 = await fileToBase64(file);
        updateFormData({
          selectedImage: base64,
          previewUrl: url,
          isArtSelected: true
        });
        // Salva no localStorage
        const formDataStorage = JSON.parse(localStorage.getItem('formData') || '{}');
        localStorage.setItem('formData', JSON.stringify({ ...formDataStorage, selectedImage: base64, previewUrl: url, isArtSelected: true }));
      } catch (error) {
        console.error('Erro ao converter arquivo para Base64:', error);
      }
      
      if (onCartArtSelected) onCartArtSelected(true);
    }
  };

  const handleDurationChange = (value: string) => {
    setDuration(value);
    setSelectedDurationGlobal(value);
    // Salva no localStorage
    const formDataStorage = JSON.parse(localStorage.getItem('formData') || '{}');
    localStorage.setItem('formData', JSON.stringify({ ...formDataStorage, selectedDurationGlobal: value }));
  };

  const handleCampaignNameChange = (value: string) => {
    setCampaignName(value);
    updateFormData({ campaignName: value });
    if (onCampaignNameChange) onCampaignNameChange(value);
    // Salva no localStorage
    const formDataStorage = JSON.parse(localStorage.getItem('formData') || '{}');
    localStorage.setItem('formData', JSON.stringify({ ...formDataStorage, campaignName: value }));
  };

  const handleStartDateChange = (date: Date | undefined) => {
    if (!date) return;
    // Salvar apenas yyyy-MM-dd
    const ymd = date.toISOString().slice(0, 10);
    setStartDate(ymd);
    updateFormData({ startDate: ymd });
    // Salva no localStorage
    const formDataStorage = JSON.parse(localStorage.getItem('formData') || '{}');
    localStorage.setItem('formData', JSON.stringify({ ...formDataStorage, startDate: ymd }));
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    setSelectedImage(null);
    updateFormData({
      selectedImage: null,
      previewUrl: null,
      isArtSelected: false
    });
    // Salva no localStorage
    const formDataStorage = JSON.parse(localStorage.getItem('formData') || '{}');
    localStorage.setItem('formData', JSON.stringify({ ...formDataStorage, selectedImage: null, previewUrl: null, isArtSelected: false }));
    if (onCartArtSelected) onCartArtSelected(false);
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
            localStorage.removeItem("formData");
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
                className={`w-80 border text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500`}
                placeholder="Digite o nome da campanha"
                value={campaignName}
                onChange={e => handleCampaignNameChange(e.target.value)}
              />
              {campaignError && (
                <span className="text-red-500 text-xs mt-1 block">{campaignError}</span>
              )}
            </div>
            {/* Bloco de duração como select global e início */}
            <div className="flex gap-4 mb-2 items-end">
              <div className="flex flex-col gap-1">
                <label className="block text-xs text-gray-500 font-bold mb-1">Duração</label>
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
                <span className="block text-xs text-gray-500 font-bold mb-1">Início</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-2"
                    >
                      <CalendarIcon className="w-4 h-4 text-orange-500" />
                      <span>
                        {startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)
                          ? formatDateBR(parseLocalDateString(startDate))
                          : "início"}
                      </span>
                      <ChevronDownIcon className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? parseLocalDateString(startDate) : undefined}
                      onSelect={handleStartDateChange}
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
                      className={`cursor-pointer border px-4 py-2 rounded transition hover:bg-gray-50`}
                    >
                      Selecionar arte
                    </label>
                    {artError && (
                      <span className="text-red-500 text-xs mt-1 block">{artError}</span>
                    )}
                  </>
                ) : (
                  <div className="relative flex justify-center items-center gap-4">
                    <button
                      onClick={handleRemoveImage}
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
