"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "./ui/select";
import { useCart } from "@/context/CartContext";

const PagamantosPart = () => {
  const { produtos } = useCart();
  // Calcular subtotal e total dinamicamente
  const subtotal = produtos.reduce(
    (acc, item) =>
      acc + (typeof item.preco === "number" ? item.preco * item.quantidade : 0),
    0
  );
  const total = subtotal;
  const [openAccordion, setOpenAccordion] = useState<
    "fisica" | "juridica" | null
  >(null);

  // Estados dos campos do formulário Pessoa Física
  const [cpf, setCpf] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [complemento, setComplemento] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  // Estados dos campos do formulário Pessoa Jurídica
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [segmento, setSegmento] = useState("");
  const [cepJ, setCepJ] = useState("");
  const [enderecoJ, setEnderecoJ] = useState("");
  const [numeroJ, setNumeroJ] = useState("");
  const [bairroJ, setBairroJ] = useState("");
  const [complementoJ, setComplementoJ] = useState("");
  const [cidadeJ, setCidadeJ] = useState("");
  const [estadoJ, setEstadoJ] = useState("");

  // Verifica se TODOS os campos de pessoa física foram preenchidos
  const todosFisica =
    cpf &&
    cep &&
    endereco &&
    numero &&
    bairro &&
    complemento &&
    cidade &&
    estado;
  // Verifica se TODOS os campos de pessoa jurídica foram preenchidos
  const todosJuridica =
    cnpj &&
    razaoSocial &&
    segmento &&
    cepJ &&
    enderecoJ &&
    numeroJ &&
    bairroJ &&
    complementoJ &&
    cidadeJ &&
    estadoJ;
  const podeConcluir = todosFisica || todosJuridica;

  return (
    <div className="flex flex-col items-center w-full min-h-screen py-8 bg-[#fcfcfc] px-2 md:px-0">
      <div className="max-w-2xl w-full mx-auto flex flex-col gap-10">
        {/* Título e subtítulo */}
        <div className="text-center flex items-center justify-center flex-col gap-2 px-2 md:px-0">
          <h1 className="text-3xl font-bold">Pagamento</h1>
          <p className="text-gray-600 text-base w-64 lg:w-full">
            Você está a um passo de reservar seu lugar nas telas da Eletromidia!
            <br />
            Confirme os valores e selecione a forma de pagamento
          </p>
        </div>

        {/* Resumo de valores */}
        <div className="bg-white rounded-xl shadow border border-gray-100 p-4 md:p-8 flex flex-col gap-6">
          <h2 className="text-xl font-bold mb-2">Resumo de valores</h2>
          <div className="border-b border-gray-200 mb-4"></div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-base">
              <span>Subtotal</span>
              <span className="font-medium">
                R${" "}
                {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
              R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Dados do faturamento */}
        <div className="bg-white rounded-xl shadow border border-gray-100 p-4 md:p-8 flex flex-col gap-4">
          <h2 className="text-xl font-bold mb-1">Dados do faturamento</h2>
          <p className="text-gray-500 text-sm mb-4">
            Essas informações serão usada para fins de faturamento. Escolha a
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
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                  />
                </div>
                <hr />
                <div className="grid grid-cols-1 gap-4">
                  <input
                    type="text"
                    placeholder="CEP"
                    className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Endereço"
                    className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Número"
                    className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Bairro"
                    className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Complemento"
                    className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Cidade"
                    className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Estado"
                    className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
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
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Razao Social"
                    className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select value={segmento} onValueChange={setSegmento}>
                    <SelectTrigger className="px-4 py-6">
                      <SelectValue placeholder="Setor/Segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comercio">Comércio</SelectItem>
                      <SelectItem value="servicos">Serviços</SelectItem>
                      <SelectItem value="industria">Indústria</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                  <input
                    type="number"
                    placeholder="Telefone"
                    className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={numeroJ}
                    onChange={(e) => setNumeroJ(e.target.value)}
                  />
                </div>
                <hr />
                <div className="grid grid-cols-1 gap-4">
                  <input
                    type="text"
                    placeholder="CEP"
                    className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={cepJ}
                    onChange={(e) => setCepJ(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Endereço"
                    className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={enderecoJ}
                    onChange={(e) => setEnderecoJ(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Número"
                    className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={numeroJ}
                    onChange={(e) => setNumeroJ(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Bairro"
                    className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={bairroJ}
                    onChange={(e) => setBairroJ(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Complemento"
                    className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={complementoJ}
                    onChange={(e) => setComplementoJ(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Cidade"
                    className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={cidadeJ}
                    onChange={(e) => setCidadeJ(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Estado"
                    className="border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                  />
                </div>
                <p className="text-center text-xs text-gray-500">
                  A NOTA FISCAL SERÁ ENCAMINHADA VIA WHATSAPP E E-MAIL
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Botão concluir */}
        <div className="flex justify-end px-2 md:px-0">
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-2 rounded-md"
            type="button"
            disabled={!podeConcluir}
          >
            concluir
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PagamantosPart;
