import { useState, useCallback } from 'react';

/**
 * Hook para upload DIRETO no Supabase Storage (usando presigned URLs)
 * 
 * MUITO MAIS RÁPIDO: Não passa pelo servidor Next.js!
 * - 2-3x mais rápido que upload via API
 * - Sem limite de 4.5MB da Vercel
 * - Upload em uma única requisição (sem chunks para arquivos <50MB)
 * 
 * @example
 * ```tsx
 * const { uploadDirect, progress, isUploading } = useDirectUploadToSupabase();
 * 
 * const result = await uploadDirect(file);
 * console.log('URL:', result.public_url);
 * ```
 */

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadResult {
  public_url: string;
  file_path: string;
  file_size_mb: number;
}

export const useDirectUploadToSupabase = () => {
  const [progress, setProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0
  });
  
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload DIRETO para Supabase (sem passar pelo servidor!)
   */
  const uploadDirect = useCallback(async (
    file: File,
    bucket: string = 'arte-campanhas'
  ): Promise<UploadResult | null> => {
    try {
      setIsUploading(true);
      setError(null);

      const fileSizeMB = Math.round(file.size / (1024 * 1024) * 100) / 100;

      // Validar tamanho (limite Supabase: 50MB)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. Máximo: 50MB');
      }

      console.log('🚀 Upload DIRETO para Supabase:', {
        fileName: file.name,
        fileSize: fileSizeMB + 'MB',
        fileType: file.type,
        bucket
      });

      // 1. Obter presigned URL
      const urlResponse = await fetch('/api/admin/create-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: file.name,
          file_type: file.type,
          bucket
        })
      });

      if (!urlResponse.ok) {
        throw new Error('Erro ao obter URL de upload');
      }

      const { signed_url, public_url, file_path, token } = await urlResponse.json();

      console.log('🔐 Presigned URL obtida:', {
        signed_url: signed_url.substring(0, 100) + '...',
        public_url,
        file_path
      });

      // 2. Upload DIRETO no Supabase Storage com progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Progress tracking
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentage = Math.round((e.loaded / e.total) * 100);
            setProgress({
              loaded: e.loaded,
              total: e.total,
              percentage
            });
            
            console.log(`📊 Progresso: ${percentage}% (${Math.round(e.loaded / 1024 / 1024)}MB / ${Math.round(e.total / 1024 / 1024)}MB)`);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload falhou: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Erro de rede durante upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelado'));
        });

        // PUT direto no Supabase
        xhr.open('PUT', signed_url, true);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.setRequestHeader('x-upsert', 'true'); // Permitir sobrescrever
        
        // Enviar arquivo
        xhr.send(file);
      });

      console.log('✅ Upload DIRETO concluído:', {
        public_url,
        file_path,
        file_size_mb: fileSizeMB
      });

      setProgress({
        loaded: file.size,
        total: file.size,
        percentage: 100
      });

      return {
        public_url,
        file_path,
        file_size_mb: fileSizeMB
      };

    } catch (err: any) {
      const errorMessage = err.message || 'Erro no upload direto';
      console.error('❌ Erro no upload direto:', errorMessage);
      setError(errorMessage);
      return null;

    } finally {
      setIsUploading(false);
    }
  }, []);

  return {
    uploadDirect,
    progress,
    isUploading,
    error
  };
};

