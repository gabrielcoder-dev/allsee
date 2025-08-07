import React, { useRef, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Star, Image as ImageIcon, Menu, List, User, LogOut, MessageCircle, GlobeLockIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ModalMenuProps {
  open: boolean;
  onClose: () => void;
}

export default function ModalMenu({ open, onClose }: ModalMenuProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fecha ao clicar fora do modal
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end md:items-start md:justify-end">
      {/* Overlay escuro */}
      <div
        className="fixed inset-0 bg-black/30"
        onClick={onClose}
        aria-label="Fechar menu"
      />
      {/* Menu lateral */}
      <div
        ref={modalRef}
        className="relative bg-white p-4 rounded-l-2xl shadow-xl h-screen w-4/5 max-w-xs md:w-80 flex flex-col gap-4 animate-slide-in-right z-[9999]"
        style={{ right: 0 }}
      >
        {/* Botão de fechar */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X size={24} />
        </button>
        {/* Grid de opções principais */}
        <div className="grid grid-cols-2 gap-4 mb-2 mt-12">
          <button className="flex flex-col items-start justify-center gap-2 p-4 rounded-xl bg-orange-600 text-white font-semibold shadow hover:bg-orange-700 transition cursor-pointer">
            <Menu size={24} />
            <span className="text-sm text-left leading-tight">escolha onde anunciar</span>
          </button>
          <button
            className="flex flex-col items-start justify-center gap-2 p-4 rounded-xl bg-gray-100 text-gray-700 font-semibold shadow hover:bg-gray-200 transition cursor-pointer"
            onClick={() => {
              router.push('/meus-anuncios');
              onClose();
            }}
          >
            <List size={24} />
            <span className="text-sm text-left leading-tight">meus anúncios</span>
          </button>
          <button className="flex flex-col items-start justify-center gap-2 p-4 rounded-xl bg-gray-100 text-gray-700 font-semibold shadow hover:bg-gray-200 transition cursor-pointer">
            <ImageIcon size={24} />
            <span className="text-sm text-left leading-tight">biblioteca de mídia</span>
          </button>
          <button 
            className="flex flex-col items-start justify-center gap-2 p-4 rounded-xl bg-gray-100 text-gray-700 font-semibold shadow hover:bg-gray-200 transition cursor-pointer"
            onClick={() => {
              router.push('/dashboard');
              onClose();
            }}
          >
            <GlobeLockIcon size={24} />
            <span className="text-sm text-left leading-tight">Dashboard</span>
          </button>
        </div>
        {/* Accordions (simples, sem animação) */}
        <div className="flex flex-col gap-2">
          <AccordionItem title="gerenciamento de conta" />
          <AccordionItem title="materiais e ajuda" />
        </div>
        {/* Indique e ganhe + busca */}
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <span>indique e ganhe</span>
            <MessageCircle size={18} className="text-gray-400" />
          </div>
          <div className="flex items-center border rounded-lg overflow-hidden">
            <input
              type="text"
              placeholder="ajuda"
              className="flex-1 px-3 py-2 outline-none text-sm"
            />
            <a
              href="https://wa.me/?text=Preciso%20de%20ajuda"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 flex items-center justify-center"
              title="WhatsApp"
            >
              <svg viewBox="0 0 32 32" width="20" height="20" fill="currentColor"><path d="M16 3C9.373 3 4 8.373 4 15c0 2.385.832 4.58 2.236 6.364L4 29l7.01-2.184A12.94 12.94 0 0016 27c6.627 0 12-5.373 12-12S22.627 3 16 3zm0 22c-1.77 0-3.468-.46-4.94-1.26l-.35-.2-4.16 1.3 1.3-4.04-.22-.36A9.94 9.94 0 016 15c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10zm5.29-7.71c-.29-.15-1.71-.84-1.97-.94-.26-.1-.45-.15-.64.15-.19.29-.74.94-.91 1.13-.17.19-.34.21-.63.07-.29-.15-1.23-.45-2.34-1.43-.86-.77-1.44-1.72-1.61-2-.17-.29-.02-.44.13-.59.13-.13.29-.34.43-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.15-.64-1.54-.88-2.11-.23-.56-.47-.48-.64-.49-.17-.01-.36-.01-.56-.01-.19 0-.5.07-.76.36-.26.29-1 1-.99 2.43.01 1.43 1.03 2.81 1.18 3 .15.19 2.03 3.1 4.93 4.22.69.3 1.23.48 1.65.61.69.22 1.32.19 1.81.12.55-.08 1.71-.7 1.95-1.37.24-.67.24-1.25.17-1.37-.07-.12-.26-.19-.55-.34z"/></svg>
            </a>
          </div>
        </div>
        {/* Botão sair */}
        <button className="flex items-center gap-2 text-red-600 font-semibold mt-4 hover:underline cursor-pointer" onClick={onClose}>
          <LogOut size={20} /> sair
        </button>
      </div>
    </div>
  );
}

// AccordionItem simples (apenas abre/fecha)
function AccordionItem({ title }: { title: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border rounded-lg">
      <button
        className="flex items-center justify-between w-full px-4 py-3 text-gray-700 font-medium focus:outline-none cursor-pointer"
        onClick={() => setOpen(o => !o)}
        type="button"
      >
        <span>{title}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && (
        <div className="px-4 pb-3 text-sm text-gray-500">Conteúdo de {title}</div>
      )}
    </div>
  );
}
