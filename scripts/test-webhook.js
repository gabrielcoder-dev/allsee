#!/usr/bin/env node

/**
 * Script de teste para o webhook do Mercado Pago
 * 
 * Este script testa:
 * 1. Listagem de orders
 * 2. Atualização manual de status
 * 3. Simulação de webhook
 * 4. Verificação de logs
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

interface Order {
  id: number
  status: string
  payment_id?: string
  nome_campanha?: string
  preco?: number
  created_at: string
  updated_at?: string
}

class WebhookTester {
  private logs: string[] = []

  private log(message: string) {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    this.logs.push(logMessage)
    console.log(logMessage)
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      })
      
      const data = await response.json()
      return { response, data }
    } catch (error: any) {
      this.log(`❌ Erro na requisição: ${error.message}`)
      throw error
    }
  }

  async listOrders(): Promise<Order[]> {
    this.log('📋 Listando orders...')
    
    const { response, data } = await this.makeRequest('/api/pagamento/list-orders?limit=10')
    
    if (data.success) {
      this.log(`✅ ${data.orders?.length || 0} orders encontradas`)
      return data.orders || []
    } else {
      this.log(`❌ Erro ao listar orders: ${data.message}`)
      return []
    }
  }

  async testOrderUpdate(orderId: number, status: string): Promise<boolean> {
    this.log(`🧪 Testando atualização da order ${orderId} para status: ${status}`)
    
    const { response, data } = await this.makeRequest('/api/pagamento/test-webhook', {
      method: 'POST',
      body: JSON.stringify({ orderId, status })
    })
    
    if (data.success) {
      this.log(`✅ Order ${orderId} atualizada com sucesso`)
      return true
    } else {
      this.log(`❌ Erro: ${data.message}`)
      return false
    }
  }

  async simulateWebhook(orderId: number, paymentId: string): Promise<boolean> {
    this.log(`🎭 Simulando webhook para order ${orderId} com payment ${paymentId}`)
    
    const { response, data } = await this.makeRequest('/api/pagamento/simulate-webhook', {
      method: 'POST',
      body: JSON.stringify({ orderId, paymentId, status: 'approved' })
    })
    
    if (data.success) {
      this.log(`✅ Webhook simulado enviado com sucesso`)
      return true
    } else {
      this.log(`❌ Erro: ${data.message}`)
      return false
    }
  }

  async runTests() {
    this.log('🚀 Iniciando testes do webhook...')
    
    try {
      // 1. Listar orders
      const orders = await this.listOrders()
      
      if (orders.length === 0) {
        this.log('⚠️ Nenhuma order encontrada para testar')
        return
      }

      // 2. Pegar a primeira order para teste
      const testOrder = orders[0]
      this.log(`🎯 Usando order ${testOrder.id} para testes`)

      // 3. Testar atualização manual
      await this.testOrderUpdate(testOrder.id, 'pendente')
      await new Promise(resolve => setTimeout(resolve, 1000)) // Aguardar 1s
      
      await this.testOrderUpdate(testOrder.id, 'pago')
      await new Promise(resolve => setTimeout(resolve, 1000)) // Aguardar 1s

      // 4. Testar webhook simulado
      const paymentId = `test_${testOrder.id}_${Date.now()}`
      await this.simulateWebhook(testOrder.id, paymentId)

      // 5. Verificar resultado final
      const updatedOrders = await this.listOrders()
      const updatedOrder = updatedOrders.find(o => o.id === testOrder.id)
      
      if (updatedOrder) {
        this.log(`📊 Status final da order ${testOrder.id}: ${updatedOrder.status}`)
        this.log(`💳 Payment ID: ${updatedOrder.payment_id || 'N/A'}`)
      }

      this.log('✅ Testes concluídos!')
      
    } catch (error: any) {
      this.log(`❌ Erro durante os testes: ${error.message}`)
    }
  }

  printLogs() {
    console.log('\n📋 Logs do teste:')
    console.log('=' .repeat(50))
    this.logs.forEach(log => console.log(log))
    console.log('=' .repeat(50))
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  const tester = new WebhookTester()
  
  tester.runTests()
    .then(() => {
      tester.printLogs()
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error)
      tester.printLogs()
      process.exit(1)
    })
}

export default WebhookTester
