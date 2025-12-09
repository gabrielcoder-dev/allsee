'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FileText, Download, Eye, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  payment: string;
  serviceDescription: string;
  value: number;
  effectiveDate: string;
  status: string;
  authorizationDate?: string;
  cancellationDate?: string;
  order?: {
    id: string;
    nome_campanha: string;
    preco: number;
  } | null;
}

export default function NotasFiscaisPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        router.push('/');
      }
    };
    getUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/asaas/invoices/list?userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        setInvoices(data.invoices || []);
      } else {
        toast.error('Erro ao carregar notas fiscais', {
          description: data.error || 'Tente novamente mais tarde'
        });
      }
    } catch (error: any) {
      console.error('Erro ao buscar notas fiscais:', error);
      toast.error('Erro ao carregar notas fiscais', {
        description: 'Tente novamente mais tarde'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchInvoices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleDownload = async (invoiceId: string) => {
    setDownloadingId(invoiceId);
    try {
      const response = await fetch(`/api/asaas/invoices/download?invoiceId=${invoiceId}`);
      const data = await response.json();

      if (data.success) {
        if (data.url) {
          window.open(data.url, '_blank');
          toast.success('Nota fiscal aberta');
        } else {
          toast.error('URL de download não disponível');
        }
      } else {
        toast.error('Erro ao baixar nota fiscal', {
          description: data.error || 'Tente novamente'
        });
      }
    } catch (error: any) {
      console.error('Erro ao baixar nota fiscal:', error);
      toast.error('Erro ao baixar nota fiscal', {
        description: 'Tente novamente'
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setViewingInvoice(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { color: string; label: string } } = {
      'AUTHORIZED': { color: 'bg-green-100 text-green-800', label: 'Autorizada' },
      'CANCELLED': { color: 'bg-red-100 text-red-800', label: 'Cancelada' },
      'PENDING': { color: 'bg-yellow-100 text-yellow-800', label: 'Pendente' },
    };

    const statusInfo = statusMap[status] || { color: 'bg-gray-100 text-gray-800', label: status };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="px-6 py-4 max-w-4xl mx-auto">
          <Link href="/results" className="flex items-center gap-3 text-xl font-semibold text-black hover:text-gray-700 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Voltar
          </Link>
          <h1 className="text-3xl font-bold text-orange-600">Minhas Notas Fiscais</h1>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="px-6 py-8 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 animate-spin text-orange-600 mb-4" />
            <p className="text-gray-600">Carregando notas fiscais...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-3 text-center">
              Nenhuma nota fiscal encontrada
            </h2>
            <p className="text-gray-500 text-center max-w-md mb-8">
              Suas notas fiscais aparecerão aqui quando forem geradas.
            </p>
            <Link
              href="/meus-anuncios"
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Ver Meus Anúncios
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:gap-6">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {invoice.order?.nome_campanha || 'Nota Fiscal'}
                      </h3>
                      <p className="text-sm text-gray-500 font-mono">
                        ID: {invoice.id.substring(0, 24)}...
                      </p>
                    </div>
                    {getStatusBadge(invoice.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Valor</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(invoice.value)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Data de Emissão</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(invoice.effectiveDate)}
                      </p>
                    </div>
                  </div>

                  {invoice.serviceDescription && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Descrição do Serviço</p>
                      <p className="text-sm text-gray-700">{invoice.serviceDescription}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleView(invoice)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Visualizar
                    </button>
                    <button
                      onClick={() => handleDownload(invoice.id)}
                      disabled={downloadingId === invoice.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                    >
                      {downloadingId === invoice.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Baixando...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Baixar PDF
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Visualização */}
      {viewingInvoice && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Detalhes da Nota Fiscal</h2>
              <button
                onClick={() => setViewingInvoice(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">ID</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono break-all">{selectedInvoice.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedInvoice.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Valor</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">{formatCurrency(selectedInvoice.value)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Data de Emissão</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedInvoice.effectiveDate)}</p>
                </div>
                {selectedInvoice.authorizationDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data de Autorização</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedInvoice.authorizationDate)}</p>
                  </div>
                )}
                {selectedInvoice.cancellationDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data de Cancelamento</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedInvoice.cancellationDate)}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Descrição do Serviço</label>
                <p className="mt-1 text-sm text-gray-900">{selectedInvoice.serviceDescription}</p>
              </div>
              {selectedInvoice.order && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Campanha Relacionada</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedInvoice.order.nome_campanha}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleDownload(selectedInvoice.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Baixar PDF
                </button>
                <button
                  onClick={() => setViewingInvoice(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
