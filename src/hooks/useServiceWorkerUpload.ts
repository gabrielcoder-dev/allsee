import { useEffect, useState, useCallback } from 'react';

/**
 * Hook para registrar Service Worker e gerenciar uploads em background
 * 
 * Permite uploads continuarem mesmo se usuário sair do site!
 * 
 * @example
 * ```tsx
 * const { 
 *   isSupported, 
 *   isRegistered, 
 *   queueUpload 
 * } = useServiceWorkerUpload();
 * 
 * // Fazer upload que continua em background
 * await queueUpload({
 *   file,
 *   uploadId,
 *   bucket: 'arte-campanhas'
 * });
 * 
 * // Mesmo se fechar a aba, upload continua!
 * ```
 */

// Declaração de tipos para Background Sync API
interface SyncManager {
  getTags(): Promise<string[]>;
  register(tag: string): Promise<void>;
}

interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync: SyncManager;
}

interface QueuedUpload {
  id: string;
  uploadId: string;
  bucket: string;
  chunks: Blob[];
  completedChunks: number[];
  status: 'pending' | 'completed' | 'failed';
  createdAt: number;
  retryCount: number;
}

export const useServiceWorkerUpload = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Verificar suporte e registrar Service Worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Verificar suporte de forma segura
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasBackgroundSync = hasServiceWorker && 'sync' in ServiceWorkerRegistration.prototype;
    setIsSupported(hasServiceWorker && hasBackgroundSync);

    if (!hasServiceWorker || !hasBackgroundSync) {
      console.warn('⚠️ Service Worker ou Background Sync não suportado neste browser');
      return;
    }

    // Registrar Service Worker
    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/'
        });

        console.log('✅ Service Worker registrado:', reg);
        setRegistration(reg);
        setIsRegistered(true);

        // Escutar mensagens do Service Worker
        navigator.serviceWorker.addEventListener('message', handleSWMessage);

      } catch (error) {
        console.error('❌ Erro ao registrar Service Worker:', error);
      }
    };

    registerSW();

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
    };
  }, []);

  // Handle messages from Service Worker
  const handleSWMessage = (event: MessageEvent) => {
    const { type, uploadId, publicUrl } = event.data;

    if (type === 'upload-complete') {
      console.log('✅ Upload concluído em background:', uploadId);
      
      // Disparar evento customizado
      window.dispatchEvent(new CustomEvent('background-upload-complete', {
        detail: { uploadId, publicUrl }
      }));
    }
  };

  /**
   * Adicionar upload à fila de background
   */
  const queueUpload = useCallback(async (options: {
    uploadId: string;
    bucket: string;
    chunks: Blob[];
    completedChunks?: number[];
  }): Promise<boolean> => {
    if (!isSupported || !isRegistered) {
      console.warn('⚠️ Background uploads não disponíveis');
      return false;
    }

    try {
      // Salvar no IndexedDB
      const db = await openUploadDB();
      
      const queuedUpload: QueuedUpload = {
        id: `upload-${Date.now()}`,
        uploadId: options.uploadId,
        bucket: options.bucket,
        chunks: options.chunks,
        completedChunks: options.completedChunks || [],
        status: 'pending',
        createdAt: Date.now(),
        retryCount: 0
      };

      await saveUpload(db, queuedUpload);

      // Registrar sync tag (com type assertion para Background Sync API)
      if (registration && 'sync' in registration) {
        const regWithSync = registration as ServiceWorkerRegistrationWithSync;
        await regWithSync.sync.register('upload-queue');
        console.log('✅ Upload adicionado à fila de background');
      }

      return true;

    } catch (error) {
      console.error('❌ Erro ao adicionar upload à fila:', error);
      return false;
    }
  }, [isSupported, isRegistered, registration]);

  /**
   * Obter uploads pendentes
   */
  const getPendingUploads = useCallback(async (): Promise<QueuedUpload[]> => {
    try {
      const db = await openUploadDB();
      return await getUploadsByStatus(db, 'pending');
    } catch (error) {
      console.error('❌ Erro ao buscar uploads pendentes:', error);
      return [];
    }
  }, []);

  /**
   * Limpar uploads completos
   */
  const clearCompletedUploads = useCallback(async (): Promise<void> => {
    try {
      const db = await openUploadDB();
      const completed = await getUploadsByStatus(db, 'completed');
      
      for (const upload of completed) {
        await deleteUpload(db, upload.id);
      }
      
      console.log(`🧹 ${completed.length} uploads completos limpos`);
    } catch (error) {
      console.error('❌ Erro ao limpar uploads:', error);
    }
  }, []);

  return {
    /** Background uploads são suportados */
    isSupported,
    /** Service Worker está registrado */
    isRegistered,
    /** Adicionar upload à fila de background */
    queueUpload,
    /** Obter uploads pendentes */
    getPendingUploads,
    /** Limpar uploads completos */
    clearCompletedUploads
  };
};

// IndexedDB helpers
function openUploadDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AllseeUploads', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('uploads')) {
        const store = db.createObjectStore('uploads', { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
      }
    };
  });
}

function saveUpload(db: IDBDatabase, upload: QueuedUpload): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['uploads'], 'readwrite');
    const store = transaction.objectStore('uploads');
    store.add(upload);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function getUploadsByStatus(db: IDBDatabase, status: string): Promise<QueuedUpload[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['uploads'], 'readonly');
    const store = transaction.objectStore('uploads');
    const index = store.index('status');
    const request = index.getAll(status);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deleteUpload(db: IDBDatabase, uploadId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['uploads'], 'readwrite');
    const store = transaction.objectStore('uploads');
    store.delete(uploadId);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

