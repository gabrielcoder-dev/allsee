'use client'

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabase";
import { Dialog } from "@headlessui/react";

const page = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const user = useUser();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      setErrorMsg(null);
      if (!user?.id) {
        setOrders([]);
        setLoading(false);
        setErrorMsg('Usuário não autenticado. Faça login para ver seus anúncios.');
        return;
      }
      setLoading(true);
      // Busca apenas as colunas que existem
      const { data, error } = await supabase
        .from("order")
        .select("id, nome_campanha, arte_campanha, id_user, inicio_campanha, duracao_campanha, preco")
        .eq("id_user", user.id)
        .order("id", { ascending: false });
      console.log('User ID:', user.id);
      console.log('Supabase data:', data, 'error:', error);
      if (error) {
        setErrorMsg('Erro ao buscar anúncios: ' + error.message);
        setOrders([]);
      } else if (data) {
        setOrders(data);
      } else {
        setOrders([]);
      }
      setLoading(false);
    }
    fetchOrders();
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  // Fecha o menu dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const menus = document.querySelectorAll('.menu-dropdown');
      let clickedInside = false;
      menus.forEach(menu => {
        if (menu.contains(event.target as Node)) clickedInside = true;
      });
      if (!clickedInside) setOpenMenuId(null);
    }
    if (openMenuId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  // Função utilitária para criar Date local a partir de yyyy-MM-dd
  function parseLocalDateString(dateString: string) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  // Função utilitária para formatar data em dd/MM/yyyy
  function formatDateBR(date: Date | null) {
    if (!date) return null;
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return (
    <div className="bg-white min-h-screen px-8 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Título */}
        <Link
          href="/results"
          className="flex items-center mb-6 gap-2"
        >
          <ArrowLeft width={30} height={30} />
          <h1 className="text-3xl font-bold">Meus anúncios</h1>
        </Link>

        {/* Abas */}
        <div className="flex border-b mb-8">
          <button className="px-4 py-2 border-b-2 border-orange-500 text-orange-600 font-semibold focus:outline-none">
            Todos anúncios ({orders.length.toString().padStart(2, '0')})
          </button>
          <button className="px-4 py-2 text-gray-400 ml-4">Rascunhos</button>
        </div>

        {/* Filtros */}
        <div className="bg-gray-100 rounded-lg p-6 flex flex-wrap gap-4 items-end mb-8">
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Status</label>
            <select className="border rounded px-3 py-2 w-40">
              <option>Todos</option>
              <option>Pendente</option>
              <option>Pago</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Data de publicação</label>
            <input type="date" className="border rounded px-3 py-2 w-44" />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Período</label>
            <select className="border rounded px-3 py-2 w-32">
              <option>dias</option>
              <option>semanas</option>
              <option>meses</option>
            </select>
          </div>
          <button className="bg-orange-500 text-white px-6 py-2 rounded ml-4">
            filtrar
          </button>
        </div>
      </div>

      {/* Cards de anúncios do usuário */}
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Carregando anúncios...</div>
        ) : errorMsg ? (
          <div className="text-center py-10 text-red-500">{errorMsg}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-10 text-gray-500">Nenhum anúncio encontrado.</div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white border rounded-lg shadow p-6 mb-8 flex items-center justify-between gap-6">
              {/* Imagem da campanha */}
              <div className="w-32 h-32 bg-gray-200 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                <img src={order.arte_campanha || "/logo.png"} alt="Anúncio" className="object-cover w-full h-full" />
              </div>
              {/* Info principal */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-semibold truncate">{order.nome_campanha || 'Campanha sem nome'}</span>
                  <button className="ml-1 text-gray-400 hover:text-gray-600" title="Editar nome"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 1 1 2.828 2.828L11.828 15.828a4 4 0 0 1-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 0 1 .828-1.414z"/></svg></button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-1">
                  <span>Início: <span className="text-gray-800">{order.inicio_campanha ? formatDateBR(parseLocalDateString(order.inicio_campanha)) : '-'}</span></span>
                  <span>|</span>
                  <span>Período de Duração: <span className="text-blue-700 font-medium">{order.duracao_campanha ? `${order.duracao_campanha} semanas` : '-'}</span></span>
                </div>
                <div className="mb-2">
                  {/* Tag de categoria (exemplo) */}
                  <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">Elevadores Comerciais</span>
                </div>
                <button
                  className="border border-gray-300 rounded px-3 py-1 text-sm hover:bg-gray-100"
                  onClick={() => { setSelectedOrder(order); setIsModalOpen(true); }}
                >
                  Ver detalhes do anúncio
                </button>
              </div>
              {/* ID, menu e preço */}
              <div className="flex flex-col items-end gap-2 min-w-[120px] h-full justify-between self-stretch">
                <div className="flex items-center gap-2 w-full justify-end relative">
                  <span className="text-gray-400 text-sm">#{order.id}</span>
                  <button
                    className="border border-gray-200 rounded p-1 hover:bg-gray-100"
                    title="Menu"
                    onClick={() => setOpenMenuId(openMenuId === order.id ? null : order.id)}
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="6" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18" r="1.5"/></svg>
                  </button>
                  {openMenuId === order.id && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg z-50 py-2 border">
                      <button className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm">trocar arte</button>
                      <button className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm">detalhes do anúncio</button>
                      <button className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm">adicionar ao plano de mídia</button>
                      <button className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm">alterar data de inicio</button>
                    </div>
                  )}
                </div>
                <div className="flex-1 flex items-center justify-end">
                  <span className="text-lg font-bold text-gray-800">{order.preco ? Number(order.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de detalhes do anúncio */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="fixed z-50 inset-0 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          {/* Backdrop manual para Headless UI v1+ */}
          {isModalOpen && <div className="fixed inset-0 bg-black bg-opacity-30 z-40" aria-hidden="true"></div>}
          <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-auto p-8 z-50">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl"
              onClick={() => setIsModalOpen(false)}
              aria-label="Fechar"
            >
              ×
            </button>
            {selectedOrder && (
              <div>
                <div className="flex gap-4 items-start mb-4">
                  <div className="w-24 h-24 bg-gray-200 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                    <img src={selectedOrder.arte_campanha || "/logo.png"} alt="Anúncio" className="object-cover w-full h-full" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-1">{selectedOrder.nome_campanha || 'Campanha sem nome'}</h2>
                    <div className="text-sm text-gray-500 mb-1">ID: <span className="text-gray-700">{selectedOrder.id}</span></div>
                  </div>
                </div>
                <div className="mb-2 text-sm text-gray-700">
                  <span className="block mb-1">Início: {selectedOrder.inicio_campanha ? formatDateBR(parseLocalDateString(selectedOrder.inicio_campanha)) : '-'}</span>
                  <span className="block mb-1">Duração: <span className="font-medium">{selectedOrder.duracao_campanha || '-'}</span></span>
                  <span className="block mb-1">Preço: <span className="font-medium">{selectedOrder.preco ? Number(selectedOrder.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</span></span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default page;
