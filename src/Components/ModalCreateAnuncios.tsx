"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { X } from "lucide-react";
import { toast } from "sonner";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  const [exibicoes, setExibicoes] = useState("");
  const [visualizacoes, setVisualizacoes] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [typeScreen, setTypeScreen] = useState<string>("Digital"); // Estado para tipo de mídia

  useEffect(() => {
    if (anuncio) {
      setName(anuncio.name || "");
      setImageUrl(anuncio.image || "");
      setAddress(anuncio.address || "");
      setScreens(anuncio.screens ? String(anuncio.screens) : "");
      setExibicoes(anuncio.display ? String(anuncio.display) : "");
      setVisualizacoes(anuncio.views ? String(anuncio.views) : "");
      setPrice(anuncio.price ? String(anuncio.price) : "");
      setTypeScreen(anuncio.type_screen === 'impresso' ? 'Impresso' : 'Digital');
      const dur: string[] = [];
      if (anuncio.duration_2) dur.push("2");
      if (anuncio.duration_4) dur.push("4");
      if (anuncio.duration_12) dur.push("12");
      if (anuncio.duration_24) dur.push("24");
      setDuration(dur);
    } else {
      setName("");
      setImage(null);
      setImageUrl("");
      setAddress("");
      setScreens("");
      setExibicoes("");
      setVisualizacoes("");
      setPrice("");
      setDuration([]);
      setTypeScreen("Digital");
    }
  }, [anuncio, open]);

  // Efeito para atualizar exibições quando o tipo de mídia muda
  useEffect(() => {
    if (typeScreen === 'Impresso') {
      setExibicoes('fixo');
    } else if (!anuncio) {
      // Se não for edição, limpa o campo para digital
      setExibicoes('');
    }
  }, [typeScreen, anuncio]);

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
    setLoading(true);
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
        const { error: updateError } = await supabase
          .from("anuncios")
          .update({
            name,
            image: imgUrl,
            address,
            screens: Number(screens),
            display: typeScreen === 'Impresso' ? 'fixo' : Number(exibicoes),
            views: Number(visualizacoes),
            price: Number(price),
            duration_2: duration.includes("2"),
            duration_4: duration.includes("4"),
            duration_12: duration.includes("12"),
            duration_24: duration.includes("24"),
            type_screen: typeScreen.toLowerCase(),
          })
          .eq("id", anuncio.id);
        if (updateError) throw updateError;
        toast.success("Totem atualizado com sucesso!");
      } else {
        // INSERT
        const { error: insertError } = await supabase.from("anuncios").insert([
          {
            name,
            image: imgUrl,
            address,
            screens: Number(screens),
            display: typeScreen === 'Impresso' ? 'fixo' : Number(exibicoes),
            views: Number(visualizacoes),
            price: Number(price),
            duration_2: duration.includes("2"),
            duration_4: duration.includes("4"),
            duration_12: duration.includes("12"),
            duration_24: duration.includes("24"),
            type_screen: typeScreen.toLowerCase(),
          },
        ]);
        if (insertError) throw insertError;
        toast.success("Totem cadastrado com sucesso!");
      }
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar Totem.");
    } finally {
      setLoading(false);
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
              type={typeScreen === 'Impresso' ? 'text' : 'number'}
              placeholder="Exibições"
              className={`border rounded-lg px-2 sm:px-3 py-2 w-1/2 text-sm sm:text-base ${typeScreen === 'Impresso' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              value={exibicoes}
              onChange={(e) => setExibicoes(e.target.value)}
              required
              min={0}
              disabled={typeScreen === 'Impresso'}
            />
            <input
              type="number"
              placeholder="Visualizações"
              className="border rounded-lg px-2 sm:px-3 py-2 w-1/2 text-sm sm:text-base"
              value={visualizacoes}
              onChange={(e) => setVisualizacoes(e.target.value)}
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
              className={`flex-1 py-2 rounded-lg border font-semibold transition-colors duration-200 cursor-pointer text-sm sm:text-base ${typeScreen === 'Digital' ? 'border-orange-500 text-orange-500 bg-white' : 'border-gray-300 text-gray-700 bg-white'}`}
              onClick={() => setTypeScreen('Digital')}
              aria-pressed={typeScreen === 'Digital'}
            >
              Digital
            </button>
            <button
              type="button"
              className={`flex-1 py-2 rounded-lg border font-semibold transition-colors duration-200 cursor-pointer text-sm sm:text-base ${typeScreen === 'Impresso' ? 'border-orange-500 text-orange-500 bg-white' : 'border-gray-300 text-gray-700 bg-white'}`}
              onClick={() => setTypeScreen('Impresso')}
              aria-pressed={typeScreen === 'Impresso'}
            >
              Impresso
            </button>
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
            disabled={loading}
          >
            {loading ? "Salvando..." : anuncio ? "Atualizar" : "Cadastrar"}
          </button>
          {error && <div className="text-red-500 text-xs sm:text-sm">{error}</div>}
        </form>
      </div>
    </div>
  );
}
