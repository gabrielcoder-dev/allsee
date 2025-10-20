import { useState, useCallback } from 'react';

/**
 * Hook para upload em background usando Service Worker
 * 
 * Características:
 * - Upload continua mesmo se o usuário sair da página
 * - Persiste no IndexedDB
 * - Retoma automaticamente após reload
 * - Notificações de progresso
 * - Ideal para checkout do Mercado Pago
 */

export interface BackgroundUploadProgress {
  uploadId: string;
  fileName: string;
  fileSizeMB: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  strategy: 'presigned' | 'chunked';
  error?: string;
  publicUrl?: string;
  startTime: number;
  lastUpdate: number;
}

interface UseBackgroundUploadOptions {
  onProgress?: (progress: BackgroundUploadProgress) => void;
  onComplete?: (result: { uploadId: string; publicUrl: string }) => void;
  onError?: (error: { uploadId: string; error: string }) => void;
}

export const useBackgroundUpload = (options: UseBackgroundUploadOptions = {}) => {
  const { onProgress, onComplete, onError } = options;

  const [uploads, setUploads] = useState<BackgroundUploadProgress[]>([]);
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);

  // Verificar se Service Worker está disponível
  const checkServiceWorker = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      setIsServiceWorkerReady(!!registration);
      return !!registration;
    } catch (error) {
      console.warn('Service Worker não disponível:', error);
      return false;
    }
  }, []);

  // Iniciar upload em background
  const startBackgroundUpload = useCallback(async (
    file: File,
    bucket: string = 'arte-campanhas'
  ): Promise<string> => {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileSizeMB = Math.round(file.size / (1024 * 1024) * 100) / 100;

    const uploadProgress: BackgroundUploadProgress = {
      uploadId,
      fileName: file.name,
      fileSizeMB,
      percentage: 0,
      status: 'pending',
      strategy: fileSizeMB <= 20 ? 'presigned' : 'chunked',
      startTime: Date.now(),
      lastUpdate: Date.now()
    };

    setUploads(prev => [...prev, uploadProgress]);

    // Converter arquivo para base64 para armazenar no IndexedDB
    const fileBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Enviar para Service Worker
    if (isServiceWorkerReady) {
      try {
        await navigator.serviceWorker.ready;
        
        // Enviar mensagem para Service Worker
        navigator.serviceWorker.controller?.postMessage({
          type: 'START_UPLOAD',
          payload: {
            uploadId,
            file: {
              name: file.name,
              type: file.type,
              size: file.size,
              data: fileBase64
            },
            bucket,
            strategy: uploadProgress.strategy
          }
        });

        console.log('🚀 Upload em background iniciado:', {
          uploadId,
          fileName: file.name,
          fileSizeMB,
          strategy: uploadProgress.strategy
        });

        return uploadId;

      } catch (error) {
        console.error('❌ Erro ao iniciar upload em background:', error);
        throw error;
      }
    } else {
      throw new Error('Service Worker não está disponível para upload em background');
    }
  }, [isServiceWorkerReady]);

  // Verificar status de uploads em background
  const checkUploadStatus = useCallback(async (uploadId: string) => {
    if (!isServiceWorkerReady) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Solicitar status do Service Worker
      return new Promise<BackgroundUploadProgress | null>((resolve) => {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };

        navigator.serviceWorker.controller?.postMessage({
          type: 'GET_UPLOAD_STATUS',
          payload: { uploadId }
        }, [messageChannel.port2]);

        // Timeout após 5 segundos
        setTimeout(() => resolve(null), 5000);
      });

    } catch (error) {
      console.error('❌ Erro ao verificar status do upload:', error);
      return null;
    }
  }, [isServiceWorkerReady]);

  // Cancelar upload em background
  const cancelBackgroundUpload = useCallback(async (uploadId: string) => {
    if (!isServiceWorkerReady) return;

    try {
      navigator.serviceWorker.controller?.postMessage({
        type: 'CANCEL_UPLOAD',
        payload: { uploadId }
      });

      setUploads(prev => prev.filter(upload => upload.uploadId !== uploadId));
      
      console.log('🗑️ Upload cancelado:', uploadId);

    } catch (error) {
      console.error('❌ Erro ao cancelar upload:', error);
    }
  }, [isServiceWorkerReady]);

  // Listener para mensagens do Service Worker
  const setupMessageListener = useCallback(() => {
    if (typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'UPLOAD_PROGRESS':
          setUploads(prev => prev.map(upload => 
            upload.uploadId === payload.uploadId 
              ? { ...upload, ...payload, lastUpdate: Date.now() }
              : upload
          ));
          onProgress?.(payload);
          break;

        case 'UPLOAD_COMPLETE':
          setUploads(prev => prev.map(upload => 
            upload.uploadId === payload.uploadId 
              ? { ...upload, ...payload, status: 'completed', lastUpdate: Date.now() }
              : upload
          ));
          onComplete?.(payload);
          break;

        case 'UPLOAD_ERROR':
          setUploads(prev => prev.map(upload => 
            upload.uploadId === payload.uploadId 
              ? { ...upload, ...payload, status: 'error', lastUpdate: Date.now() }
              : upload
          ));
          onError?.(payload);
          break;
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [onProgress, onComplete, onError]);

  // Inicializar
  const initialize = useCallback(async () => {
    await checkServiceWorker();
    return setupMessageListener();
  }, [checkServiceWorker, setupMessageListener]);

  return {
    startBackgroundUpload,
    checkUploadStatus,
    cancelBackgroundUpload,
    initialize,
    uploads,
    isServiceWorkerReady
  };
};
