"use client";

import { useState } from "react";
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
}: {
  open: boolean;
  onClose: () => void;
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
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Usuário não autenticado.");
      }

      if (image && !imageUrl) {
        imgUrl = await handleImageUpload(image);
        setImageUrl(imgUrl);
      }

      const { error: insertError } = await supabase.from("anuncios").insert([
        {
          name,
          image: imgUrl,
          address,
          screens: Number(screens),
          display: Number(exibicoes),
          views: Number(visualizacoes),
          price: Number(price),
          duration_2: duration.includes("2"),
          duration_4: duration.includes("4"),
          duration_24: duration.includes("24"),
        },
      ]);

      if (insertError) throw insertError;

      toast.success("Totten cadastrado com sucesso!");
      setName("");
      setImage(null);
      setImageUrl("");
      setAddress("");
      setScreens("");
      setExibicoes("");
      setVisualizacoes("");
      setPrice("");
      setDuration([]);
    } catch (err: any) {
      setError(err.message || "Erro ao cadastrar Totten.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-2 relative">
        <button
          className="absolute top-3 right-3 p-2 rounded hover:bg-gray-100"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold mb-4">Cadastrar Totten</h2>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nome do Totten"
            className="border rounded-lg px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="file"
            accept="image/*"
            className="border rounded-lg px-3 py-2"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setImage(e.target.files[0]);
                setImageUrl("");
              }
            }}
            required
          />
          <input
            type="text"
            placeholder="Endereço"
            className="border rounded-lg px-3 py-2"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="Quantidade de telas"
            className="border rounded-lg px-3 py-2"
            value={screens}
            onChange={(e) => setScreens(e.target.value)}
            required
            min={1}
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Exibições"
              className="border rounded-lg px-3 py-2 w-1/2"
              value={exibicoes}
              onChange={(e) => setExibicoes(e.target.value)}
              required
              min={0}
            />
            <input
              type="number"
              placeholder="Visualizações"
              className="border rounded-lg px-3 py-2 w-1/2"
              value={visualizacoes}
              onChange={(e) => setVisualizacoes(e.target.value)}
              required
              min={0}
            />
          </div>

          <input
            type="number"
            placeholder="Preço (R$)"
            className="border rounded-lg px-3 py-2"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            min={0}
            step="0.01"
          />
          <span className="text-xs font-semibold text-gray-700 pl-1">Duração</span>
          <div className="flex flex-col gap-1">
            {["2", "4", "24"].map((semana) => {
              const isActive = duration.includes(semana);
              return (
                <div key={semana} className="flex items-center justify-between border rounded-lg px-3 py-1 text-sm">
                  <span>{semana} Semanas</span>
                  <button
                    type="button"
                    className={`w-8 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
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
                      className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform duration-200 ${isActive ? 'translate-x-3' : ''}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg py-2 mt-2"
            disabled={loading}
          >
            {loading ? "Salvando..." : "Cadastrar"}
          </button>
          {error && <div className="text-red-500 text-sm">{error}</div>}
        </form>
      </div>
    </div>
  );
}
