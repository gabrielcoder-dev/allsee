'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/Components/ui/button'

interface Order {
  id: number
  status: string
  payment_id?: string
  nome_campanha?: string
  preco?: number
  created_at: string
  updated_at?: string
}

export default function TestWebhookPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null)
  const [testStatus, setTestStatus] = useState('pago')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)])
  }

  const fetchOrders = async () => {
    setLoading(true)
    addLog('Buscando orders...')
    
    try {
      const response = await fetch('/api/pagamento/list-orders?limit=20')
      const data = await response.json()
      
      if (data.success) {
        setOrders(data.orders || [])
        addLog(`✅ ${data.orders?.length || 0} orders encontradas`)
      } else {
        addLog(`❌ Erro: ${data.message}`)
      }
    } catch (error: any) {
      addLog(`❌ Erro ao buscar orders: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testOrderUpdate = async (orderId: number, status: string) => {
    addLog(`Testando atualização da order ${orderId} para status: ${status}`)
    
    try {
      const response = await fetch('/api/pagamento/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status })
      })
      
      const data = await response.json()
      
      if (data.success) {
        addLog(`✅ Order ${orderId} atualizada com sucesso`)
        fetchOrders() // Recarregar lista
      } else {
        addLog(`❌ Erro: ${data.message}`)
      }
    } catch (error: any) {
      addLog(`❌ Erro ao testar: ${error.message}`)
    }
  }

  const simulateWebhook = async (orderId: number, paymentId: string) => {
    addLog(`Simulando webhook para order ${orderId} com payment ${paymentId}`)
    
    try {
      const response = await fetch('/api/pagamento/simulate-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, paymentId, status: 'approved' })
      })
      
      const data = await response.json()
      
      if (data.success) {
        addLog(`✅ Webhook simulado enviado com sucesso`)
        fetchOrders() // Recarregar lista
      } else {
        addLog(`❌ Erro: ${data.message}`)
      }
    } catch (error: any) {
      addLog(`❌ Erro ao simular webhook: ${error.message}`)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">🧪 Teste do Webhook</h1>
      
      {/* Controles */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Controles</h2>
        <div className="flex gap-4 flex-wrap">
          <Button onClick={fetchOrders} disabled={loading}>
            {loading ? 'Carregando...' : '🔄 Atualizar Lista'}
          </Button>
          
          <div className="flex items-center gap-2">
            <label>Status:</label>
            <select 
              value={testStatus} 
              onChange={(e) => setTestStatus(e.target.value)}
              className="px-3 py-1 border rounded"
            >
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-black text-green-400 p-4 rounded-lg mb-6 font-mono text-sm">
        <h3 className="text-white mb-2">📋 Logs</h3>
        {logs.length === 0 ? (
          <p className="text-gray-500">Nenhum log ainda...</p>
        ) : (
          logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))
        )}
      </div>

      {/* Lista de Orders */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">📋 Orders ({orders.length})</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Payment ID</th>
                <th className="px-4 py-2 text-left">Campanha</th>
                <th className="px-4 py-2 text-left">Preço</th>
                <th className="px-4 py-2 text-left">Criado</th>
                <th className="px-4 py-2 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono">{order.id}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      order.status === 'pago' ? 'bg-green-100 text-green-800' :
                      order.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-sm">
                    {order.payment_id || '-'}
                  </td>
                  <td className="px-4 py-2">{order.nome_campanha || '-'}</td>
                  <td className="px-4 py-2">
                    {order.preco ? `R$ ${order.preco.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => testOrderUpdate(order.id, testStatus)}
                        className="text-xs"
                      >
                        Testar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => simulateWebhook(order.id, `test_${order.id}_${Date.now()}`)}
                        className="text-xs"
                      >
                        Webhook
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {orders.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Nenhuma order encontrada
          </div>
        )}
      </div>
    </div>
  )
}
