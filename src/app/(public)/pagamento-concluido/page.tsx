'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PagamentoConcluido() {
  const router = useRouter();

  useEffect(() => {
    // Limpar dados do localStorage (carrinho e informações da compra)
    localStorage.removeItem('cart');
    localStorage.removeItem('formData');
    
    // Redireciona automaticamente para /meus-anuncios após 2 segundos
    const timer = setTimeout(() => {
      router.push('/meus-anuncios');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div style={{ textAlign: 'center', marginTop: 50 }}>
      <h1>Pagamento concluído com sucesso!</h1>
      <p>Obrigado pela sua compra.</p>
      <p>Redirecionando para seus anúncios...</p>
      <div style={{ marginTop: 20 }}>
        <button 
          onClick={() => {
            // Limpar dados do localStorage ao clicar no botão também
            localStorage.removeItem('cart');
            localStorage.removeItem('formData');
            router.push('/meus-anuncios');
          }}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#f97316', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer' 
          }}
        >
          Ir para Meus Anúncios
        </button>
      </div>
    </div>
  );
} 