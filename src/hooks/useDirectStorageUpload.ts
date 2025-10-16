import { useState, useCallback } from 'react';

/**
 * Hook para upload direto de arquivos grandes para Supabase Storage
 * 
 * Divide arquivo em chunks e envia diretamente para o storage,
 * sem passar pelo banco de dados temporariamente.
 * 
 * @example
 * ```tsx
 * const { uploadFile, progress, isUploading, error } = useDirectStorageUpload();
 * 
 * const handleUpload = async (file: File) => {
 *   const result = await uploadFile(file, 'arte-campanhas');
 *   if (result) {
 *     console.log('URL pública:', result.public_url);
 *   }
 * };
 * ```
 */

export interface UploadProgress {
  /** Número de chunks enviados */
  chunksUploaded: number;
  /** Total de chunks */
  totalChunks: number;
  /** Progresso em porcentagem (0-100) */
  percentage: number;
  /** Fase atual do upload */
  phase: 'preparing' | 'uploading' | 'finalizing' | 'completed' | 'error';
  /** Tamanho do arquivo em MB */
  fileSizeMB: number;
}

export interface UploadResult {
  /** URL pública do arquivo */
  public_url: string;
  /** Caminho do arquivo no storage */
  file_path: string;
  /** Tamanho do arquivo em MB */
  file_size_mb: number;
}

interface UseDirectStorageUploadOptions {
  /** Tamanho de cada chunk em MB (padrão: 4MB) */
  chunkSizeMB?: number;
  /** Número de chunks a enviar em paralelo (padrão: 3) */
  parallelUploads?: number;
  /** Timeout por chunk em ms (padrão: 10000 = 10s) */
  chunkTimeout?: number;
  /** Número de tentativas por chunk (padrão: 3) */
  maxRetries?: number;
  /** Callback de progresso */
  onProgress?: (progress: UploadProgress) => void;
}

