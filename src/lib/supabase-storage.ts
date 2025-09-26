// Configurações para Supabase Storage
export const STORAGE_CONFIG = {
  BUCKET_NAME: 'arte-campanhas',
  MAX_FILE_SIZE: 1024 * 1024 * 1024, // 1GB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/mov', 'video/avi', 'video/webm'],
};

// Função para validar tipo de arquivo
export const validateFileType = (file: File): boolean => {
  const allowedTypes = [...STORAGE_CONFIG.ALLOWED_IMAGE_TYPES, ...STORAGE_CONFIG.ALLOWED_VIDEO_TYPES];
  return allowedTypes.includes(file.type);
};

// Função para validar tamanho do arquivo
export const validateFileSize = (file: File): boolean => {
  return file.size <= STORAGE_CONFIG.MAX_FILE_SIZE;
};

// Função para obter tipo de arquivo
export const getFileType = (file: File): 'image' | 'video' | 'unknown' => {
  if (STORAGE_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'image';
  }
  if (STORAGE_CONFIG.ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return 'video';
  }
  return 'unknown';
};
