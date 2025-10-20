import { useState, useCallback } from 'react';

/**
 * Hook para upload ULTRA-RÁPIDO usando presigned URLs
 * 
 * Características:
 * - Upload direto para Supabase Storage (sem intermediário)
 * - 3-5x mais rápido que chunking
 * - Ideal para arquivos até 50MB
 * - Sem limite de timeout da Vercel
 * - Progresso em tempo real
 */

export interface UploadProgress {
  percentage: number;
  phase: 'preparing' | 'uploading' | 'completed' | 'error';
  fileSizeMB: number;
  currentSpeed?: string;
  estimatedTime?: string;
}

export interface UploadResult {
  public_url: string;
  file_path: string;
  file_size_mb: number;
}

interface UsePresignedUploadOptions {
  onProgress?: (progress: UploadProgress) => void;
}

export const usePresignedUpload = (options: UsePresignedUploadOptions = {}) => {
  const { onProgress } = options;

  const [progress, setProgress] = useState<UploadProgress>({
    percentage: 0,
    phase: 'preparing',
    fileSizeMB: 0
  });

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Atualizar progresso
  const updateProgress = useCallback((updates: Partial<UploadProgress>) => {
    const newProgress = { ...progress, ...updates };
    setProgress(newProgress);
    onProgress?.(newProgress);
  }, [progress, onProgress]);

  // Upload usando presigned URL (ULTRA-RÁPIDO)
  const uploadFile = useCallback(async (
    file: File,
    bucket: string = 'arte-campanhas'
  ): Promise<UploadResult | null> => {
    const startTime = Date.now();
    
    try {
      setIsUploading(true);
      setError(null);

      const fileSizeMB = Math.round(file.size / (1024 * 1024) * 100) / 100;

      // Validar tamanho do arquivo
      const maxFileSize = 50 * 1024 * 1024; // 50MB máximo
      if (file.size > maxFileSize) {
        const errorMsg = `Arquivo muito grande. Máximo permitido: 50MB`;
        setError(errorMsg);
        return null;
      }

      // Fase 1: Preparar
      updateProgress({
        phase: 'preparing',
        percentage: 0,
        fileSizeMB
      });

      console.log('🚀 Iniciando upload ULTRA-RÁPIDO (presigned URL):', {
        fileName: file.name,
        fileSize: fileSizeMB + 'MB',
        fileType: file.type,
        bucket
      });

      // Fase 2: Obter presigned URL
      updateProgress({
        percentage: 10
      });

      const presignedResponse = await fetch('/api/admin/create-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: file.name,
          file_type: file.type,
          bucket
        })
      });

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        throw new Error(errorData.error || 'Erro ao criar URL de upload');
      }

      const presignedResult = await presignedResponse.json();
      
      if (!presignedResult.success) {
        throw new Error(presignedResult.error || 'Erro ao criar URL de upload');
      }

      console.log('✅ Presigned URL criada:', {
        path: presignedResult.path,
        expiresIn: '10 minutos'
      });

      // Fase 3: Upload direto para Supabase Storage
      updateProgress({
        phase: 'uploading',
        percentage: 20
      });

      // Criar XMLHttpRequest para monitorar progresso
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 80) + 20; // 20-100%
            
            // Calcular velocidade
            const elapsedTime = (Date.now() - startTime) / 1000;
            const uploadedMB = (event.loaded / (1024 * 1024));
            const speedMBps = uploadedMB / elapsedTime;
            const remainingMB = (event.total - event.loaded) / (1024 * 1024);
            const estimatedTime = remainingMB / speedMBps;
            
            updateProgress({
              percentage,
              currentSpeed: `${speedMBps.toFixed(1)} MB/s`,
              estimatedTime: `${Math.round(estimatedTime)}s restantes`
            });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload falhou: ${xhr.status} ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Erro de rede durante o upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelado'));
        });
      });

      // Configurar e iniciar upload
      xhr.open('PUT', presignedResult.signed_url);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);

      // Aguardar conclusão do upload
      await uploadPromise;

      // Fase 4: Concluído
      const totalTime = (Date.now() - startTime) / 1000;
      const avgSpeed = fileSizeMB / totalTime;

      updateProgress({
        phase: 'completed',
        percentage: 100,
        currentSpeed: `${avgSpeed.toFixed(1)} MB/s`,
        estimatedTime: 'Concluído!'
      });

      console.log('✅ Upload ULTRA-RÁPIDO concluído!', {
        public_url: presignedResult.public_url,
        file_size_mb: fileSizeMB,
        total_time: `${totalTime.toFixed(1)}s`,
        avg_speed: `${avgSpeed.toFixed(1)} MB/s`
      });

      return {
        public_url: presignedResult.public_url,
        file_path: presignedResult.path,
        file_size_mb: fileSizeMB
      };

    } catch (err: any) {
      const errorMessage = err.message || 'Erro desconhecido no upload';
      console.error('❌ Erro no upload presigned:', errorMessage);
      
      setError(errorMessage);
      updateProgress({
        phase: 'error',
        currentSpeed: undefined,
        estimatedTime: undefined
      });

      return null;

    } finally {
      setIsUploading(false);
    }
  }, [updateProgress]);

  return {
    uploadFile,
    progress,
    isUploading,
    error
  };
};
