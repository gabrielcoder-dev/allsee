'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { HeaderResume } from '@/Components/HeaderResume';
import { Loader2, CreditCard, Lock } from 'lucide-react';
import { toast } from 'sonner';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cardData, setCardData] = useState({
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
  });

  const [installments, setInstallments] = useState(1);

  useEffect(() => {
    if (searchParams) {
      const id = searchParams.get('orderId');
      setOrderId(id);
    }
  }, [searchParams]);

  // Buscar dados do pedido
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      
      try {
        const response = await fetch(`/api/admin/get-order?id=${orderId}`);
        if (response.ok) {
          const orderData = await response.json();
          setOrder(orderData);
        } else {
          setError('Pedido não encontrado');
        }
      } catch (error) {
        console.error('Erro ao buscar pedido:', error);
        setError('Erro ao carregar dados do pedido');
      }
    };

    fetchOrder();
  }, [orderId]);

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.slice(0, 19); // Limitar a 16 dígitos + 3 espaços
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardData({ ...cardData, number: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderId || !order) {
      setError('Dados do pedido não disponíveis');
      return;
    }

    // Validações
    if (!cardData.holderName.trim()) {
      setError('Nome do portador é obrigatório');
      return;
    }

    if (cardData.number.replace(/\s/g, '').length < 13) {
      setError('Número do cartão inválido');
      return;
    }

    if (!cardData.expiryMonth || !cardData.expiryYear) {
      setError('Data de validade é obrigatória');
      return;
    }

    if (cardData.ccv.length < 3) {
      setError('CVV inválido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Preparar dados do cliente
      const customer = {
        nome: order.nome || '',
        cpf: order.cpf || '',
        email: order.email || '',
        telefone: order.telefone || '',
        razaoSocial: order.razao_social || '',
        cnpj: order.cnpj || '',
        telefonej: order.telefone || '',
        cep: order.cep || '',
        cepJ: order.cep || '',
        numero: order.numero || '',
        numeroJ: order.numero || '',
      };

      const response = await fetch('/api/asaas/create-credit-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          customer,
          creditCard: {
            holderName: cardData.holderName,
            number: cardData.number.replace(/\s/g, ''),
            expiryMonth: parseInt(cardData.expiryMonth),
            expiryYear: parseInt(cardData.expiryYear),
            ccv: cardData.ccv,
          },
          installments,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao processar pagamento');
      }

      // Se o pagamento foi confirmado
      if (data.status === 'CONFIRMED') {
        // Mostrar toast de sucesso
        toast.success('Pagamento confirmado!', {
          description: 'Redirecionando para seus anúncios...',
          duration: 2000
        });
        
        // Verificar se o status do pedido foi atualizado para "pago"
        // Aguardar um pouco para garantir que o banco foi atualizado
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar o status do pedido no banco
        try {
          const orderResponse = await fetch(`/api/admin/get-order?id=${orderId}`);
          if (orderResponse.ok) {
            const orderData = await orderResponse.json();
            
            // Se o status já está como "pago", redirecionar direto
            if (orderData.status === 'pago') {
              setTimeout(() => {
                router.push('/meus-anuncios');
              }, 1500);
            } else {
              // Se ainda não está atualizado, aguardar mais um pouco e verificar novamente
              await new Promise(resolve => setTimeout(resolve, 1000));
              const orderResponse2 = await fetch(`/api/admin/get-order?id=${orderId}`);
              if (orderResponse2.ok) {
                const orderData2 = await orderResponse2.json();
                if (orderData2.status === 'pago') {
                  setTimeout(() => {
                    router.push('/meus-anuncios');
                  }, 500);
                } else {
                  // Mesmo que não esteja atualizado ainda, redirecionar (o webhook vai atualizar)
                  setTimeout(() => {
                    router.push('/meus-anuncios');
                  }, 500);
                }
              } else {
                setTimeout(() => {
                  router.push('/meus-anuncios');
                }, 500);
              }
            }
          } else {
            // Se não conseguir verificar, redirecionar mesmo assim
            setTimeout(() => {
              router.push('/meus-anuncios');
            }, 1500);
          }
        } catch (error) {
          console.error('Erro ao verificar status do pedido:', error);
          // Em caso de erro, redirecionar mesmo assim
          setTimeout(() => {
            router.push('/meus-anuncios');
          }, 1500);
        }
      } else {
        // Se precisar de confirmação adicional
        if (data.paymentLink) {
          window.location.href = data.paymentLink;
        } else {
          setError('Pagamento processado, mas aguardando confirmação. Você será notificado em breve.');
        }
      }
    } catch (error: any) {
      console.error('Erro ao processar pagamento:', error);
      setError(error.message || 'Erro ao processar pagamento com cartão');
    } finally {
      setLoading(false);
    }
  };

  const total = order?.preco || 0;

  return (
    <div className="min-h-screen bg-[#fcfcfc]">
      <HeaderResume />
      <div className="flex flex-col gap-8 items-center w-full py-8 px-4 md:px-0">
        {/* Título */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Pagamento com Cartão de Crédito</h1>
          <p className="text-gray-600 mt-2">Preencha os dados do seu cartão para finalizar o pagamento</p>
        </div>

        {/* Resumo do pedido */}
        {order && (
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Resumo do Pedido</h2>
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span className="text-orange-600">
                R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* Formulário do cartão */}
        <div className="bg-white rounded-xl shadow border border-gray-100 p-6 md:p-8 w-full max-w-md">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Nome do portador */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome no cartão
              </label>
              <input
                type="text"
                value={cardData.holderName}
                onChange={(e) => setCardData({ ...cardData, holderName: e.target.value.toUpperCase() })}
                placeholder="NOME COMO ESTÁ NO CARTÃO"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>

            {/* Número do cartão */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número do cartão
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={cardData.number}
                  onChange={handleCardNumberChange}
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
            </div>

            {/* Validade e CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Validade
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={cardData.expiryMonth}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                      if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 12)) {
                        setCardData({ ...cardData, expiryMonth: val });
                      }
                    }}
                    placeholder="MM"
                    maxLength={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                  <input
                    type="text"
                    value={cardData.expiryYear}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setCardData({ ...cardData, expiryYear: val });
                    }}
                    placeholder="AAAA"
                    maxLength={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CVV
                </label>
                <input
                  type="text"
                  value={cardData.ccv}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setCardData({ ...cardData, ccv: val });
                  }}
                  placeholder="123"
                  maxLength={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
            </div>

            {/* Parcelas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parcelas
              </label>
              <select
                value={installments}
                onChange={(e) => setInstallments(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                  <option key={num} value={num}>
                    {num}x de R$ {(total / num).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} sem juros
                  </option>
                ))}
              </select>
            </div>

            {/* Botão de pagamento */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Finalizar Pagamento
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Seus dados estão protegidos e criptografados
            </p>
          </form>

          <button
            onClick={() => router.push(`/metodo-pagamento?orderId=${orderId}`)}
            className="mt-4 text-orange-600 hover:text-orange-700 text-sm underline w-full text-center"
          >
            Voltar para métodos de pagamento
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
