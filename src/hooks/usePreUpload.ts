import { useState, useCallback, useRef } from 'react';
import { useDirectStorageUpload, UploadResult } from './useDirectStorageUpload';

/**
 * Hook para PRE-UPLOAD de arquivos
 * 
 * Permite fazer upload do arquivo ANTES do usuário finalizar o checkout.
 * O arquivo fica pronto e disponível instantaneamente quando o pedido for criado.
 * 
 * @example
 * ```tsx
 * const { preUploadFile, uploadedFile, isUploading, progress } = usePreUpload();
 * 
 * // 1. Usuário seleciona arquivo (faz upload imediatamente)
 * const handleFileSelect = async (file: File) => {
 *   await preUploadFile(file);
 *   // Upload acontece em background!
 * };
 * 
 * // 2. No checkout, arquivo já está pronto
 * const handleCheckout = async () => {
 *   if (uploadedFile) {
 *     await createOrder({
 *       ...orderData,
 *       image_url: uploadedFile.public_url // Instantâneo!
 *     });
 *   }
 * };
 * ```
 */

export interface PreUploadedFile {
  /** URL pública do arquivo */
  public_url: string;
  /** Caminho do arquivo no storage */
  file_path: string;
  /** Tamanho do arquivo em MB */
  file_size_mb: number;
  /** Nome original do arquivo */
  original_name: string;
  /** Timestamp do upload */
  uploaded_at: number;
}

export const usePreUpload = () => {
  const [uploadedFile, setUploadedFile] = useState<PreUploadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Manter referência do arquivo sendo enviado
  const currentUploadRef = useRef<File | null>(null);

  const {
    uploadFile,
    abortUpload,
    progress,
    isUploading,
    error: uploadError
  } = useDirectStorageUpload({
    parallelUploads: 8, // MÁXIMO PARALELISMO para pre-upload
    chunkSizeMB: 2.5,
    chunkTimeout: 25000
  });

  /**
   * Fazer pre-upload do arquivo
   * Upload acontece em background enquanto usuário navega
   */
  const preUploadFile = useCallback(async (
    file: File,
    bucket: string = 'arte-campanhas'
  ): Promise<PreUploadedFile | null> => {
    try {
      setError(null);
      currentUploadRef.current = file;

      console.log('🚀 PRE-UPLOAD iniciado:', {
        fileName: file.name,
        fileSize: Math.round(file.size / (1024 * 1024)) + 'MB',
        bucket
      });

      // Upload em background
      const result = await uploadFile(file, bucket);

      if (!result) {
        throw new Error('Falha no upload');
      }

      // Armazenar resultado
      const preUploadedFile: PreUploadedFile = {
        public_url: result.public_url,
        file_path: result.file_path,
        file_size_mb: result.file_size_mb,
        original_name: file.name,
        uploaded_at: Date.now()
      };

      setUploadedFile(preUploadedFile);
      
      console.log('✅ PRE-UPLOAD concluído:', preUploadedFile);

      return preUploadedFile;

    } catch (err: any) {
      const errorMessage = err.message || 'Erro no pre-upload';
      console.error('❌ Erro no pre-upload:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      currentUploadRef.current = null;
    }
  }, [uploadFile]);

  /**
   * Cancelar upload em andamento
   */
  const cancelUpload = useCallback(async () => {
    await abortUpload();
    currentUploadRef.current = null;
    setUploadedFile(null);
    setError(null);
  }, [abortUpload]);

  /**
   * Limpar arquivo já enviado
   */
  const clearUploadedFile = useCallback(() => {
    setUploadedFile(null);
    setError(null);
  }, []);

  /**
   * Verificar se arquivo ainda é válido (não expirou)
   * Útil se usuário demorar muito entre upload e checkout
   */
  const isFileValid = useCallback((maxAgeMinutes: number = 60): boolean => {
    if (!uploadedFile) return false;
    
    const ageMinutes = (Date.now() - uploadedFile.uploaded_at) / (1000 * 60);
    return ageMinutes < maxAgeMinutes;
  }, [uploadedFile]);

  return {
    /** Fazer pre-upload do arquivo */
    preUploadFile,
    /** Arquivo já enviado (pronto para usar) */
    uploadedFile,
    /** Upload em andamento */
    isUploading,
    /** Progresso do upload */
    progress,
    /** Erro no upload */
    error: error || uploadError,
    /** Cancelar upload */
    cancelUpload,
    /** Limpar arquivo enviado */
    clearUploadedFile,
    /** Verificar se arquivo ainda é válido */
    isFileValid,
    /** Arquivo atual sendo enviado */
    currentFile: currentUploadRef.current
  };
};

