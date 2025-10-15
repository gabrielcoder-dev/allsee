'use client';

import { useNotifications } from '@/context/NotificationContext';

/**
 * Hook personalizado para facilitar o uso das notificações
 * Fornece métodos convenientes para atualizar contadores e escutar mudanças
 */
export const useNotificationSystem = () => {
  const { counts, refreshCounts, isLoading } = useNotifications();

  /**
   * Força uma atualização dos contadores
   * Útil quando você sabe que houve uma mudança que precisa ser refletida
   */
  const forceRefresh = async () => {
    await refreshCounts();
  };

  /**
   * Verifica se há notificações pendentes
   */
  const hasNotifications = counts.approvals > 0 || counts.replacements > 0;

  /**
   * Retorna o total de notificações
   */
  const totalNotifications = counts.approvals + counts.replacements;

  return {
    counts,
    isLoading,
    hasNotifications,
    totalNotifications,
    forceRefresh,
    refreshCounts
  };
};
