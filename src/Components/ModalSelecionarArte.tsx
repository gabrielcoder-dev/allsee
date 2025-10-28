"use client";

import React, { useState, useRef } from "react";
import { X, Monitor, Printer } from "lucide-react";
import { useCart } from "@/context/CartContext";

interface ModalSelecionarArteProps {
  open: boolean;
  onClose: () => void;
}

export default function ModalSelecionarArte({
  open,
  onClose,
}: ModalSelecionarArteProps) {
  const { produtos, updateFormData, formData } = useCart();
  const [selectedAnuncio, setSelectedAnuncio] = useState<any>(null);
  const [totensArtes, setTotensArtes] = useState<Record<string, { file: File; previewUrl: string }>>({});
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({ impresso: true, digital: true });
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  // Separar produtos por tipo
  const produtosDigitais = produtos.filter(
    (p) => p.type_screen?.toLowerCase() === "digital"
  );
  const produtosImpressos = produtos.filter(
    (p) => p.type_screen?.toLowerCase() === "impresso"
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && selectedAnuncio) {
      const file = e.target.files[0];
      
      // Criar URL de preview
      const url = URL.createObjectURL(file);
      
      // Salvar a arte para o totem específico
      setTotensArtes(prev => ({
        ...prev,
        [selectedAnuncio.id]: { file, previewUrl: url }
      }));
    }
  };

  const handleMonitorClick = () => {
    if (selectedAnuncio) {
      fileInputRef.current?.click();
    }
  };

  const handleConcluir = () => {
    // Salvar todas as artes no contexto
    updateFormData({
      totensArtes: totensArtes,
      isArtSelected: Object.keys(totensArtes).length > 0
    });
    onClose();
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedAnuncio) {
      setTotensArtes(prev => {
        const newTotensArtes = { ...prev };
        delete newTotensArtes[selectedAnuncio.id];
        return newTotensArtes;
      });
    }
  };

  // Obter arte do totem selecionado
  const currentTotemArt = selectedAnuncio ? totensArtes[selectedAnuncio.id] : null;

  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-hidden">
      <div className="w-full h-full flex flex-col">

        {/* Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Side - Lista de totens */}
          <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col overflow-hidden">
            <div className="flex-shrink-0 p-4 lg:p-6 pb-3">
              <h2 className="text-lg sm:text-xl font-bold">Totens</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-4 lg:px-6 pb-4 lg:pb-6">
              <div className="space-y-2">
              {/* Seções Digitais e Impressos como accordion */}
              {['digital', 'impresso'].map((tipo) => {
                const itensTipo = tipo === 'digital' ? produtosDigitais : produtosImpressos;
                if (itensTipo.length === 0) return null;
                const isOpen = openGroups[tipo];
                const pontosLabel = itensTipo.length === 1 ? 'Ponto' : 'Pontos';
                
                return (
                  <div
                    key={tipo}
                    className="mb-2 rounded-lg border bg-gray-50 transition-all duration-300"
                    style={{ overflow: 'hidden' }}
                  >
                    <div
                      className="flex items-center justify-between px-4 py-3 bg-white cursor-pointer select-none transition-colors duration-200 rounded-t-lg"
                      onClick={() => setOpenGroups((prev) => ({ ...prev, [tipo]: !prev[tipo] }))}
                    >
                      <span className="font-semibold text-sm capitalize text-gray-800 tracking-tight flex items-center gap-2">
                        {tipo === 'digital' ? <Monitor className="w-4 h-4" /> : <Printer className="w-4 h-4" />}
                        {tipo === 'digital' ? 'Digital' : 'Impresso'} ({itensTipo.length} {pontosLabel})
                      </span>
                      <button
                        className="rounded-full p-1 hover:bg-gray-100 transition"
                        tabIndex={-1}
                        onClick={e => { e.stopPropagation(); setOpenGroups((prev) => ({ ...prev, [tipo]: !prev[tipo] })); }}
                      >
                        <svg className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    <div
                      className={`transition-all duration-300 ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
                      style={{ overflow: 'hidden' }}
                    >
                      {isOpen && (
                        <div className="p-3 space-y-2 bg-gray-50">
                          {itensTipo.map((produto) => {
                            const hasArt = totensArtes[produto.id] !== undefined;
                            return (
                              <div
                                key={produto.id}
                                className={`p-3 bg-white border-2 rounded-lg cursor-pointer transition-all ${
                                  selectedAnuncio?.id === produto.id
                                    ? "border-orange-500 bg-orange-50 shadow-sm"
                                    : hasArt
                                    ? "border-green-500 bg-green-50"
                                    : "border-gray-200 hover:bg-gray-50"
                                }`}
                                onClick={() => setSelectedAnuncio(produto)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-gray-900 truncate mb-1">
                                      {produto.nome}
                                    </div>
                                    <div className="text-xs text-gray-500 line-clamp-2">
                                      {produto.endereco}
                                    </div>
                                  </div>
                                  <span className={`${tipo === 'digital' ? 'bg-purple-600' : 'bg-green-600'} text-white text-xs px-2 py-0.5 rounded whitespace-nowrap`}>
                                    {tipo}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </div>

          {/* Right Side - Preview */}
          <div className="flex-1 flex flex-col bg-gray-50">
            {/* Header do preview */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center justify-between mb-2 gap-2">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-700 truncate">
                  Personalize seu anúncio
                </h3>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {produtos.length} totens
                </span>
              </div>
              
              {selectedAnuncio && (
                <div className="flex items-center gap-2">
                  <span className="text-xs px-3 py-1 rounded bg-orange-100 text-orange-600 font-medium inline-flex items-center gap-1">
                    {selectedAnuncio.type_screen === 'digital' ? (
                      <>
                        <Monitor className="w-3 h-3" />
                        Digital
                      </>
                    ) : (
                      <>
                        <Printer className="w-3 h-3" />
                        Impresso
                      </>
                    )}
                  </span>
                  <span className="text-xs text-gray-500">
                    {selectedAnuncio.nome}
                  </span>
                </div>
              )}
            </div>

            {/* Scrollable Container for Preview */}
            <div className="flex-1">
              {/* Preview Area */}
              <div className="min-h-full flex flex-col items-center justify-center p-2 sm:p-4 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="relative w-full max-w-3xl">
                {/* Professional Monitor Design */}
                <div className={`relative mx-auto ${selectedAnuncio?.screen_type === 'down' ? 'w-[280px] h-[175px] sm:w-[350px] sm:h-[210px] lg:w-[550px] lg:h-[330px]' : 'w-[220px] h-[285px] sm:w-[285px] sm:h-[355px] lg:w-[350px] lg:h-[440px]'}`} style={{ maxWidth: '100%' }}>
                  {/* Determine which monitor to render based on screen_type */}
                  {selectedAnuncio?.screen_type === 'down' ? (
                    // Monitor deitado (Landscape) - sem base
                    <svg
                      viewBox="0 0 800 470"
                      className="w-full h-auto"
                      style={{ filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.4))' }}
                    >
                      {/* Shadow Layer */}
                      <ellipse cx="400" cy="460" rx="280" ry="15" fill="rgba(0,0,0,0.3)" />
                      
                      {/* Monitor Frame - Landscape */}
                      <g transform="translate(50, 20)">
                        {/* Outer bezel */}
                        <rect x="0" y="0" width="700" height="410" rx="25" fill="#2d2d2d" />
                        <rect x="0" y="0" width="700" height="410" rx="25" fill="url(#gloss-gradient-landscape)" />
                        
                        {/* Inner bezel - borda mais fina */}
                        <rect x="20" y="20" width="660" height="370" rx="18" fill="#1a1a1a" />
                        
                        {/* Screen area - tela maior em altura */}
                        <rect x="50" y="50" width="600" height="310" rx="8" fill="#000000" />
                      </g>
                      
                      <defs>
                        <linearGradient id="gloss-gradient-landscape" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" style={{ stopColor: 'rgba(255,255,255,0.2)', stopOpacity: 0.2 }} />
                          <stop offset="50%" style={{ stopColor: 'rgba(255,255,255,0)', stopOpacity: 0 }} />
                          <stop offset="100%" style={{ stopColor: 'rgba(255,255,255,0.2)', stopOpacity: 0.2 }} />
                        </linearGradient>
                      </defs>
                    </svg>
                  ) : (
                    // Monitor em pé (Portrait - standing)
                    <svg
                      viewBox="0 0 600 650"
                      className="w-full h-auto"
                      style={{ filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.4))' }}
                    >
                      {/* Shadow Layer */}
                      <ellipse cx="300" cy="630" rx="200" ry="20" fill="rgba(0,0,0,0.3)" />
                      
                      {/* Monitor Frame - Sleek modern design */}
                      <g transform="translate(80, 40)">
                        {/* Outer bezel - glossy finish */}
                        <rect x="0" y="0" width="440" height="600" rx="25" fill="#2d2d2d" />
                        <rect x="0" y="0" width="440" height="600" rx="25" fill="url(#gloss-gradient)" />
                        
                        {/* Inner bezel - thin border */}
                        <rect x="15" y="15" width="410" height="570" rx="20" fill="#1a1a1a" />
                        
                        {/* Screen area - where the image will appear */}
                        <rect x="40" y="50" width="360" height="500" rx="12" fill="#000000" />
                      </g>
                      
                      {/* Gradient for glossy effect */}
                      <defs>
                        <linearGradient id="gloss-gradient" x1="0%" y1="0%" x2="0%" y2="30%">
                          <stop offset="0%" style={{ stopColor: 'rgba(255,255,255,0.3)', stopOpacity: 0.3 }} />
                          <stop offset="100%" style={{ stopColor: 'rgba(255,255,255,0)', stopOpacity: 0 }} />
                        </linearGradient>
                      </defs>
                    </svg>
                  )}
                  
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/mov"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  {/* Screen Content - positioned inside monitor */}
                  <div 
                    className={`absolute transition-all ${selectedAnuncio ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed'}`}
                    onClick={handleMonitorClick}
                    style={selectedAnuncio?.screen_type === 'down' ? {
                      // Para monitor deitado (landscape) - subir um pouquinho
                      left: '12.5%',
                      top: '13.5%',
                      width: '75%',
                      height: '67%',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: currentTotemArt ? 'transparent' : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                    } : {
                      // Para monitor em pé (portrait) - ajustado para não sair do monitor
                      left: '22%',
                      top: '15%',
                      width: '56%',
                      height: '74%',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: currentTotemArt ? 'transparent' : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                    }}
                  >
                    {currentTotemArt ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <img
                          src={currentTotemArt.previewUrl}
                          alt="Preview"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                            pointerEvents: 'none'
                          }}
                        />
                        {/* Remove button */}
                        <button
                          onClick={handleRemoveFile}
                          className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center text-xs sm:text-base transition-colors shadow-lg z-10"
                          title="Remover arquivo"
                        >
                          ✕
                        </button>
                        
                        {/* Branding overlay */}
                        <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-black/90 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md flex items-center gap-1 sm:gap-1.5 shadow-lg pointer-events-none">
                          <Monitor className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
                          <span className="text-[9px] sm:text-[11px] text-white font-bold">ALL SEE</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-white p-4 sm:p-6 lg:p-8 text-center">
                        <div className="bg-white/15 backdrop-blur-sm rounded-full w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-3 sm:mb-4 lg:mb-6 shadow-xl">
                          <Monitor className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 opacity-70" />
                        </div>
                        {selectedAnuncio ? (
                          <>
                            <p className="text-[10px] sm:text-xs lg:text-sm font-semibold opacity-95 mb-1 sm:mb-2 px-2">
                              Selecione um arquivo para visualizar
                            </p>
                            <p className="text-[9px] sm:text-[10px] lg:text-xs opacity-70 font-medium px-2">
                              Proporção: {selectedAnuncio.screen_type === 'down' ? '1920x1080 px' : '1080x1920 px'}
                            </p>
                          </>
                        ) : (
                          <p className="text-[10px] sm:text-xs lg:text-sm font-semibold opacity-95 px-2">
                            Selecione o totem e escolha uma arte
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  </div>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 bg-white">
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-colors text-sm sm:text-base"
          >
            Cancelar
          </button>
          <button
            onClick={handleConcluir}
            disabled={Object.keys(totensArtes).length === 0}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-2 rounded-lg font-semibold transition-colors text-sm sm:text-base"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}

