"use client";
import { useCart } from "@/context/CartContext";
import { ArrowLeft, CalendarIcon, ChevronDownIcon } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/Components/ui/select";
import { Calendar } from "@/Components/ui/calendar";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/Components/ui/popover";
import { Button } from "./ui/button";

export default function CartResume() {
  const { produtos, removerProduto } = useCart();
  const [duracao, setDuracao] = useState("12 semanas");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());

  // Debug: verificar se os produtos estão sendo carregados
  console.log("Produtos no carrinho:", produtos);

  return (
    <div className="w-full h-full px-4 md:px-12 py-6 flex flex-col gap-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Plano de Mídia</h2>
        <button 
          onClick={() => {
            localStorage.removeItem('cart');
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
                      <p className="text-sm text-gray-600 break-words">{item.endereco}</p>
                    ) : (
                      <p className="text-sm text-red-500">Endereço não disponível</p>
                    )}
                    <div className="font-semibold text-green-700">
                      R${" "}
                      {typeof item.preco === "number"
                        ? item.preco.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })
                        : "0,00"}{" "}
                      x {item.quantidade}
                    </div>
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
            {/* Configuração do plano */}
            <div>
              <h2 className="text-lg font-bold mb-2">Configuração do plano</h2>
              <div className="flex gap-4 mb-2 items-end">
                <div className="flex flex-col gap-1">
                  <span className="block text-xs text-gray-500">duração</span>
                  <Select defaultValue="12 semanas">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4 semanas">2 semanas</SelectItem>
                      <SelectItem value="8 semanas">4 semanas</SelectItem>
                      <SelectItem value="12 semanas">24 semanas</SelectItem>
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
            </div>

            {/* Performance projetada */}
            <div>
              <h2 className="text-lg font-bold mb-2">Performance projetada</h2>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="block text-xs text-gray-500">exibições</span>
                  <span className="font-semibold">99,6 mil</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">alcance</span>
                  <span className="font-semibold">218,9 mil</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">impacto</span>
                  <span className="font-semibold">436,2 mil</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">frequência</span>
                  <span className="font-semibold">1.99</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">telas</span>
                  <span className="font-semibold">9</span>
                </div>
              </div>
            </div>

            {/* Valor */}
            <div>
              <h2 className="text-lg font-bold mb-2">Valor</h2>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">
                  R${" "}
                  {produtos
                    .reduce(
                      (acc, item) =>
                        acc +
                        (typeof item.preco === "number"
                          ? item.preco * item.quantidade
                          : 0),
                      0
                    )
                    .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <a href="#" className="text-xs text-blue-600 underline mb-2 block">
                Possui um cupom de desconto?
              </a>
              <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                <span>Total</span>
                <span>
                  R${" "}
                  {produtos
                    .reduce(
                      (acc, item) =>
                        acc +
                        (typeof item.preco === "number"
                          ? item.preco * item.quantidade
                          : 0),
                      0
                    )
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
