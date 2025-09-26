// Armazenamento compartilhado de chunks para upload de arquivos grandes
export interface ChunkData {
  chunks: string[];
  orderId: string;
  userId: string;
  totalChunks: number;
  createdAt: number;
}

// Armazenamento em memória (em produção, usar Redis ou similar)
const chunkStorage = new Map<string, ChunkData>();

export function storeChunk(
  uploadId: string,
  chunkIndex: number,
  chunkData: string,
  orderId: string,
  userId: string,
  totalChunks: number
): void {
  // Inicializar ou atualizar storage
  if (!chunkStorage.has(uploadId)) {
    chunkStorage.set(uploadId, {
      chunks: new Array(totalChunks).fill(''),
      orderId,
      userId,
      totalChunks,
      createdAt: Date.now()
    });
  }

  const upload = chunkStorage.get(uploadId)!;
  upload.chunks[chunkIndex] = chunkData;
  
  console.log(`📦 Chunk ${chunkIndex + 1}/${totalChunks} armazenado para upload ${uploadId}`);
}

export function getChunkData(uploadId: string): ChunkData | null {
  return chunkStorage.get(uploadId) || null;
}

export function removeChunkData(uploadId: string): boolean {
  return chunkStorage.delete(uploadId);
}

export function getAllChunkData(): ChunkData[] {
  return Array.from(chunkStorage.values());
}

export function cleanupOldChunks(): void {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  let removedCount = 0;
  
  for (const [id, data] of chunkStorage.entries()) {
    if (data.createdAt < oneHourAgo) {
      chunkStorage.delete(id);
      removedCount++;
    }
  }
  
  if (removedCount > 0) {
    console.log(`🧹 Limpeza: ${removedCount} uploads antigos removidos`);
  }
}

// Limpeza automática a cada 30 minutos
setInterval(cleanupOldChunks, 30 * 60 * 1000);
