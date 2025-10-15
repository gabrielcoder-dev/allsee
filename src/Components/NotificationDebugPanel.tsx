'use client';

import React from 'react';
import { useNotificationSystem } from '@/hooks/useNotificationSystem';

/**
 * Componente de debug para testar o sistema de notificações
 * Pode ser removido em produção
 */
export const NotificationDebugPanel = () => {
  const { counts, isLoading, hasNotifications, totalNotifications, forceRefresh } = useNotificationSystem();

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50 max-w-xs">
      <h3 className="font-bold text-sm mb-2">🔔 Debug Notificações</h3>
      
      <div className="space-y-2 text-xs">
        <div>
          <span className="font-medium">Aprovações:</span> 
          <span className={`ml-2 px-2 py-1 rounded text-white ${counts.approvals > 0 ? 'bg-red-500' : 'bg-gray-400'}`}>
            {counts.approvals}
          </span>
        </div>
        
        <div>
          <span className="font-medium">Substituições:</span> 
          <span className={`ml-2 px-2 py-1 rounded text-white ${counts.replacements > 0 ? 'bg-red-500' : 'bg-gray-400'}`}>
            {counts.replacements}
          </span>
        </div>
        
        <div>
          <span className="font-medium">Total:</span> 
          <span className={`ml-2 px-2 py-1 rounded text-white ${totalNotifications > 0 ? 'bg-orange-500' : 'bg-gray-400'}`}>
            {totalNotifications}
          </span>
        </div>
        
        <div>
          <span className="font-medium">Status:</span> 
          <span className={`ml-2 ${isLoading ? 'text-yellow-600' : 'text-green-600'}`}>
            {isLoading ? 'Carregando...' : 'Ativo'}
          </span>
        </div>
        
        <div>
          <span className="font-medium">Notificações:</span> 
          <span className={`ml-2 ${hasNotifications ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
            {hasNotifications ? 'SIM' : 'NÃO'}
          </span>
        </div>
      </div>
      
      <button
        onClick={forceRefresh}
        className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded transition-colors"
      >
        🔄 Atualizar
      </button>
    </div>
  );
};
