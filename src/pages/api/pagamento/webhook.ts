import type { NextApiRequest, NextApiResponse } from 'next';
import { atualizarStatusCompra } from '../../../lib/utils';

// Mock ajustado: external_reference igual ao id recebido
async function buscarPagamentoMercadoPago(paymentId: string) {
  return {
    status: 'approved',
    external_reference: paymentId, // agora usa o id recebido
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { data, type } = req.body;

    if (type === 'payment') {
      const pagamento = await buscarPagamentoMercadoPago(data.id);
      if (pagamento.status === 'approved') {
        await atualizarStatusCompra(pagamento.external_reference, 'pago');
      }
    }

    res.status(200).json({ received: true });
  } else {
    res.status(405).end(); // Method Not Allowed
  }
} 