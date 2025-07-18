import type { NextApiRequest, NextApiResponse } from 'next';
import { Preference } from 'mercadopago';
import { mercadoPagoClient } from '@/services/mercado-pago';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { total, orderId } = req.body;

  if (!total || !orderId) {
    return res.status(400).json({ error: 'Total and orderId are required' });
  }

  try {
    const preference = new Preference(mercadoPagoClient);
    const result = await preference.create({
      body: {
        items: [
          {
            id: 'allsee-1',
            title: 'Pagamento Allsee',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: Number(total),
          },
        ],
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_BASE_URL}/results`,
          failure: `${process.env.NEXT_PUBLIC_BASE_URL}/results`,
          pending: `${process.env.NEXT_PUBLIC_BASE_URL}/results`,
        },
        auto_return: 'approved',
        external_reference: orderId,
      },
    });
    return res.status(200).json({ init_point: result.init_point });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar preferência' });
  }
}
