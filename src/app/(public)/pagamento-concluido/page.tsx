import Link from 'next/link';

export default function PagamentoConcluido() {
  return (
    <div style={{ textAlign: 'center', marginTop: 50 }}>
      <h1>Pagamento concluído com sucesso!</h1>
      <p>Obrigado pela sua compra.</p>
      <Link href="/results">
        <button style={{ marginTop: 20 }}>Voltar a comprar</button>
      </Link>
    </div>
  );
} 