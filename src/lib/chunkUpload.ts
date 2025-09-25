// Utilitários para upload em chunks (pedaços) para contornar limitações de tamanho

/**
 * Divide uma string base64 em chunks menores
 */
export function splitBase64IntoChunks(base64String: string, chunkSize: number = 5 * 1024 * 1024): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < base64String.length) {
    const end = Math.min(start + chunkSize, base64String.length);
    chunks.push(base64String.slice(start, end));
    start = end;
  }
  
  return chunks;
}

/**
 * Reconstrói uma string base64 a partir de chunks
 */
export function reconstructBase64FromChunks(chunks: string[]): string {
  return chunks.join('');
}

/**
 * Faz upload de arquivo em chunks
 */
export async function uploadFileInChunks(
  base64String: string,
  uploadEndpoint: string,
  metadata: any,
  chunkSize: number = 5 * 1024 * 1024
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    console.log('🚀 Iniciando upload em chunks:', {
      totalSize: base64String.length,
      chunkSize,
      totalChunks: Math.ceil(base64String.length / chunkSize)
    });

    const chunks = splitBase64IntoChunks(base64String, chunkSize);
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Enviar cada chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunkData = {
        uploadId,
        chunkIndex: i,
        totalChunks: chunks.length,
        chunkData: chunks[i],
        metadata: i === 0 ? metadata : null // Enviar metadata apenas no primeiro chunk
      };

      console.log(`📤 Enviando chunk ${i + 1}/${chunks.length}`, {
        chunkSize: chunks[i].length,
        uploadId
      });

      const response = await fetch(`${uploadEndpoint}/chunk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunkData)
      });

      if (!response.ok) {
        throw new Error(`Erro no chunk ${i + 1}: ${response.status} ${response.statusText}`);
      }
    }

    // Finalizar upload
    console.log('✅ Finalizando upload:', uploadId);
    const finalizeResponse = await fetch(`${uploadEndpoint}/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId })
    });

    if (!finalizeResponse.ok) {
      throw new Error(`Erro ao finalizar upload: ${finalizeResponse.status} ${finalizeResponse.statusText}`);
    }

    const result = await finalizeResponse.json();
    console.log('🎉 Upload concluído com sucesso:', result);
    
    return { success: true, data: result };

  } catch (error) {
    console.error('❌ Erro no upload em chunks:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

/**
 * Verifica se o arquivo precisa ser enviado em chunks
 */
export function shouldUseChunkUpload(base64String: string, threshold: number = 10 * 1024 * 1024): boolean {
  return base64String.length > threshold;
}
