"use client"

import React, { useState, useEffect, useRef } from "react";
import { Download, Eye, Trash2, FileText, Loader2, AlertCircle, CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface Invoice {
  id: string;
  payment: string;
  serviceDescription: string;
  value: number;
  effectiveDate: string;
  status: string;
  municipalServiceId?: string;
  municipalServiceCode?: string;
  authorizationDate?: string;
  cancellationDate?: string;
  order?: {
    id: string;
    nome_campanha: string;
    preco: number;
  } | null;
}

const NotaFiscalAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [openDownloadMenu, setOpenDownloadMenu] = useState<string | null>(null);
  const downloadMenuRef = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const downloadButtonRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [menuPosition, setMenuPosition] = useState<{ [key: string]: { top: number; left: number } }>({});

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/asaas/invoices/list');
      const data = await response.json();

      if (data.success) {
        // Filtrar apenas notas fiscais autorizadas
        const authorizedInvoices = (data.invoices || []).filter(
          (invoice: Invoice) => invoice.status === 'AUTHORIZED'
        );
        setInvoices(authorizedInvoices);
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

  // Fechar menu de download ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const menuRef = downloadMenuRef.current[openDownloadMenu || ''];
      const buttonRef = downloadButtonRef.current[openDownloadMenu || ''];
      
      if (openDownloadMenu) {
        const target = event.target as Node;
        const clickedOutsideMenu = menuRef && !menuRef.contains(target);
        const clickedOutsideButton = buttonRef && !buttonRef.contains(target);
        
        if (clickedOutsideMenu && clickedOutsideButton) {
          setOpenDownloadMenu(null);
        }
      }
    };

    if (openDownloadMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDownloadMenu]);

  const handleDownload = async (invoiceId: string, format: 'pdf' | 'xml') => {
    const downloadKey = `${invoiceId}-${format}`;
    setDownloadingId(invoiceId);
    setDownloadingFormat(downloadKey);
    setOpenDownloadMenu(null);

    try {
      const response = await fetch(`/api/asaas/invoices/download?invoiceId=${invoiceId}&format=${format}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao baixar nota fiscal');
      }

      // Verificar se é um arquivo binário (PDF ou XML)
      const contentType = response.headers.get('content-type') || '';
      const contentDisposition = response.headers.get('content-disposition') || '';
      
      // Se for PDF ou XML binário
      if (contentType.includes('application/pdf') || 
          contentType.includes('application/xml') || 
          contentType.includes('text/xml')) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Extrair nome do arquivo do Content-Disposition ou usar padrão
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        const filename = filenameMatch 
          ? filenameMatch[1] 
          : `nota-fiscal-${invoiceId}.${format}`;
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Nota fiscal ${format.toUpperCase()} baixada com sucesso`);
        return;
      }

      // Se retornar JSON com URL ou dados
      const text = await response.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch {
        // Se não for JSON, pode ser XML ou outro formato
        const blob = new Blob([text], { 
          type: format === 'xml' ? 'application/xml' : 'application/pdf' 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nota-fiscal-${invoiceId}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Nota fiscal ${format.toUpperCase()} baixada com sucesso`);
        return;
      }

      if (data.success) {
        if (data.url) {
          // Abrir URL em nova aba
          window.open(data.url, '_blank');
          toast.success(`Nota fiscal ${format.toUpperCase()} aberta`);
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
        description: error.message || 'Tente novamente'
      });
    } finally {
      setDownloadingId(null);
      setDownloadingFormat(null);
    }
  };

  const toggleDownloadMenu = (invoiceId: string, event?: React.MouseEvent) => {
    if (openDownloadMenu === invoiceId) {
      setOpenDownloadMenu(null);
      return;
    }

    // Calcular posição do menu baseado no botão
    const button = downloadButtonRef.current[invoiceId];
    if (button) {
      const rect = button.getBoundingClientRect();
      setMenuPosition({
        ...menuPosition,
        [invoiceId]: {
          top: rect.bottom + 4,
          left: rect.right - 160 // 160px = largura do menu
        }
      });
    }

    setOpenDownloadMenu(invoiceId);
  };

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setViewingInvoice(true);
  };

  const handleDelete = async (invoiceId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta nota fiscal?')) {
      return;
    }

    try {
      const response = await fetch(`/api/asaas/invoices/delete?invoiceId=${invoiceId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Nota fiscal excluída com sucesso');
        fetchInvoices();
      } else {
        toast.error('Erro ao excluir nota fiscal', {
          description: data.error || 'Tente novamente'
        });
      }
    } catch (error: any) {
      console.error('Erro ao excluir nota fiscal:', error);
      toast.error('Erro ao excluir nota fiscal', {
        description: 'Tente novamente'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { color: string; icon: any; label: string } } = {
      'AUTHORIZED': { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Autorizada' },
      'CANCELLED': { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelada' },
      'PENDING': { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, label: 'Pendente' },
    };

    const statusInfo = statusMap[status] || { color: 'bg-gray-100 text-gray-800', icon: FileText, label: status };
    const Icon = statusInfo.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        <Icon className="w-3 h-3" />
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
            Notas Fiscais
          </h1>
          <p className="text-gray-600 mt-2">
            Gerencie todas as notas fiscais do sistema
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 animate-spin text-orange-600 mb-4" />
              <p className="text-gray-600">Carregando notas fiscais...</p>
            </div>
          </div>
        )}

        {/* Invoices List */}
        {!loading && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {invoices.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Nenhuma nota fiscal encontrada
                </h3>
                <p className="text-gray-600">
                  As notas fiscais aparecerão aqui quando forem criadas.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Campanha
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                          {invoice.id.substring(0, 20)}...
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {invoice.order?.nome_campanha || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(invoice.value)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(invoice.effectiveDate)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleView(invoice)}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                              title="Visualizar"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              ref={(el) => { downloadButtonRef.current[invoice.id] = el; }}
                              onClick={(e) => toggleDownloadMenu(invoice.id, e)}
                              disabled={downloadingId === invoice.id}
                              className="text-green-600 hover:text-green-800 p-1 rounded transition-colors disabled:opacity-50 relative"
                              title="Baixar"
                            >
                              {downloadingId === invoice.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Download className="w-5 h-5" />
                                  <ChevronDown className="w-3 h-3" />
                                </div>
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(invoice.id)}
                              className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Download Menu - Renderizado fora do container */}
        {openDownloadMenu && menuPosition[openDownloadMenu] && (
          <div
            ref={(el) => { downloadMenuRef.current[openDownloadMenu] = el; }}
            className="fixed bg-white rounded-lg shadow-lg border border-gray-200 z-[9999] py-1 w-40"
            style={{
              top: `${menuPosition[openDownloadMenu].top}px`,
              left: `${menuPosition[openDownloadMenu].left}px`
            }}
          >
            <button
              onClick={() => handleDownload(openDownloadMenu, 'pdf')}
              disabled={downloadingFormat === `${openDownloadMenu}-pdf`}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {downloadingFormat === `${openDownloadMenu}-pdf` ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Baixando PDF...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Baixar PDF</span>
                </>
              )}
            </button>
            <button
              onClick={() => handleDownload(openDownloadMenu, 'xml')}
              disabled={downloadingFormat === `${openDownloadMenu}-xml`}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {downloadingFormat === `${openDownloadMenu}-xml` ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Baixando XML...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Baixar XML</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* View Invoice Modal */}
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
                    <p className="mt-1 text-sm text-gray-900 font-mono">{selectedInvoice.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      {getStatusBadge(selectedInvoice.status)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Valor</label>
                    <p className="mt-1 text-sm text-gray-900">{formatCurrency(selectedInvoice.value)}</p>
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
                <div className="flex gap-2 pt-4">
                  <div className="flex-1 flex gap-2">
                    <button
                      onClick={() => handleDownload(selectedInvoice.id, 'pdf')}
                      disabled={downloadingFormat === `${selectedInvoice.id}-pdf`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {downloadingFormat === `${selectedInvoice.id}-pdf` ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Baixando PDF...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Baixar PDF</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDownload(selectedInvoice.id, 'xml')}
                      disabled={downloadingFormat === `${selectedInvoice.id}-xml`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {downloadingFormat === `${selectedInvoice.id}-xml` ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Baixando XML...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Baixar XML</span>
                        </>
                      )}
                    </button>
                  </div>
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
    </div>
  );
};

export default NotaFiscalAdmin;
