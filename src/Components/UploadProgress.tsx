import React from 'react';
import { UploadProgress as ProgressType } from '../hooks/useSmartUpload';

interface UploadProgressProps {
  progress: ProgressType;
  isUploading: boolean;
  error: string | null;
  fileName?: string;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  progress,
  isUploading,
  error,
  fileName
}) => {
  if (!isUploading && !error) {
    return null;
  }

  const getPhaseText = () => {
    switch (progress.phase) {
      case 'preparing':
        return 'Preparando arquivo...';
      case 'uploading':
        return 'Enviando arquivo...';
      case 'finalizing':
        return 'Finalizando upload...';
      case 'completed':
        return 'Upload concluído!';
      case 'error':
        return 'Erro no upload';
      default:
        return 'Processando...';
    }
  };

  const getStrategyText = () => {
    if (!progress.strategy) return '';
    
    switch (progress.strategy) {
      case 'presigned':
        return '🚀 Upload ultra-rápido';
      case 'chunked':
        return '📦 Upload otimizado';
      default:
        return '';
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Erro no upload
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {progress.phase === 'completed' ? (
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-blue-400 animate-spin" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              {getPhaseText()}
            </h3>
            {fileName && (
              <p className="text-xs text-blue-600 mt-1">{fileName}</p>
            )}
          </div>
        </div>
        
        {progress.strategy && (
          <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
            {getStrategyText()}
          </div>
        )}
      </div>

      {/* Barra de progresso */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-blue-600 mb-1">
          <span>{progress.fileSizeMB.toFixed(1)} MB</span>
          <span>{progress.percentage}%</span>
        </div>
        
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Informações de chunks (apenas para upload chunked) */}
      {progress.strategy === 'chunked' && progress.totalChunks && (
        <div className="text-xs text-blue-600 mb-2">
          Chunks: {progress.chunksUploaded || 0}/{progress.totalChunks}
        </div>
      )}

      {/* Métricas de velocidade */}
      <div className="flex justify-between text-xs text-blue-600">
        <span>
          {progress.currentSpeed && (
            <>Velocidade: {progress.currentSpeed}</>
          )}
        </span>
        <span>
          {progress.estimatedTime && (
            <>{progress.estimatedTime}</>
          )}
        </span>
      </div>
    </div>
  );
};
