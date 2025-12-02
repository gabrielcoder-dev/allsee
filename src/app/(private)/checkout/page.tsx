'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
        <div className="text-orange-600 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Checkout não disponível</h2>
        <p className="text-gray-600 mb-6">O sistema de pagamento está sendo atualizado. Por favor, selecione outro método de pagamento.</p>
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
