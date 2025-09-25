// Utilitários para compressão de dados base64

/**
 * Comprime dados base64 usando compressão simples
 * Remove espaços em branco e caracteres desnecessários
 */
export function compressBase64(base64String: string): string {
  try {
    // Remove quebras de linha e espaços em branco
    const cleaned = base64String.replace(/\s/g, '');
    
    // Para vídeos, podemos aplicar uma compressão mais agressiva
    if (cleaned.startsWith('data:video/')) {
      // Para vídeos, apenas limpa os espaços
      return cleaned;
    }
    
    // Para imagens, pode aplicar compressão adicional se necessário
    return cleaned;
  } catch (error) {
    console.error('Erro ao comprimir base64:', error);
    return base64String; // Retorna original em caso de erro
  }
}

/**
 * Descomprime dados base64
 */
export function decompressBase64(compressedString: string): string {
  try {
    // Por enquanto, apenas retorna a string original
    // Futuramente pode implementar descompressão se necessário
    return compressedString;
  } catch (error) {
    console.error('Erro ao descomprimir base64:', error);
    return compressedString;
  }
}

/**
 * Verifica se o arquivo é muito grande para armazenamento direto
 */
export function isFileTooLarge(base64String: string, maxSizeMB: number = 50): boolean {
  try {
    // Calcula o tamanho aproximado em MB
    const sizeInBytes = (base64String.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    return sizeInMB > maxSizeMB;
  } catch (error) {
    console.error('Erro ao calcular tamanho do arquivo:', error);
    return false;
  }
}

/**
 * Otimiza dados base64 para armazenamento
 */
export function optimizeForStorage(base64String: string): {
  optimized: string;
  isOptimized: boolean;
  originalSize: number;
  optimizedSize: number;
} {
  const originalSize = base64String.length;
  const optimized = compressBase64(base64String);
  const optimizedSize = optimized.length;
  const isOptimized = optimizedSize < originalSize;
  
  return {
    optimized,
    isOptimized,
    originalSize,
    optimizedSize
  };
}
