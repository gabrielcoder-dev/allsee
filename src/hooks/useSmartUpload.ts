import { useState, useCallback } from 'react';
import { useOptimizedUpload, UploadProgress as ChunkProgress, UploadResult } from './useOptimizedUpload';
import { usePresignedUpload, UploadProgress as PresignedProgress } from './usePresignedUpload';

/**
 * Hook INTELIGENTE que escolhe automaticamente a melhor estratégia de upload
 * 
 * Estratégias:
 * 1. PRESIGNED (arquivos <= 20MB): Ultra-rápido, direto para Supabase
 * 2. CHUNKED (arquivos > 20MB): Dividido em chunks para estabilidade
 * 
 * Vantagens:
 * - Upload mais rápido para arquivos pequenos/médios
 * - Estabilidade para arquivos grandes
 * - Fallback automático se uma estratégia falhar
 */

export interface UploadProgress {
  chunksUploaded?: number;
  totalChunks?: number;
  percentage: number;
  phase: 'preparing' | 'uploading' | 'finalizing' | 'completed' | 'error';
  fileSizeMB: number;
  currentSpeed?: string;
  estimatedTime?: string;
  strategy?: 'presigned' | 'chunked';
}

interface UseSmartUploadOptions {
  chunkSizeMB?: number;
  parallelUploads?: number;
  chunkTimeout?: number;
  maxRetries?: number;
  onProgress?: (progress: UploadProgress) => void;
}

export const useSmartUpload = (options: UseSmartUploadOptions = {}) => {
  const { onProgress } = options;

  // Hooks para ambas as estratégias
  const chunkedUpload = useOptimizedUpload({
    onProgress: (progress: ChunkProgress) => {
      onProgress?.({
        ...progress,
        strategy: 'chunked'
      });
    }
  });

  const presignedUpload = usePresignedUpload({
    onProgress: (progress: PresignedProgress) => {
      onProgress?.({
        ...progress,
        strategy: 'presigned'
      });
    }
  });

  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState<'presigned' | 'chunked' | null>(null);

  // Função principal que escolhe a estratégia
  const uploadFile = useCallback(async (
    file: File,
    bucket: string = 'arte-campanhas'
  ): Promise<UploadResult | null> => {
    const fileSizeMB = file.size / (1024 * 1024);
    
    try {
      setIsUploading(true);
      setError(null);

      // Estratégia 1: Presigned para arquivos pequenos/médios (<= 20MB)
      if (fileSizeMB <= 20) {
        console.log('🚀 Usando estratégia PRESIGNED (arquivo pequeno/médio)');
        setCurrentStrategy('presigned');
        
        const result = await presignedUpload.uploadFile(file, bucket);
        if (result) {
          return result;
        }
        
        // Se presigned falhar, tentar chunked como fallback
        console.log('⚠️ Presigned falhou, tentando chunked como fallback...');
      }

      // Estratégia 2: Chunked para arquivos grandes (> 20MB) ou fallback
      console.log('🚀 Usando estratégia CHUNKED (arquivo grande ou fallback)');
      setCurrentStrategy('chunked');
      
      const result = await chunkedUpload.uploadFile(file, bucket);
      if (result) {
        return result;
      }

      // Se ambas falharam
      throw new Error('Todas as estratégias de upload falharam');

    } catch (err: any) {
      const errorMessage = err.message || 'Erro desconhecido no upload';
      console.error('❌ Erro no upload inteligente:', errorMessage);
      setError(errorMessage);
      return null;

    } finally {
      setIsUploading(false);
      setCurrentStrategy(null);
    }
  }, [chunkedUpload, presignedUpload]);

  // Progresso unificado
  const progress: UploadProgress = {
    ...(currentStrategy === 'presigned' ? presignedUpload.progress : chunkedUpload.progress),
    strategy: currentStrategy || undefined
  };

  return {
    uploadFile,
    progress,
    isUploading,
    error,
    currentStrategy
  };
};
