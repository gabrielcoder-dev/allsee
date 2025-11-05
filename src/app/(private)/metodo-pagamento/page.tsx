'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { HeaderResume } from '@/Components/HeaderResume';
import { SiPix } from 'react-icons/si';
import { MdCreditCard } from 'react-icons/md';
import { Loader2, Copy, Check, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

function MetodoPagamentoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { produtos, selectedDurationGlobal, precoComDesconto } = useCart();
  const [loading, setLoading] = useState(false);
  const [loadingPix, setLoadingPix] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{
    qrCode: string;
    qrCodeText: string;
    paymentLink: string;
    billingId: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (searchParams) {
      const id = searchParams.get('orderId');
      setOrderId(id);
    }
  }, [searchParams]);

  // Função de cálculo do preço original (sem desconto)
  const calcularPrecoOriginal = (item: any) => {
    let preco = item.preco;
    const durationsTrue = [
      item.duration_2,
      item.duration_4,
      item.duration_12,
      item.duration_24,
    ].filter(Boolean).length;
    if (durationsTrue > 1) {
      if (selectedDurationGlobal === "4") preco = item.preco * 2;
      if (selectedDurationGlobal === "12") preco = item.preco * 6;
      if (selectedDurationGlobal === "24") preco = item.preco * 12;
    }
    return typeof preco === "number" ? preco * item.quantidade : 0;
  };

  // Função de cálculo do preço com desconto
  const calcularPrecoComDesconto = (item: any) => {
    let preco = item.preco;
    const durationsTrue = [
      item.duration_2,
      item.duration_4,
      item.duration_12,
      item.duration_24,
    ].filter(Boolean).length;
    const descontos: { [key: string]: number } = {
      '4': 20,
      '12': 60,
      '24': 120,
    };
    let desconto = 0;
    if (durationsTrue > 1) {
      if (selectedDurationGlobal === "4") {
        preco = item.preco * 2;
        desconto = descontos['4'];
      }
      if (selectedDurationGlobal === "12") {
        preco = item.preco * 6;
        desconto = descontos['12'];
      }
      if (selectedDurationGlobal === "24") {
        preco = item.preco * 12;
        desconto = descontos['24'];
      }
    }
    preco = preco - desconto;
    return typeof preco === "number" ? preco * item.quantidade : 0;
  };

  const precoOriginal = produtos && produtos.length > 0 
    ? produtos.reduce((acc, item) => acc + calcularPrecoOriginal(item), 0) 
    : 0;
  const precoComDescontoCalculado = produtos && produtos.length > 0 
    ? produtos.reduce((acc, item) => acc + calcularPrecoComDesconto(item), 0) 
    : 0;
  const total = precoComDescontoCalculado || precoComDesconto;

  const handleCartaoClick = () => {
    if (!orderId) {
      alert('ID do pedido não encontrado');
      return;
    }
    setLoading(true);
    router.push(`/checkout?orderId=${orderId}`);
  };

  const handlePixClick = async () => {
    if (!orderId) {
      alert('ID do pedido não encontrado');
      return;
    }

    setLoadingPix(true);
    try {
      const response = await fetch('/api/abacatepay/create-pix-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          amount: total,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao gerar pagamento PIX');
      }

      setPixData({
        qrCode: data.qrCode || data.qrCodeText || '',
        qrCodeText: data.qrCodeText || data.qrCode || '',
        paymentLink: data.paymentLink || '',
        billingId: data.billingId || '',
      });
    } catch (error: any) {
      console.error('Erro ao criar pagamento PIX:', error);
      alert(`Erro ao gerar pagamento PIX: ${error.message}`);
    } finally {
      setLoadingPix(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc]">
      <HeaderResume />
      <div className="flex flex-col gap-8 items-center w-full py-8 px-2 md:px-0">
        {/* Título e subtítulo */}
        <div className="text-center flex items-center justify-center flex-col gap-2 px-2 md:px-0">
          <h1 className="text-3xl font-bold">Pagamento</h1>
          <p className="text-gray-600 text-base w-64 lg:w-full">
            Você está a um passo de reservar seu lugar nas telas da Eletromidia! Confirme os valores e selecione a forma de pagamento
          </p>
        </div>

        {/* Resumo de valores */}
        <div className="bg-white rounded-xl shadow border border-gray-100 p-4 md:p-8 flex flex-col gap-4 w-full max-w-2xl">
          <h2 className="text-xl font-bold mb-2">Resumo de valores</h2>
          <div className="border-b border-gray-200 mb-4"></div>
          
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-base">
              <span>Campanha</span>
              <span className="font-medium text-black">
                R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-base">
              <span>Subtotal</span>
              <span className="font-medium text-black">
                R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="text-sm text-gray-700">
              Possui cupom? <a href="#" className="text-green-600 hover:underline">Adicionar</a>
            </div>
          </div>
          
          <div className="border-b border-gray-200 my-2"></div>
          
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total</span>
            <span className="text-black">
              R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Métodos de pagamento */}
        {!pixData && (
          <div className="bg-white rounded-xl shadow border border-gray-100 p-4 md:p-8 flex flex-col gap-4 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-2">Escolha o método de pagamento</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PIX */}
              <button
                onClick={handlePixClick}
                disabled={loading || loadingPix}
                className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  <SiPix className="w-6 h-6 text-gray-800" />
                </div>
                <span className="font-medium text-gray-800">pix</span>
              </button>

              {/* Cartão de crédito */}
              <button
                onClick={handleCartaoClick}
                disabled={loading || loadingPix}
                className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  <MdCreditCard className="w-6 h-6 text-gray-800" />
                </div>
                <span className="font-medium text-gray-800">cartão de crédito</span>
              </button>
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Redirecionando...</span>
              </div>
            )}

            {loadingPix && (
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Gerando QR Code PIX...</span>
              </div>
            )}
          </div>
        )}

        {/* Exibição do QR Code PIX */}
        {pixData && (
          <div className="bg-white rounded-xl shadow border border-gray-100 p-4 md:p-8 flex flex-col gap-6 w-full max-w-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Pagamento via PIX</h2>
              <button
                onClick={() => setPixData(null)}
                className="text-gray-500 hover:text-gray-700 text-sm underline"
              >
                Escolher outro método
              </button>
            </div>

            <div className="border-b border-gray-200"></div>

            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-700 text-center">
                Escaneie o QR Code abaixo ou copie o código PIX para realizar o pagamento
              </p>

              {/* QR Code */}
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                {pixData.qrCodeText ? (
                  <QRCodeSVG
                    value={pixData.qrCodeText}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center text-gray-400">
                    QR Code não disponível
                  </div>
                )}
              </div>

              {/* Código PIX (copiável) */}
              {pixData.qrCodeText && (
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código PIX (Copiar e Colar)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={pixData.qrCodeText}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                    />
                    <button
                      onClick={() => copyToClipboard(pixData.qrCodeText)}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Link de pagamento */}
              {pixData.paymentLink && (
                <div className="w-full">
                  <a
                    href={pixData.paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Abrir link de pagamento
                  </a>
                </div>
              )}

              <div className="text-sm text-gray-500 text-center mt-4">
                <p>Após o pagamento, você será redirecionado automaticamente.</p>
                <p className="mt-2">O pagamento pode levar alguns minutos para ser confirmado.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MetodoPagamentoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <MetodoPagamentoContent />
    </Suspense>
  );
}

