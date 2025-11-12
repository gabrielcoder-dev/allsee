"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { X, Monitor, Printer } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

type OrientationKey = "portrait" | "landscape";

type OrientationArt = {
  file: File;
  previewUrl: string;
};

const ORIENTATION_LABEL: Record<OrientationKey, string> = {
  portrait: "Em pé",
  landscape: "Deitado",
};

const ORIENTATION_KEYS: OrientationKey[] = ["portrait", "landscape"];

const orientationFromProduto = (produto: any): OrientationKey =>
  produto?.screen_type === "down" ? "landscape" : "portrait";

const orientationHasProducts = (produtos: any[], orientation: OrientationKey) =>
  produtos.some((produto) => orientationFromProduto(produto) === orientation);

export default function ModalSelecionarArte({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { produtos, updateFormData } = useCart();
  const [orientationArts, setOrientationArts] = useState<Partial<Record<OrientationKey, OrientationArt>>>({});
  const [selectedOrientation, setSelectedOrientation] = useState<OrientationKey | null>(null);
  const [orientationsSemArte, setOrientationsSemArte] = useState<OrientationKey[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingOrientationRef = useRef<OrientationKey | null>(null);

  useEffect(() => {
    if (!selectedOrientation) {
      if (orientationHasProducts(produtos, "portrait")) {
        setSelectedOrientation("portrait");
      } else if (orientationHasProducts(produtos, "landscape")) {
        setSelectedOrientation("landscape");
      }
    }
  }, [produtos, selectedOrientation]);

  useEffect(() => {
    if (!open) {
      setOrientationArts({});
      setOrientationsSemArte([]);
      setSelectedOrientation(null);
    }
  }, [open]);

  const groupedByTypeAndOrientation = useMemo(() => {
    const base = {
      digital: { portrait: [] as any[], landscape: [] as any[] },
      impresso: { portrait: [] as any[], landscape: [] as any[] },
    };

    produtos.forEach((produto) => {
      const tipo = produto?.type_screen?.toLowerCase() === "impresso" ? "impresso" : "digital";
      const orientation = orientationFromProduto(produto);
      base[tipo][orientation].push(produto);
    });

    return base;
  }, [produtos]);

  if (!open) return null;

  const handleMonitorClick = (orientation: OrientationKey) => {
    if (!orientationHasProducts(produtos, orientation)) return;
    setSelectedOrientation(orientation);
    pendingOrientationRef.current = orientation;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const orientation = pendingOrientationRef.current;
    pendingOrientationRef.current = null;

    if (!orientation) return;

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);

      setOrientationArts((prev) => ({
        ...prev,
        [orientation]: { file, previewUrl },
      }));

      setOrientationsSemArte((prev) => prev.filter((item) => item !== orientation));
    }
  };

  const handleRemoveFile = (orientation: OrientationKey) => {
    setOrientationArts((prev) => {
      const clone = { ...prev };
      delete clone[orientation];
      return clone;
    });

    setOrientationsSemArte((prev) =>
      prev.includes(orientation) ? prev : [...prev, orientation]
    );
  };

  const handleConcluir = async () => {
    const orientationsToCheck = ORIENTATION_KEYS.filter((orientation) =>
      orientationHasProducts(produtos, orientation)
    );

    const missingOrientations = orientationsToCheck.filter(
      (orientation) => !orientationArts[orientation]
    );

    if (missingOrientations.length > 0) {
      setOrientationsSemArte(missingOrientations);
      const resumoFaltantes = missingOrientations
        .map((orientation) => ORIENTATION_LABEL[orientation])
        .join(" e ");
      toast.error(`Adicione uma arte para os totens ${resumoFaltantes}.`, {
        duration: 5000,
      });
      return;
    }

    try {
      setIsSaving(true);

      const totensArtesPorTotem: Record<string, OrientationArt> = {};
      produtos.forEach((produto) => {
        const orientation = orientationFromProduto(produto);
        const arte = orientationArts[orientation];
        if (arte) {
          totensArtesPorTotem[produto.id] = arte;
        }
      });

      updateFormData({
        totensArtes: totensArtesPorTotem,
        isArtSelected: true,
      });

      toast.success("Artes selecionadas! Elas serão enviadas após a conclusão da compra.");
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar artes selecionadas:", error);
      toast.error(`Erro ao salvar artes: ${error?.message || "Erro desconhecido"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const renderMonitorFrame = (orientation: OrientationKey) => {
    if (orientation === "landscape") {
      return (
        <svg
          viewBox="0 0 800 470"
          className="w-full h-auto"
          style={{ filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.4))" }}
        >
          <ellipse cx="400" cy="460" rx="280" ry="15" fill="rgba(0,0,0,0.3)" />
          <g transform="translate(50, 20)">
            <rect x="0" y="0" width="700" height="410" rx="25" fill="#2d2d2d" />
            <rect x="0" y="0" width="700" height="410" rx="25" fill="url(#gloss-gradient-landscape)" />
            <rect x="20" y="20" width="660" height="370" rx="18" fill="#1a1a1a" />
            <rect x="50" y="50" width="600" height="310" rx="8" fill="#000000" />
          </g>
          <defs>
            <linearGradient id="gloss-gradient-landscape" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.2)" stopOpacity="0.2" />
              <stop offset="50%" stopColor="rgba(255,255,255,0)" stopOpacity="0" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.2)" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      );
    }

    return (
      <svg
        viewBox="0 0 600 650"
        className="w-full h-auto"
        style={{ filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.4))" }}
      >
        <ellipse cx="300" cy="630" rx="200" ry="20" fill="rgba(0,0,0,0.3)" />
        <g transform="translate(80, 40)">
          <rect x="0" y="0" width="440" height="600" rx="25" fill="#2d2d2d" />
          <rect x="0" y="0" width="440" height="600" rx="25" fill="url(#gloss-gradient)" />
          <rect x="15" y="15" width="410" height="570" rx="20" fill="#1a1a1a" />
          <rect x="40" y="50" width="360" height="500" rx="12" fill="#000000" />
        </g>
        <defs>
          <linearGradient id="gloss-gradient" x1="0%" y1="0%" x2="0%" y2="30%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  const renderScreenStyle = (orientation: OrientationKey) =>
    orientation === "portrait"
      ? {
          top: "10%",
          bottom: "10%",
          left: "22%",
          right: "22%",
          borderRadius: "16px",
        }
      : {
          top: "18%",
          bottom: "20%",
          left: "8%",
          right: "8%",
          borderRadius: "16px",
        };

  const renderOrientationPreview = (orientation: OrientationKey) => {
    const hasTotems = orientationHasProducts(produtos, orientation);
    if (!hasTotems) return null;

    const art = orientationArts[orientation];
    const isSelected = selectedOrientation === orientation;
    const needsArt = orientationsSemArte.includes(orientation);

    return (
      <div
        key={orientation}
        className={`relative flex flex-col gap-4 bg-white border rounded-2xl p-4 shadow-sm transition-all ${
          isSelected ? "border-orange-500" : "border-transparent"
        } ${needsArt ? "ring-2 ring-red-400" : ""}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-600">
              <Monitor className={`w-4 h-4 ${orientation === "landscape" ? "-rotate-90" : ""}`} />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-700">{ORIENTATION_LABEL[orientation]}</span>
              <span className="text-xs text-gray-500">
                {groupedByTypeAndOrientation.digital[orientation].length +
                  groupedByTypeAndOrientation.impresso[orientation].length} totem(s)
              </span>
            </div>
          </div>
          <button
            className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
              isSelected ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"
            }`}
            onClick={() => setSelectedOrientation(orientation)}
          >
            {isSelected ? "Selecionado" : "Selecionar"}
          </button>
        </div>

        <div className="relative flex flex-col items-center">
          <div
            className={`w-full ${orientation === "portrait" ? "max-w-[280px]" : "max-w-[540px]"}`}
            onClick={() => handleMonitorClick(orientation)}
          >
            {renderMonitorFrame(orientation)}
            <div
              className={`absolute transition-all ${
                art ? "cursor-pointer" : "cursor-pointer hover:opacity-90"
              }`}
              style={{
                ...renderScreenStyle(orientation),
                overflow: "hidden",
                background: art ? "#000" : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {art ? (
                <div className="relative w-full h-full bg-black">
                  <img
                    src={art.previewUrl}
                    alt={`Arte ${ORIENTATION_LABEL[orientation]}`}
                    className="w-full h-full object-cover block pointer-events-none"
                    style={{ objectFit: "contain", backgroundColor: "#000" }}
                  />
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRemoveFile(orientation);
                    }}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-base transition-colors shadow-lg"
                    title="Remover arquivo"
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-2 right-2 bg-black/80 px-3 py-1 rounded-md flex items-center gap-1 pointer-events-none">
                    <Monitor className="w-4 h-4 text-orange-500" />
                    <span className="text-[11px] text-white font-semibold">ALL SEE</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
                  <div className="bg-white/15 backdrop-blur-sm rounded-full w-16 h-16 flex items-center justify-center mb-4 shadow-xl">
                    <Monitor className={`w-8 h-8 opacity-70 ${orientation === "landscape" ? "-rotate-90" : ""}`} />
                  </div>
                  <p className="text-sm font-semibold opacity-95 mb-1">
                    Clique para selecionar a arte {ORIENTATION_LABEL[orientation]}
                  </p>
                  <p className="text-xs opacity-70 font-medium">
                    Proporção recomendada: {orientation === "landscape" ? "1920x1080 px" : "1080x1920 px"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOrientationGroup = (tipo: "digital" | "impresso", orientation: OrientationKey) => {
    const itens = groupedByTypeAndOrientation[tipo][orientation];
    if (itens.length === 0) return null;

    const hasArt = Boolean(orientationArts[orientation]);
    const needsArt = orientationsSemArte.includes(orientation);
    const isSelected = selectedOrientation === orientation;

    return (
      <div
        key={`${tipo}-${orientation}`}
        className={`p-3 border-2 rounded-lg transition-all cursor-pointer ${
          needsArt
            ? "border-red-500 bg-red-50 animate-pulse"
            : isSelected
            ? "border-orange-500 bg-orange-50"
            : hasArt
            ? "border-green-500 bg-green-50"
            : "border-gray-200 bg-white hover:bg-gray-50"
        }`}
        onClick={() => setSelectedOrientation(orientation)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-600">
              <Monitor className={`w-4 h-4 ${orientation === "landscape" ? "-rotate-90" : ""}`} />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {ORIENTATION_LABEL[orientation]} ({itens.length} totem{itens.length > 1 ? "s" : ""})
              </p>
              <p className="text-xs text-gray-500 capitalize">{tipo}</p>
            </div>
          </div>
          {hasArt && !needsArt && (
            <span className="text-xs font-semibold text-green-600">Arte adicionada</span>
          )}
        </div>
        <div className="space-y-1">
          {itens.map((produto) => (
            <div key={produto.id} className="text-xs text-gray-600">
              <span className="font-medium text-gray-700">{produto.nome}</span>
              <span className="block text-[11px] text-gray-500">{produto.endereco}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-hidden">
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Selecionar artes para os totens</h2>
            <p className="text-sm text-gray-500">Faça upload de uma arte para totens em pé e outra para totens deitados.</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-200 overflow-y-auto p-4 lg:p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Totens</h3>
            <div className="space-y-3">
              {(["digital", "impresso"] as ("digital" | "impresso")[]).map((tipo) => {
                const totalTipo = groupedByTypeAndOrientation[tipo].portrait.length + groupedByTypeAndOrientation[tipo].landscape.length;
                if (totalTipo === 0) return null;

                const pontosLabel = totalTipo === 1 ? "Ponto" : "Pontos";

                return (
                  <div key={tipo} className="rounded-xl border bg-white shadow-sm">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        {tipo === "digital" ? (
                          <Monitor className="w-4 h-4 text-orange-500" />
                        ) : (
                          <Printer className="w-4 h-4 text-orange-500" />
                        )}
                        <span className="text-sm font-semibold text-gray-800 capitalize">
                          {tipo} ({totalTipo} {pontosLabel})
                        </span>
                      </div>
                    </div>
                    <div className="p-3 space-y-3 bg-gray-50">
                      {renderOrientationGroup(tipo, "portrait")}
                      {renderOrientationGroup(tipo, "landscape")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-gray-50">
            <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Personalize seu anúncio</h3>
                <span className="text-xs text-gray-500">{produtos.length} totens</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <div className="grid gap-6 lg:grid-cols-2">
                {ORIENTATION_KEYS.map((orientation) =>
                  renderOrientationPreview(orientation)
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 bg-white">
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-colors text-sm sm:text-base"
          >
            Cancelar
          </button>
          <button
            onClick={handleConcluir}
            disabled={isSaving}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="animate-spin">⏳</span>
                Salvando...
              </>
            ) : (
              "Concluir"
            )}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/mov"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}