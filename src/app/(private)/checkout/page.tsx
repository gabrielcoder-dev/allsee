'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useUser } from '@supabase/auth-helpers-react';
import { Loader2 } from 'lucide-react';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { formData } = useCart();
  const user = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeCheckout = async () => {
      try {
        if (!searchParams) {
          setError('Parâmetros não disponíveis');
          setLoading(false);
          return;
        }

        const orderId = searchParams.get('orderId');
        
        if (!orderId) {
          setError('ID do pedido não encontrado');
          setLoading(false);
          return;
        }

        if (!user?.id) {
          setError('Usuário não autenticado');
          setLoading(false);
          return;
        }

        // Buscar informações do pedido
        const orderResponse = await fetch(`/api/admin/get-order?id=${orderId}`);
        if (!orderResponse.ok) {
          const errorData = await orderResponse.json().catch(() => ({ error: 'Erro desconhecido' }));
          throw new Error(errorData.error || 'Erro ao buscar informações do pedido');
        }

        const order = await orderResponse.json();

        // Garantir que o preço é o mesmo que foi calculado em /pagamentos
        const amount = order.preco || 0;
        
        if (amount <= 0) {
          throw new Error('Valor do pedido inválido');
        }

        // Criar sessão de checkout do Stripe
        const checkoutResponse = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderId,
            amount: amount,
            orderData: {
              id_user: user.id,
              nome_campanha: order.nome_campanha,
              email: order.email || formData.email,
            }
          })
        });

        if (!checkoutResponse.ok) {
          const errorData = await checkoutResponse.json();
          throw new Error(errorData.error || 'Erro ao criar sessão de pagamento');
        }

        const { url } = await checkoutResponse.json();

        if (url) {
          // Redirecionar para o Stripe Checkout
          window.location.href = url;
        } else {
          throw new Error('URL de checkout não retornada');
        }
      } catch (err: any) {
        console.error('Erro ao inicializar checkout:', err);
        setError(err.message || 'Erro ao processar pagamento');
        setLoading(false);
      }
    };

    initializeCheckout();
  }, [searchParams, user, formData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Redirecionando para o pagamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erro no pagamento</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/pagamento')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-md"
          >
            Voltar para o pagamento
          </button>
        </div>
      </div>
    );
  }

  return null;
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

