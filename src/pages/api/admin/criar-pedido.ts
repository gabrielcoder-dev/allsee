import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { id_user, produtos, total, duracao, status, cliente, arte_campanha_url, campaignName, startDate } = req.body;

    // Validação básica
    if (!id_user) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campo obrigatório faltando: id_user' 
      });
    }

    if (!produtos || !Array.isArray(produtos) || produtos.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campo obrigatório faltando: produtos (array não vazio)' 
      });
    }

    if (total === undefined || total === null) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campo obrigatório faltando: total' 
      });
    }

    console.log('📥 Criando pedido:', {
      id_user,
      totalProdutos: produtos.length,
      total,
      duracao,
      status: status || 'draft',
      temArte: !!arte_campanha_url,
      tipoCliente: cliente?.tipo || 'desconhecido'
    });

    // Preparar dados do pedido
    // Gerar id_produto como string separada por vírgulas
    const id_produto = produtos.map((p: any) => p.id_produto || p.id).join(',');
    
    // Preparar dados do pedido com apenas as colunas que existem na tabela
    const orderData: any = {
      id_user,
      id_produto: id_produto, // string separada por vírgulas
      preco: typeof total === 'number' ? total : parseFloat(total),
      duracao_campanha: duracao || '2',
      status: status || 'pendente',
      // Informações da campanha
      nome_campanha: campaignName || null,
      inicio_campanha: startDate || null,
    };

    // Salvar dados do cliente em campos individuais (não como JSON)
    if (cliente) {
      if (cliente.tipo === 'fisica') {
        orderData.nome = cliente.nome || null;
        orderData.cpf = cliente.cpf || null;
        orderData.email = cliente.email || null;
        orderData.telefone = cliente.telefone || null;
        orderData.cep = cliente.cep || null;
        orderData.endereco = cliente.endereco || null;
        orderData.numero = cliente.numero || null;
        orderData.bairro = cliente.bairro || null;
        orderData.complemento = cliente.complemento || null;
        orderData.cidade = cliente.cidade || null;
        orderData.estado = cliente.estado || null;
      } else if (cliente.tipo === 'juridica') {
        orderData.razao_social = cliente.razaoSocial || null;
        orderData.cnpj = cliente.cnpj || null;
        orderData.setor = cliente.segmento || null;
        orderData.email = cliente.email || null;
        orderData.telefone = cliente.telefone || null;
        orderData.cep = cliente.cep || null;
        orderData.endereco = cliente.endereco || null;
        orderData.numero = cliente.numero || null;
        orderData.bairro = cliente.bairro || null;
        orderData.complemento = cliente.complemento || null;
        orderData.cidade = cliente.cidade || null;
        orderData.estado = cliente.estado || null;
      }
    }

    // arte_campanha_url não é salvo diretamente na tabela order
    // será salvo separadamente na tabela arte_campanha se necessário

    console.log('📦 Dados do pedido a serem inseridos:', {
      ...orderData,
      produtos: produtos.length + ' produtos',
      tipoCliente: cliente?.tipo || 'nenhum'
    });

    // Inserir pedido no banco de dados
    const { data: order, error } = await supabase
      .from('order')
      .insert([orderData])
      .select('id, id_user, preco, status, created_at')
      .single();

    if (error) {
      console.error("❌ Erro ao criar pedido - Detalhes completos:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        orderData: {
          ...orderData,
          produtos: 'JSON string'
        }
      });
      return res.status(500).json({ 
        success: false, 
        error: `Erro ao salvar pedido: ${error.message || 'Erro desconhecido'}`,
        details: error.details || null,
        hint: error.hint || null
      });
    }

    console.log('✅ Pedido criado com sucesso:', {
      id: order.id,
      id_user: order.id_user,
      preco: order.preco,
      status: order.status
    });

    // Headers para otimização
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    
    return res.status(200).json({ 
      success: true,
      orderId: order.id,
      order
    });
  } catch (error: any) {
    console.error('❌ Erro inesperado ao criar pedido:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro desconhecido ao criar pedido' 
    });
  }
}

