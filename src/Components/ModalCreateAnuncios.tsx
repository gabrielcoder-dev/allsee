"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { X } from "lucide-react";
import { toast } from "sonner";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type NichoOption = 'restaurante' | 'academia' | 'mercado' | 'padaria' | 'banco' | 'outro'

export default function ModalCreateAnuncios({
  open,
  onClose,
  anuncio,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  anuncio?: any;
  onSaved?: () => void;
}) {
  const [name, setName] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [address, setAddress] = useState("");
  const [screens, setScreens] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState<string[]>([]);
  const [display, setDisplay] = useState("");
  const [views, setViews] = useState("");
  const [duration_2, setDuration_2] = useState(false);
  const [duration_4, setDuration_4] = useState(false);
  const [duration_12, setDuration_12] = useState(false);
  const [duration_24, setDuration_24] = useState(false);
  const [type_screen, setType_screen] = useState<'digital' | 'impresso'>('digital');
  const [selectedNicho, setSelectedNicho] = useState<NichoOption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const nichoOptions = [
    { value: 'restaurante' as NichoOption, label: 'Restaurante' },
    { value: 'academia' as NichoOption, label: 'Academia' },
    { value: 'mercado' as NichoOption, label: 'Mercado' },
    { value: 'padaria' as NichoOption, label: 'Padaria' },
    { value: 'banco' as NichoOption, label: 'Banco' },
    { value: 'outro' as NichoOption, label: 'Outro' }
  ];

  useEffect(() => {
    if (anuncio) {
      setName(anuncio.name || "");
      setImageUrl(anuncio.image || "");
      setAddress(anuncio.address || "");
      setScreens(anuncio.screens ? String(anuncio.screens) : "");
      setDisplay(anuncio.display ? String(anuncio.display) : "");
      setViews(anuncio.views ? String(anuncio.views) : "");
      setPrice(anuncio.price ? String(anuncio.price) : "");
      setSelectedNicho(anuncio.nicho || null);
      const tipoMidia = anuncio.type_screen === 'impresso' ? 'impresso' : 'digital';
      setType_screen(tipoMidia);
      setDuration_2(anuncio.duration_2 || false);
      setDuration_4(anuncio.duration_4 || false);
      setDuration_12(anuncio.duration_12 || false);
      setDuration_24(anuncio.duration_24 || false);
      
      // Converter as durações para array
      const dur: string[] = [];
      if (anuncio.duration_2) dur.push("2");
      if (anuncio.duration_4) dur.push("4");
      if (anuncio.duration_12) dur.push("12");
      if (anuncio.duration_24) dur.push("24");
      setDuration(dur);
    } else {
      // Reset para novo anúncio
      setName("");
      setImage(null);
      setImageUrl("");
      setAddress("");
      setScreens("");
      setDisplay("");
      setViews("");
      setPrice("");
      setDuration([]);
      setType_screen('digital');
      setSelectedNicho(null);
      setDuration_2(false);
      setDuration_4(false);
      setDuration_12(false);
      setDuration_24(false);
    }
  }, [anuncio]);

  // Efeito para atualizar exibições quando o tipo de mídia muda
  useEffect(() => {
    if (type_screen === 'impresso') {
      setDisplay('fixo');
    } else if (!anuncio) {
      // Se não for edição, limpa o campo para digital
      setDisplay('');
    }
  }, [type_screen, anuncio]);

  if (!open) return null;

  async function handleImageUpload(file: File) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from("anuncios")
      .upload(fileName, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage
      .from("anuncios")
      .getPublicUrl(fileName);
    return urlData.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    let imgUrl = imageUrl;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log("Usuário atual:", user);
    console.log("Erro de usuário:", userError);

    try {
      if (userError || !user) {
        throw new Error("Usuário não autenticado.");
      }

      if (image && !imageUrl) {
        imgUrl = await handleImageUpload(image);
        setImageUrl(imgUrl);
      }

      if (anuncio && anuncio.id) {
        // UPDATE
        const anuncioData = {
          name,
          image: imageUrl,
          address,
          screens: Number(screens),
          display: type_screen === 'impresso' ? 'fixo' : Number(display),
          views: Number(views),
          price: Number(price),
          duration_2: duration.includes("2"),
          duration_4: duration.includes("4"),
          duration_12: duration.includes("12"),
          duration_24: duration.includes("24"),
          type_screen: type_screen,
          nicho: selectedNicho,
        };
        console.log("Dados atuais do anúncio:", anuncio);
        console.log("Dados que serão atualizados:", anuncioData);
        console.log("Atualizando anúncio:", { id: anuncio.id, anuncioData });
        const { data: updateResult, error: updateError } = await supabase
          .from("anuncios")
          .update(anuncioData)
          .eq("id", anuncio.id)
          .select();
        console.log("Resultado da atualização:", { updateResult, updateError });
        if (updateError) throw updateError;
        console.log("Totem atualizado com sucesso:", { id: anuncio.id, type_screen: type_screen.toLowerCase() });
        toast.success("Totem atualizado com sucesso!");
      } else {
        // INSERT
        const anuncioData = {
          name,
          image: imageUrl,
          address,
          screens: Number(screens),
          display: type_screen === 'impresso' ? 'fixo' : Number(display),
          views: Number(views),
          price: Number(price),
          duration_2: duration.includes("2"),
          duration_4: duration.includes("4"),
          duration_12: duration.includes("12"),
          duration_24: duration.includes("24"),
          type_screen: type_screen,
          nicho: selectedNicho,
        };
        const { error: insertError } = await supabase.from("anuncios").insert([
          anuncioData,
        ]);
        if (insertError) throw insertError;
        toast.success("Totem cadastrado com sucesso!");
      }
              console.log("Chamando onSaved...");
        if (onSaved) {
          console.log("Executando onSaved...");
          onSaved();
        }
        onClose();
    } catch (err: any) {
      console.error("Erro ao salvar totem:", err);
      setError(err.message || "Erro ao salvar Totem.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl p-3 sm:p-4 md:p-6 w-full max-w-sm sm:max-w-lg md:max-w-xl lg:max-w-2xl relative overflow-y-auto max-h-[95vh] sm:max-h-[90vh]">
        <button
          className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2 rounded hover:bg-gray-100"
          onClick={onClose}
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 pr-8">{anuncio ? 'Editar Totem' : 'Cadastrar Totem'}</h2>
        <form className="flex flex-col gap-2 sm:gap-3" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nome do Toten"
            className="border rounded-lg px-2 sm:px-3 py-2 text-sm sm:text-base"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="file"
            accept="image/*"
            className="border rounded-lg px-2 sm:px-3 py-2 text-sm sm:text-base"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setImage(e.target.files[0]);
                setImageUrl("");
              }
            }}
            // required somente se não estiver editando
            required={!anuncio}
          />
          <input
            type="text"
            placeholder="Endereço"
            className="border rounded-lg px-2 sm:px-3 py-2 text-sm sm:text-base"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="Quantidade de telas"
            className="border rounded-lg px-2 sm:px-3 py-2 text-sm sm:text-base"
            value={screens}
            onChange={(e) => setScreens(e.target.value)}
            required
            min={1}
          />
          <div className="flex gap-2">
            <input
              type={type_screen === 'impresso' ? 'text' : 'number'}
              placeholder="Exibições"
              className={`border rounded-lg px-2 sm:px-3 py-2 w-1/2 text-sm sm:text-base ${type_screen === 'impresso' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              value={display}
              onChange={(e) => setDisplay(e.target.value)}
              required
              min={0}
              disabled={type_screen === 'impresso'}
            />
            <input
              type="number"
              placeholder="Visualizações"
              className="border rounded-lg px-2 sm:px-3 py-2 w-1/2 text-sm sm:text-base"
              value={views}
              onChange={(e) => setViews(e.target.value)}
              required
              min={0}
            />
          </div>

          <input
            type="number"
            placeholder="Preço (R$)"
            className="border rounded-lg px-2 sm:px-3 py-2 text-sm sm:text-base"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            min={0}
            step="0.01"
          />

          {/* Tipo de mídia */}
          <span className="text-xs font-semibold text-gray-700 pl-1 mt-2">Tipo de mídia</span>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              className={`flex-1 py-2 rounded-lg border font-semibold transition-colors duration-200 cursor-pointer text-sm sm:text-base ${type_screen === 'digital' ? 'border-orange-500 text-orange-500 bg-white' : 'border-gray-300 text-gray-700 bg-white'}`}
              onClick={() => setType_screen('digital')}
              aria-pressed={type_screen === 'digital'}
            >
              Digital
            </button>
            <button
              type="button"
              className={`flex-1 py-2 rounded-lg border font-semibold transition-colors duration-200 cursor-pointer text-sm sm:text-base ${type_screen === 'impresso' ? 'border-orange-500 text-orange-500 bg-white' : 'border-gray-300 text-gray-700 bg-white'}`}
              onClick={() => setType_screen('impresso')}
              aria-pressed={type_screen === 'impresso'}
            >
              Impresso
            </button>
          </div>

          {/* Nicho */}
          <span className="text-xs font-semibold text-gray-700 pl-1 mt-2">Segmento</span>
          <div className="flex flex-col gap-1">
            {nichoOptions.map((option) => (
              <label key={option.value} className="flex items-center text-sm sm:text-base">
                <input
                  type="radio"
                  value={option.value}
                  checked={selectedNicho === option.value}
                  onChange={() => setSelectedNicho(option.value as NichoOption)}
                  className="mr-2"
                />
                {option.label}
              </label>
            ))}
          </div>

          <span className="text-xs font-semibold text-gray-700 pl-1">Duração</span>
          <div className="flex flex-col gap-1">
            {["2", "4", "12", "24"].map((semana) => {
              const isActive = duration.includes(semana);
              return (
                <div key={semana} className="flex items-center justify-between border rounded-lg px-2 sm:px-3 py-1.5 sm:py-1">
                  <span className="text-sm sm:text-base">{semana} Semanas</span>
                  <button
                    type="button"
                    className={`w-7 h-4 sm:w-8 sm:h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                    onClick={() => {
                      setDuration((prev) =>
                        prev.includes(semana)
                          ? prev.filter((d) => d !== semana)
                          : [...prev, semana]
                      );
                    }}
                    aria-pressed={isActive}
                  >
                    <span
                      className={`bg-white w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full shadow-md transform transition-transform duration-200 ${isActive ? 'translate-x-3' : ''}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg py-2 sm:py-3 mt-2 text-sm sm:text-base"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Salvando..." : anuncio ? "Atualizar" : "Cadastrar"}
          </button>
          {error && <div className="text-red-500 text-xs sm:text-sm">{error}</div>}
        </form>
      </div>
    </div>
  );
}
