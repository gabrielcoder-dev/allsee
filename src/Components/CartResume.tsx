"use client";
import { useCart } from "@/context/CartContext";
import { ArrowLeft, CalendarIcon, ChevronDownIcon, X, Trash } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/Components/ui/select";
import { Calendar } from "@/Components/ui/calendar";
import { useState, useEffect, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/Components/ui/popover";
import { Button } from "./ui/button";
import dynamic from 'next/dynamic';

// Importação dinâmica do mapa para evitar problemas de SSR
const ResumoMap = dynamic(() => import('./ResumoMap'), { 
  ssr: false,
  loading: () => (
    <div className="hidden lg:flex w-full h-64 items-center justify-center bg-gray-100 rounded-lg">
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="text-sm text-gray-600">Carregando mapa...</span>
      </div>
    </div>
  )
});

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

// Badge organizado para type_screen
const renderTypeScreenBadge = (type: string | undefined) => {
  const t = type?.toLowerCase();
  if (t === 'impresso') {
    return (
      <span className="bg-green-600 text-white text-xs px-3 py-1 rounded font-medium flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="6" y="9" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="9" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="9" y="17" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2"/></svg>
        impresso
      </span>
    );
  } else if (t === 'digital') {
    return (
      <span className="bg-purple-600 text-white text-xs px-3 py-1 rounded font-medium flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="8" y="19" width="8" height="2" rx="1" stroke="currentColor" strokeWidth="2"/></svg>
        digital
      </span>
    );
  } else if (t) {
    // Badge para outros tipos
    return (
      <span className="bg-gray-500 text-white text-xs px-3 py-1 rounded font-medium flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/></svg>
        {t}
      </span>
    );
  } else {
    // Caso não informado
    return (
      <span className="bg-gray-300 text-gray-700 text-xs px-3 py-1 rounded font-medium flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/></svg>
        tipo não informado
      </span>
    );
  }
};

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
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({ impresso: true, digital: true });
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);

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

  // Função para gerar thumbnail de vídeo
  const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.src = URL.createObjectURL(file);
      video.playsInline = true;
      video.onloadeddata = () => {
        // Tenta capturar o frame do tempo 1s, se possível
        if (video.duration < 1) {
          captureFrame(0);
        } else {
          video.currentTime = 1;
        }
      };
      video.onseeked = () => {
        captureFrame(video.currentTime);
      };
      video.onerror = () => {
        reject('Erro ao carregar vídeo');
      };
      function captureFrame(time: number) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageUrl = canvas.toDataURL('image/png');
          resolve(imageUrl);
        } else {
          reject('Erro ao criar contexto do canvas');
        }
        URL.revokeObjectURL(video.src);
      }
    });
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
      // Limite de tamanho (5MB para imagem, 1GB para vídeo)
      const isVideo = file.type.startsWith("video/");
      const maxSize = isVideo ? 1 * 1024 * 1024 * 1024 : 5 * 1024 * 1024; // 1GB ou 5MB

      if (file.size > maxSize) {
        alert(`O arquivo é muito grande. O limite é de ${isVideo ? "1GB para vídeos" : "5MB para imagens"}.`);
        return;
      }

      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      if (!isVideo) {
        setVideoThumbnail(null);
        // Salva imagem em base64 no localStorage
        try {
          const base64 = await fileToBase64(file);
          updateFormData({
            selectedImage: base64,
            previewUrl: url,
            isArtSelected: true
          });
          const formDataStorage = JSON.parse(localStorage.getItem('formData') || '{}');
          localStorage.setItem('formData', JSON.stringify({ ...formDataStorage, selectedImage: base64, previewUrl: url, isArtSelected: true }));
        } catch (error) {
          console.error('Erro ao converter arquivo para Base64:', error);
        }
      } else {
        // Para vídeo, salva apenas previewUrl e flag no contexto/localStorage
        updateFormData({
          selectedImage: null,
          previewUrl: url,
          isArtSelected: true
        });
        const formDataStorage = JSON.parse(localStorage.getItem('formData') || '{}');
        localStorage.setItem('formData', JSON.stringify({ ...formDataStorage, selectedImage: null, previewUrl: url, isArtSelected: true }));
        // Gerar thumbnail do vídeo
        try {
          const thumbnail = await generateVideoThumbnail(file);
          setVideoThumbnail(thumbnail);
        } catch (err) {
          setVideoThumbnail(null);
        }
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
    <div className="w-full h-full px-2 sm:px-4 md:px-12 py-4 lg:py-6 flex flex-col gap-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl lg:text-2xl font-bold">Plano de Mídia</h2>
        <button
          onClick={() => {
            localStorage.removeItem("cart");
            localStorage.removeItem("formData");
            window.location.reload();
          }}
          className="text-xs lg:text-sm text-red-500 underline px-2 lg:px-4 py-2 rounded-md cursor-pointer disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          disabled={produtos.length === 0}
        >
          Limpar carrinho
        </button>
      </div>
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 flex-1 min-h-0">
        <div className="w-full lg:w-1/2 lg:overflow-y-auto">
                     {produtos.length === 0 ? (
             <p>Nenhum produto adicionado.</p>
           ) : (
             <>
               {/* Título e Mapa - apenas no desktop, em primeiro lugar */}
               <div className="hidden lg:block mb-6">
                 <h3 className="text-lg font-bold mb-3 text-[#3b4252]">Totens que você adicionou</h3>
                 <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-200">
                   <ResumoMap produtos={produtos} />
                 </div>
               </div>
               
               {/* Grupos de produtos originais */}
               {['impresso', 'digital'].map((tipo) => {
                 const itensTipo = produtos.filter((item) => (item.type_screen?.toLowerCase() || 'digital') === tipo);
                 if (itensTipo.length === 0) return null;
                 const isOpen = openGroups[tipo];
                 const pontosLabel = itensTipo.length === 1 ? 'ponto' : 'pontos';
                 return (
                   <div
                     key={tipo}
                     className="mb-2 rounded-sm border bg-[#f7f9fb] transition-all duration-300"
                     style={{ overflow: 'hidden' }}
                   >
                     <div
                       className={`flex items-center justify-between px-5 py-4 bg-white cursor-pointer select-none transition-colors duration-200 rounded-t-xl`}
                       onClick={() => setOpenGroups((prev) => ({ ...prev, [tipo]: !prev[tipo] }))}
                     >
                       <span className="font-medium text-base capitalize text-[#3b4252] tracking-tight">
                         {tipo} ({itensTipo.length} {pontosLabel})
                       </span>
                       <button
                         className="rounded-full p-1 hover:bg-gray-200 transition"
                         tabIndex={-1}
                         aria-label={isOpen ? `Fechar ${tipo}` : `Abrir ${tipo}`}
                         onClick={e => { e.stopPropagation(); setOpenGroups((prev) => ({ ...prev, [tipo]: !prev[tipo] })); }}
                       >
                         <svg className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                       </button>
                     </div>
                     <div
                       className={`transition-all duration-300 ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'} bg-[#f7f9fb]`}
                       style={{ overflow: 'hidden' }}
                     >
                       {isOpen && (
                         <div className="p-4 space-y-3">
                           {/* Lista de produtos */}
                           {itensTipo.map((item) => {
                             let precoCalculado = calcularPreco(item);
                             return (
                               <div key={item.id} className="bg-white border border-neutral-200 rounded-lg flex flex-col gap-2 p-3 md:flex-row md:items-center md:gap-0 relative">
                                 <div className="flex-1">
                                   <div className="flex items-center gap-2 mb-1">
                                     {renderTypeScreenBadge(item.type_screen)}
                                     <h3 className="font-medium text-base text-[#3b4252]">{item.nome}</h3>
                                   </div>
                                   <div className="text-xs text-gray-600 mb-1">{item.endereco}</div>
                                   <div className="flex items-center gap-4 mt-1">
                                     <span className="text-base font-semibold text-green-700">R$ {precoCalculado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                     <span className="text-xs text-gray-500">/ {duration} semana(s)</span>
                                   </div>
                                 </div>
                                 <button
                                   className="md:absolute md:top-1/2 md:-translate-y-1/2 md:right-6 cursor-pointer ml-auto rounded-full bg-[#fee2e2] hover:bg-red-200 transition p-2 px-2 flex items-center justify-center"
                                   onClick={() => removerProduto(item.id)}
                                   title="Remover"
                                   style={{ minWidth: 56, minHeight: 56 }}
                                 >
                                   <Trash className="w-5 h-5 text-red-700 font-bold" />
                                 </button>
                               </div>
                             );
                           })}
                         </div>
                       )}
                     </div>
                   </div>
                 );
               })}
             </>
           )}
         </div>

        {/* Painel lateral com resumo do plano */}
        {produtos.length > 0 && (
          <div className="w-full lg:w-1/2 bg-white rounded-lg shadow p-4 lg:p-6 flex flex-col gap-4 lg:gap-6 border border-neutral-200 lg:overflow-y-auto">
            {/* Input do nome da campanha */}
            <div className="flex flex-col gap-1 mb-2">
              <label htmlFor="campaign-name" className="block text-sm font-bold mb-1">Nome da campanha</label>
              <input
                id="campaign-name"
                type="text"
                className={`w-full lg:w-80 border text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500`}
                placeholder="Digite o nome da campanha"
                value={campaignName}
                onChange={e => handleCampaignNameChange(e.target.value)}
              />
              {campaignError && (
                <span className="text-red-500 text-xs mt-1 block">{campaignError}</span>
              )}
            </div>
            {/* Bloco de duração como select global e início */}
            <div className="flex flex-col sm:flex-row gap-4 mb-2 items-start sm:items-end">
              <div className="flex flex-col gap-1">
                <label className="block text-xs text-gray-500 font-bold mb-1">Duração</label>
                <Select value={duration} onValueChange={handleDurationChange}>
                  <SelectTrigger className="w-full sm:w-32 bg-gray-50 rounded-lg px-3 py-2">
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
                      className="w-full sm:w-auto bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-2"
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
                    {((): string => {
                      const temDigital = produtos.some((p: any) => (p.type_screen?.toLowerCase?.() || 'digital') === 'digital');
                      if (!temDigital) {
                        return 'fixo';
                      } else {
                        let total = 0;
                        produtos.forEach((p: any) => {
                          if ((p.type_screen?.toLowerCase?.() || 'digital') === 'digital') {
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
                          }
                        });
                        return total >= 1000
                          ? (total / 1000).toLocaleString("pt-BR", {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            }) + " mil"
                          : total.toLocaleString("pt-BR");
                      }
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative">
                {!previewUrl ? (
                  <>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      id="upload-art"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    <label
                      htmlFor="upload-art"
                      className={`w-full sm:w-auto cursor-pointer border px-4 py-2 rounded transition hover:bg-gray-50 text-center`}
                    >
                      Selecionar arte
                    </label>
                    {artError && (
                      <span className="text-red-500 text-xs mt-1 block">{artError}</span>
                    )}
                  </>
                ) : (
                  <div className="relative flex flex-col sm:flex-row justify-center items-center gap-4 w-full">
                    <button
                      onClick={handleRemoveImage}
                      className="absolute -top-3 -right-3 w-6 h-6 flex items-center justify-center border border-gray-300 rounded-full bg-white text-xl font-bold cursor-pointer z-10"
                      aria-label="Remover arte"
                    >
                      <X className="w-4" />
                    </button>
                    {/* Se for vídeo e tiver thumbnail, mostra a thumbnail. Senão, mostra previewUrl */}
                    {selectedImage && selectedImage.type && selectedImage.type.startsWith('video/') && videoThumbnail ? (
                      <img
                        src={videoThumbnail}
                        alt="Thumbnail do vídeo"
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        alt="Arte selecionada"
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
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
