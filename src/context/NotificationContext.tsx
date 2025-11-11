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
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        console.warn('Usuário não autenticado ao buscar aprovações:', authError);
        return 0;
      }
      const userId = authData.user.id;

      // Buscar artes pendentes de aprovação
      const { data, error } = await supabase
        .from("arte_campanha")
        .select("id, order_id:id_order")
        .eq("id_user", userId);

      if (error) {
        console.error('Erro ao buscar aprovações:', error);
        return 0;
      }

      if (!data) return 0;

      const pendingOrders = new Set<string>();

      for (const item of data) {
        const orderId = item.order_id ?? item.id;
        const status = localStorage.getItem(`order_${orderId}`) || "pendente";
        if (status !== 'aprovado' && status !== 'rejeitado') {
          pendingOrders.add(String(orderId));
        }
      }

      return pendingOrders.size;
    } catch (error) {
      console.error('Erro ao contar aprovações:', error);
      return 0;
    }
  };

  const fetchReplacementCount = async (): Promise<number> => {
    try {
      // Buscar artes de troca pendentes
      const { data: replacementData, error: replacementError } = await supabase
        .from("arte_troca_campanha")
        .select("id, id_campanha")
        .order("id", { ascending: false });

      if (replacementError) {
        console.error('Erro ao buscar substituições:', replacementError);
        return 0;
      }

      if (!replacementData) return 0;

      // Filtrar apenas as que não foram aceitas/rejeitadas
      let pendingCount = 0;
      for (const item of replacementData) {
        const status = localStorage.getItem(`replacement_order_${item.id_campanha}`) || "pendente";
        if (status !== 'aceita' && status !== 'não aceita') {
          pendingCount++;
        }
      }

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
        replacements: replacementCount
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