export const useDirectStorageUpload = (options: UseDirectStorageUploadOptions = {}) => {
  const {
    chunkSizeMB = 2, // 2MB por chunk (considerando expansão Base64 + metadados)
    parallelUploads = 2, // Reduzido para evitar sobrecarga
    chunkTimeout = 15000, // Aumentado para chunks maiores
    maxRetries = 3,
    onProgress
  } = options;

  const [progress, setProgress] = useState<UploadProgress>({
    chunksUploaded: 0,
    totalChunks: 0,
    percentage: 0,
    phase: 'preparing',
    fileSizeMB: 0
  });

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);

  // Atualizar progresso
  const updateProgress = useCallback((updates: Partial<UploadProgress>) => {
    const newProgress = { ...progress, ...updates };
    setProgress(newProgress);
    onProgress?.(newProgress);
  }, [progress, onProgress]);

  // Converter arquivo para chunks base64
  const fileToChunks = useCallback(async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const base64 = (reader.result as string).split(',')[1]; // Remover "data:image/...;base64,"
          // Chunk size em bytes Base64 (considerando expansão ~1.37x + margem de segurança)
          const chunkSize = Math.floor(chunkSizeMB * 1024 * 1024 * 1.2); // Margem de segurança
          const chunks: string[] = [];
          
          for (let i = 0; i < base64.length; i += chunkSize) {
            chunks.push(base64.slice(i, i + chunkSize));
          }
          
          resolve(chunks);
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }, [chunkSizeMB]);

  // Enviar um chunk com retry
  const uploadChunkWithRetry = useCallback(async (
    uploadId: string,
    chunkIndex: number,
    chunkData: string,
    totalChunks: number
  ): Promise<void> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), chunkTimeout);

        const response = await fetch('/api/admin/upload-direto-storage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'chunk',
            upload_id: uploadId,
            chunk_index: chunkIndex,
            chunk_data: chunkData,
            total_chunks: totalChunks
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erro HTTP ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Erro ao enviar chunk');
        }

        // Sucesso!
        return;

      } catch (err: any) {
        lastError = err;
        
        // Se não foi timeout e não é a última tentativa, aguardar antes de tentar novamente
        if (attempt < maxRetries && err.name !== 'AbortError') {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw lastError || new Error(`Falha ao enviar chunk ${chunkIndex}`);
  }, [maxRetries, chunkTimeout]);

  // Função principal de upload
  const uploadFile = useCallback(async (
    file: File,
    bucket: string = 'arte-campanhas'
  ): Promise<UploadResult | null> => {
    try {
      setIsUploading(true);
      setError(null);

      const fileSizeMB = Math.round(file.size / (1024 * 1024) * 100) / 100;

      // Validar tamanho do arquivo (limite Supabase Storage: 50MB)
      const maxFileSize = 50 * 1024 * 1024; // 50MB máximo
      if (file.size > maxFileSize) {
        const errorMsg = `Arquivo muito grande. Máximo permitido: 50MB`;
        setError(errorMsg);
        return null;
      }

      // Fase 1: Preparar
      updateProgress({
        phase: 'preparing',
        chunksUploaded: 0,
        totalChunks: 0,
        percentage: 0,
        fileSizeMB
      });

      console.log('🚀 Iniciando upload direto:', {
        fileName: file.name,
        fileSize: fileSizeMB + 'MB',
        fileType: file.type,
        bucket
      });

      // Converter arquivo para chunks
      const chunks = await fileToChunks(file);
      console.log(`📦 Arquivo dividido em ${chunks.length} chunks`);

      updateProgress({
        totalChunks: chunks.length,
        percentage: 5
      });

      // Fase 2: Iniciar upload no servidor
      const initResponse = await fetch('/api/admin/upload-direto-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'init',
          file_type: file.type,
          total_chunks: chunks.length,
          bucket
        })
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json();
        throw new Error(errorData.error || 'Erro ao iniciar upload');
      }

      const initResult = await initResponse.json();
      
      if (!initResult.success) {
        throw new Error(initResult.error || 'Erro ao iniciar upload');
      }

      const currentUploadId = initResult.upload_id;
      setUploadId(currentUploadId);

      console.log('✅ Upload iniciado:', {
        upload_id: currentUploadId,
        file_path: initResult.file_path
      });

      // Fase 3: Enviar chunks em paralelo
      updateProgress({
        phase: 'uploading',
        percentage: 10
      });

      let chunksUploaded = 0;

      // Enviar chunks em lotes paralelos
      for (let i = 0; i < chunks.length; i += parallelUploads) {
        const batch = [];
        
        for (let j = 0; j < parallelUploads && (i + j) < chunks.length; j++) {
          const chunkIndex = i + j;
          batch.push(
            uploadChunkWithRetry(
              currentUploadId,
              chunkIndex,
              chunks[chunkIndex],
              chunks.length
            )
          );
        }

        // Aguardar todos os chunks do lote
        await Promise.all(batch);

        chunksUploaded += batch.length;

        // Atualizar progresso (10% a 90%)
        const uploadPercentage = 10 + Math.floor((chunksUploaded / chunks.length) * 80);
        
        updateProgress({
          chunksUploaded,
          percentage: uploadPercentage
        });

        console.log(`✅ Progresso: ${chunksUploaded}/${chunks.length} chunks (${uploadPercentage}%)`);
      }

      // Fase 4: Finalizar upload
      updateProgress({
        phase: 'finalizing',
        percentage: 95
      });

      console.log('🔧 Finalizando upload...');

      const finalizeResponse = await fetch('/api/admin/upload-direto-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'finalize',
          upload_id: currentUploadId
        })
      });

      if (!finalizeResponse.ok) {
        const errorData = await finalizeResponse.json();
        throw new Error(errorData.error || 'Erro ao finalizar upload');
      }

      const finalizeResult = await finalizeResponse.json();
      
      if (!finalizeResult.success) {
        throw new Error(finalizeResult.error || 'Erro ao finalizar upload');
      }

      // Sucesso!
      updateProgress({
        phase: 'completed',
        percentage: 100
      });

      console.log('✅ Upload concluído com sucesso!', {
        public_url: finalizeResult.public_url,
        file_size_mb: finalizeResult.file_size_mb
      });

      setUploadId(null);

      return {
        public_url: finalizeResult.public_url,
        file_path: finalizeResult.file_path,
        file_size_mb: finalizeResult.file_size_mb
      };

    } catch (err: any) {
      const errorMessage = err.message || 'Erro desconhecido no upload';
      console.error('❌ Erro no upload:', errorMessage);
      
      setError(errorMessage);
      updateProgress({
        phase: 'error'
      });

      // Tentar abortar upload no servidor
      if (uploadId) {
        try {
          await fetch('/api/admin/upload-direto-storage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'abort',
              upload_id: uploadId
            })
          });
        } catch (abortError) {
          console.warn('⚠️ Não foi possível abortar upload:', abortError);
        }
      }

      return null;

    } finally {
      setIsUploading(false);
    }
  }, [fileToChunks, uploadChunkWithRetry, parallelUploads, updateProgress, uploadId]);

  // Função para abortar upload manualmente
  const abortUpload = useCallback(async () => {
    if (!uploadId) return;

    try {
      await fetch('/api/admin/upload-direto-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'abort',
          upload_id: uploadId
        })
      });

      setUploadId(null);
      setIsUploading(false);
      setError('Upload cancelado pelo usuário');
      
      updateProgress({
        phase: 'error',
        percentage: 0
      });

    } catch (err) {
      console.error('❌ Erro ao abortar upload:', err);
    }
  }, [uploadId, updateProgress]);

  return {
    uploadFile,
    abortUpload,
    progress,
    isUploading,
    error
  };
};

