'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { X, User2, Building, MapPin, Phone, CreditCard, Monitor, Printer, Play, User, Zap } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface OrderData {
  id: number | string
  nome?: string
  cpf?: string
  cnpj?: string
  razao_social?: string
  setor?: string
  telefone?: string
  cep?: string
  endereco?: string
  numero?: string
  bairro?: string
  complemento?: string
  cidade?: string
  estado?: string
  nome_campanha?: string
  preco?: number
  duracao_campanha?: string
  inicio_campanha?: string
}

interface TotemData {
  id: number
  name: string
  image: string
  address: string
  screens: number
  price: number
  display: number
  views: number
  type_screen: string
  nicho?: string
}

interface OrderDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: number | string
}

export default function OrderDetailsModal({ isOpen, onClose, orderId }: OrderDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'dados' | 'totens'>('dados')
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [totems, setTotems] = useState<TotemData[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderData()
    }
  }, [isOpen, orderId])

  const fetchOrderData = async () => {
    setLoading(true)
    try {
      // Buscar dados do pedido
      const { data: order, error: orderError } = await supabase
        .from('order')
        .select('*')
        .eq('id', typeof orderId === 'number' ? orderId : orderId.toString())
        .single()

      if (orderError) {
        console.error('Erro ao buscar dados do pedido:', orderError)
        return
      }

      setOrderData(order)

      // Buscar totens se houver id_produto
      if (order.id_produto) {
        const productIds = order.id_produto.split(',').map((id: string) => id.trim())
        
        const { data: totemsData, error: totemsError } = await supabase
          .from('anuncios')
          .select('*')
          .in('id', productIds)

        if (totemsError) {
          console.error('Erro ao buscar totens:', totemsError)
        } else {
          setTotems(totemsData || [])
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-2 md:p-4">
      <div className="bg-white rounded-lg md:rounded-2xl shadow-xl w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-6 border-b border-gray-200">
          <h2 className="text-lg md:text-2xl font-bold text-gray-800">Campanha</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('dados')}
            className={`px-3 md:px-6 py-2 md:py-3 font-medium text-xs md:text-sm transition-colors ${
              activeTab === 'dados'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Dados da Compra
          </button>
          <button
            onClick={() => setActiveTab('totens')}
            className={`px-3 md:px-6 py-2 md:py-3 font-medium text-xs md:text-sm transition-colors ${
              activeTab === 'totens'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Totens
          </button>
        </div>

        {/* Content */}
        <div className="p-3 md:p-6 overflow-y-auto max-h-[65vh] md:max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Carregando...</div>
            </div>
          ) : (
            <>
              {activeTab === 'dados' && (
                <div className="space-y-4 md:space-y-6">
                  {orderData ? (
                    <>
                      {/* Informações Pessoais */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {/* Pessoa Física */}
                        {orderData.nome && (
                          <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                            <h3 className="font-semibold text-gray-800 mb-2 md:mb-3 flex items-center gap-2">
                              <User2 className="w-4 h-4 text-orange-600" />
                              Pessoa Física
                            </h3>
                            <div className="space-y-2 text-xs md:text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Nome:</span>
                                <span className="font-medium">{orderData.nome || '-'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">CPF:</span>
                                <span className="font-medium">{orderData.cpf || '-'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Telefone:</span>
                                <span className="font-medium">{orderData.telefone || '-'}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Pessoa Jurídica */}
                        {orderData.cnpj && (
                          <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                            <h3 className="font-semibold text-gray-800 mb-2 md:mb-3 flex items-center gap-2">
                              <Building className="w-4 h-4 text-orange-600" />
                              Pessoa Jurídica
                            </h3>
                            <div className="space-y-2 text-xs md:text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">CNPJ:</span>
                                <span className="font-medium">{orderData.cnpj || '-'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Razão Social:</span>
                                <span className="font-medium">{orderData.razao_social || '-'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Setor:</span>
                                <span className="font-medium">{orderData.setor || '-'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Telefone:</span>
                                <span className="font-medium">{orderData.telefone || '-'}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Endereço */}
                      <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                        <h3 className="font-semibold text-gray-800 mb-2 md:mb-3 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-orange-600" />
                          Endereço
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">CEP:</span>
                            <span className="font-medium">{orderData.cep || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Endereço:</span>
                            <span className="font-medium">{orderData.endereco || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Número:</span>
                            <span className="font-medium">{orderData.numero || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Bairro:</span>
                            <span className="font-medium">{orderData.bairro || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Complemento:</span>
                            <span className="font-medium">{orderData.complemento || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Cidade:</span>
                            <span className="font-medium">{orderData.cidade || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Estado:</span>
                            <span className="font-medium">{orderData.estado || '-'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Informações da Campanha */}
                      <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                        <h3 className="font-semibold text-gray-800 mb-2 md:mb-3 flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-orange-600" />
                          Campanha
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Nome:</span>
                            <span className="font-medium">{orderData.nome_campanha || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Duração:</span>
                            <span className="font-medium">{orderData.duracao_campanha || '-'} semana(s)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Início:</span>
                            <span className="font-medium">{orderData.inicio_campanha || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Preço:</span>
                            <span className="font-medium">
                              {orderData.preco ? `R$ ${orderData.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Dados não encontrados
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'totens' && (
                <div>
                  {totems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                      {totems.map((totem) => (
                        <div
                          key={totem.id}
                          className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 shadow-sm"
                        >
                          <div className="aspect-video bg-gray-100 rounded-lg mb-3 overflow-hidden">
                            <img
                              src={totem.image}
                              alt={totem.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          <div className="flex gap-2 mb-2">
                            {totem.type_screen?.toLowerCase() === 'impresso' ? (
                              <span className="bg-green-600 text-white text-xs px-2 py-1 rounded font-medium flex items-center gap-1">
                                <Printer className="w-3 h-3" />
                                impresso
                              </span>
                            ) : (
                              <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded font-medium flex items-center gap-1">
                                <Monitor className="w-3 h-3" />
                                digital
                              </span>
                            )}
                          </div>

                          {/* Nome do totem */}
                          <h3 className="font-bold text-sm md:text-base mb-1 line-clamp-2">{totem.name}</h3>
                          
                          {/* Endereço */}
                          <div className="text-gray-500 text-xs mb-2 break-words">{totem.address}</div>
                          
                          {/* Estatísticas */}
                          <div className="flex gap-2 md:gap-4 lg:gap-8 mb-2">
                            <div className="flex flex-col items-start">
                              <span className="text-[10px] text-gray-500 font-medium lowercase flex items-center gap-1">
                                <Play className="w-3 h-3" />
                                exibições
                              </span>
                              <span className="font-bold text-sm">{formatarMilhar(totem.display)}</span>
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="text-[10px] text-gray-500 font-medium lowercase flex items-center gap-1">
                                <User className="w-3 h-3" />
                                alcance
                              </span>
                              <span className="font-bold text-sm">{formatarMilhar(totem.views)}</span>
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="text-[10px] text-gray-500 font-medium lowercase flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                impacto
                              </span>
                              <span className="font-bold text-sm">{formatarMilhar(totem.views * 3)}</span>
                            </div>
                          </div>
                          
                          {/* Telas */}
                          <div className="text-xs text-gray-800 mb-2 font-bold">Telas: {totem.screens || 1}</div>
                          
                          {/* Preço */}
                          <div className="text-base md:text-lg font-bold mb-1 text-green-700">
                            R$ {Number(totem.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-gray-500">
                            / {orderData?.duracao_campanha || 2} semanas
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum totem encontrado
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function formatarMilhar(valor: number) {
  if (valor >= 1000) {
    return (valor / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' mil'
  }
  return valor?.toLocaleString('pt-BR')
}

