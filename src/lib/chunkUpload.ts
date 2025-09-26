// Sistema de upload em chunks para arquivos grandes
export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB por chunk
export const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB máximo

export function splitIntoChunks(base64Data: string): string[] {
  const chunks: string[] = [];
  
  for (let i = 0; i < base64Data.length; i += CHUNK_SIZE) {
    chunks.push(base64Data.slice(i, i + CHUNK_SIZE));
  }
  
  return chunks;
}

export async function uploadInChunks(
  base64Data: string, 
  orderId: string, 
  userId: string
): Promise<{ success: boolean; arte_campanha_id?: string; error?: string }> {
  
  // Validar tamanho do arquivo
  if (base64Data.length > MAX_FILE_SIZE * 1.3) { // 1.3x para base64
    return { 
      success: false, 
      error: `Arquivo muito grande. Máximo permitido: ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB` 
    };
  }

  // Se arquivo pequeno, upload direto
  if (base64Data.length <= CHUNK_SIZE) {
    try {
      console.log('📤 Upload direto (arquivo pequeno)...');
      const response = await fetch('/api/admin/criar-arte-campanha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_order: orderId,
          caminho_imagem: base64Data,
          id_user: userId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return { success: true, arte_campanha_id: data.arte_campanha_id };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Erro no upload direto' };
      }
    } catch (error: any) {
      console.error('Erro no upload direto:', error);
      return { success: false, error: error.message || 'Erro no upload direto' };
    }
  }
  
  // Para arquivos grandes, usar sistema de chunks
  const chunks = splitIntoChunks(base64Data);
  const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`📦 Iniciando upload em ${chunks.length} chunks para ${orderId}`);
  
  try {
    // Upload de cada chunk
    for (let i = 0; i < chunks.length; i++) {
      const response = await fetch('/api/admin/upload-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          chunkIndex: i,
          totalChunks: chunks.length,
          chunkData: chunks[i],
          orderId,
          userId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erro no chunk ${i}: ${response.statusText}`);
      }
      
      console.log(`✅ Chunk ${i + 1}/${chunks.length} enviado`);
    }
    
    // Finalizar upload
    const finalizeResponse = await fetch('/api/admin/finalize-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId,
        orderId,
        userId
      })
    });
    
    if (!finalizeResponse.ok) {
      throw new Error(`Erro ao finalizar upload: ${finalizeResponse.statusText}`);
    }
    
    const finalizeData = await finalizeResponse.json();
    console.log('✅ Upload finalizado com sucesso:', finalizeData);
    
    return { success: true, arte_campanha_id: finalizeData.arte_campanha_id };
    
  } catch (error) {
    console.error('❌ Erro no upload em chunks:', error);
    return { success: false, error: error.message };
  }
}
