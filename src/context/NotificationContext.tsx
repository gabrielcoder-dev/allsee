'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface NotificationCounts {
  approvals: number;
  replacements: number;
}

interface NotificationContextType {
  counts: NotificationCounts;
  refreshCounts: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [counts, setCounts] = useState<NotificationCounts>({ approvals: 0, replacements: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchApprovalCount = async (): Promise<number> => {
    try {
      // PRIMEIRO: Buscar apenas orders com status "pago"
      const { data: ordersPagas, error: ordersError } = await supabase
        .from('order')
        .select('id')
        .eq('status', 'pago');

      if (ordersError) {
        console.error('Erro ao buscar orders pagas:', ordersError);
        return 0;
      }

      if (!ordersPagas || ordersPagas.length === 0) return 0;

      // Pegar apenas os IDs das orders pagas
      const orderIdsPagas = ordersPagas.map(o => o.id);

      // Buscar artes de campanha apenas das orders pagas
      const { data, error } = await supabase
        .from("arte_campanha")
        .select("id, id_order")
        .in('id_order', orderIdsPagas)
        .order("id", { ascending: false });

      if (error) {
        console.error('Erro ao buscar aprovações:', error);
        return 0;
      }

      if (!data || data.length === 0) return 0;

      // Agrupar por order_id e verificar status
      const pendingOrders = new Set<string>();
      const allOrders = new Set<string>();

      for (const item of data) {
        // Usar id_order se existir, senão usar o id da arte como fallback
        const orderId = item.id_order ?? item.id;
        const orderKey = String(orderId);
        allOrders.add(orderKey);
        
        // Verificar status no localStorage (se não existir, é pendente)
        if (typeof window !== 'undefined') {
          const status = localStorage.getItem(`order_${orderKey}`) || "pendente";
          // Contar apenas se for pendente (não aprovado e não rejeitado)
          if (status !== 'aprovado' && status !== 'rejeitado') {
            pendingOrders.add(orderKey);
          }
        } else {
          // Se não estiver no browser, considerar como pendente
          pendingOrders.add(orderKey);
        }
      }

      console.log('🔍 Debug contagem aprovações:', {
        totalArtes: data.length,
        totalOrders: allOrders.size,
        pendingOrders: pendingOrders.size,
        pendingOrderIds: Array.from(pendingOrders)
      });

      return pendingOrders.size;
    } catch (error) {
      console.error('Erro ao contar aprovações:', error);
      return 0;
    }
  };

  const fetchReplacementCount = async (): Promise<number> => {
    try {
      // PRIMEIRO: Buscar apenas orders com status "pago"
      const { data: ordersPagas, error: ordersError } = await supabase
        .from('order')
        .select('id')
        .eq('status', 'pago');

      if (ordersError) {
        console.error('Erro ao buscar orders pagas:', ordersError);
        return 0;
      }

      if (!ordersPagas || ordersPagas.length === 0) return 0;

      // Pegar apenas os IDs das orders pagas
      const orderIdsPagas = ordersPagas.map(o => o.id);

      // Buscar arte_campanha das orders pagas para pegar os IDs das campanhas
      const { data: arteCampanhasPagas, error: arteError } = await supabase
        .from("arte_campanha")
        .select("id")
        .in('id_order', orderIdsPagas);

      if (arteError) {
        console.error('Erro ao buscar arte_campanha:', arteError);
        return 0;
      }

      if (!arteCampanhasPagas || arteCampanhasPagas.length === 0) return 0;

      const arteCampanhaIdsPagas = arteCampanhasPagas.map(ac => ac.id);

      // Buscar artes de troca pendentes apenas das campanhas pagas
      const { data: replacementData, error: replacementError } = await supabase
        .from("arte_troca_campanha")
        .select("id, id_campanha")
        .in('id_campanha', arteCampanhaIdsPagas)
        .order("id", { ascending: false });

      if (replacementError) {
        console.error('Erro ao buscar substituições:', replacementError);
        return 0;
      }

      if (!replacementData || replacementData.length === 0) return 0;

      // Contar apenas trocas que não foram processadas (não têm status no localStorage)
      let pendingCount = 0;
      const processedTrocas: number[] = [];
      const pendingTrocas: number[] = [];
      
      if (typeof window !== 'undefined') {
        for (const troca of replacementData) {
          const status = localStorage.getItem(`replacement_order_${troca.id_campanha}`);
          // Contar apenas se não tiver status (pendente) ou se o status não for "aceita" ou "não aceita"
          if (!status || (status !== 'aceita' && status !== 'não aceita')) {
            pendingCount++;
            pendingTrocas.push(troca.id_campanha);
          } else {
            processedTrocas.push(troca.id_campanha);
          }
        }
      } else {
        // Se não estiver no browser, contar todas
        pendingCount = replacementData.length;
      }

      console.log('🔍 Debug contagem trocas:', {
        totalTrocas: replacementData.length,
        pendingCount,
        pendingTrocas,
        processedTrocas
      });

      return pendingCount;
    } catch (error) {
      console.error('Erro ao contar substituições:', error);
      return 0;
    }
  };

  const refreshCounts = async () => {
    setIsLoading(true);
    try {
      const [approvalCount, replacementCount] = await Promise.all([
        fetchApprovalCount(),
        fetchReplacementCount()
      ]);

      setCounts({
        approvals: approvalCount,
        replacements: replacementCount
      });

      console.log('📊 Contadores atualizados:', {
        approvals: approvalCount,
        replacements: replacementCount,
        total: approvalCount + replacementCount
      });
    } catch (error) {
      console.error('Erro ao atualizar contadores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshCounts();
    
    // Polling a cada 30 segundos para garantir atualizações
    const interval = setInterval(() => {
      refreshCounts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Escutar eventos de mudança de status
  useEffect(() => {
    const handleStorageChange = () => {
      console.log('🔄 Evento storage detectado, atualizando contadores...');
      refreshCounts();
    };

    const handleApprovalStatusChange = (event: CustomEvent) => {
      console.log('✅ Evento de aprovação detectado:', event.detail);
      refreshCounts();
    };

    const handleReplacementStatusChange = (event: CustomEvent) => {
      console.log('🔄 Evento de substituição detectado:', event.detail);
      refreshCounts();
    };

    // Eventos do localStorage
    window.addEventListener('storage', handleStorageChange);
    
    // Eventos customizados
    window.addEventListener('approvalStatusChanged', handleApprovalStatusChange as EventListener);
    window.addEventListener('replacementStatusChanged', handleReplacementStatusChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('approvalStatusChanged', handleApprovalStatusChange as EventListener);
      window.removeEventListener('replacementStatusChanged', handleReplacementStatusChange as EventListener);
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ counts, refreshCounts, isLoading }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
