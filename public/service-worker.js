/**
 * Service Worker para Upload em Background
 * 
 * Permite continuar upload mesmo se usuário:
 * - Fechar a aba
 * - Navegar para outro site
 * - Perder conexão temporariamente
 * 
 * Usa Background Sync API
 */

const CACHE_NAME = 'allsee-upload-cache-v1';
const UPLOAD_QUEUE = 'upload-queue';

// Install
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker instalado');
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker ativado');
  event.waitUntil(self.clients.claim());
});

// Background Sync - Continuar uploads pendentes
self.addEventListener('sync', (event) => {
  if (event.tag === UPLOAD_QUEUE) {
    console.log('🔄 Background Sync: Processando uploads pendentes');
    event.waitUntil(processUploadQueue());
  }
});

// Message Handler para comandos do cliente
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'START_UPLOAD':
      await handleStartUpload(payload);
      break;
      
    case 'GET_UPLOAD_STATUS':
      await handleGetStatus(payload);
      break;
      
    case 'CANCEL_UPLOAD':
      await handleCancelUpload(payload);
      break;
  }
});

// Processar fila de uploads
async function processUploadQueue() {
  try {
    // Buscar uploads pendentes do IndexedDB
    const db = await openUploadDB();
    const uploads = await getPendingUploads(db);

    console.log(`📦 ${uploads.length} uploads pendentes na fila`);

    for (const upload of uploads) {
      try {
        await resumeUpload(upload);
        await markUploadComplete(db, upload.id);
        
        // Notificar cliente sobre conclusão
        await notifyClients({
          type: 'upload-complete',
          uploadId: upload.id,
          publicUrl: upload.publicUrl
        });

      } catch (error) {
        console.error(`❌ Erro ao processar upload ${upload.id}:`, error);
        await incrementRetryCount(db, upload.id);
      }
    }

  } catch (error) {
    console.error('❌ Erro ao processar fila:', error);
  }
}

// Retomar upload
async function resumeUpload(upload) {
  const { uploadId, bucket, chunks, completedChunks } = upload;

  // Enviar chunks restantes
  for (let i = 0; i < chunks.length; i++) {
    if (completedChunks.includes(i)) {
      continue; // Chunk já enviado
    }

    const formData = new FormData();
    formData.append('action', 'chunk');
    formData.append('upload_id', uploadId);
    formData.append('chunk_index', i.toString());
    formData.append('total_chunks', chunks.length.toString());
    formData.append('chunk_file', chunks[i]);

    const response = await fetch('/api/admin/upload-direto-storage', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Chunk ${i} falhou`);
    }

    // Atualizar progresso
    await updateChunkProgress(upload.id, i);
  }

  // Finalizar upload
  const finalizeResponse = await fetch('/api/admin/upload-direto-storage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'finalize',
      upload_id: uploadId
    })
  });

  if (!finalizeResponse.ok) {
    throw new Error('Falha ao finalizar upload');
  }

  const result = await finalizeResponse.json();
  upload.publicUrl = result.public_url;

  return result;
}

// IndexedDB helpers
function openUploadDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AllseeUploads', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('uploads')) {
        const store = db.createObjectStore('uploads', { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
      }
    };
  });
}

function getPendingUploads(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['uploads'], 'readonly');
    const store = transaction.objectStore('uploads');
    const index = store.index('status');
    const request = index.getAll('pending');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function markUploadComplete(db, uploadId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['uploads'], 'readwrite');
    const store = transaction.objectStore('uploads');
    const request = store.get(uploadId);

    request.onsuccess = () => {
      const upload = request.result;
      upload.status = 'completed';
      upload.completedAt = Date.now();
      store.put(upload);
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function incrementRetryCount(db, uploadId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['uploads'], 'readwrite');
    const store = transaction.objectStore('uploads');
    const request = store.get(uploadId);

    request.onsuccess = () => {
      const upload = request.result;
      upload.retryCount = (upload.retryCount || 0) + 1;
      
      if (upload.retryCount >= 5) {
        upload.status = 'failed';
      }
      
      store.put(upload);
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function updateChunkProgress(uploadId, chunkIndex) {
  return new Promise(async (resolve) => {
    const db = await openUploadDB();
    const transaction = db.transaction(['uploads'], 'readwrite');
    const store = transaction.objectStore('uploads');
    const request = store.get(uploadId);

    request.onsuccess = () => {
      const upload = request.result;
      if (!upload.completedChunks.includes(chunkIndex)) {
        upload.completedChunks.push(chunkIndex);
      }
      store.put(upload);
    };

    transaction.oncomplete = () => resolve();
  });
}

// Handlers para comandos do cliente
async function handleStartUpload(payload) {
  try {
    const { uploadId, file, bucket, strategy } = payload;
    
    console.log('🚀 Iniciando upload em background:', {
      uploadId,
      fileName: file.name,
      fileSize: Math.round(file.size / (1024 * 1024) * 100) / 100 + 'MB',
      strategy
    });
    
    // Salvar no IndexedDB
    const db = await openUploadDB();
    await saveUploadToDB(db, {
      id: uploadId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileData: file.data,
      bucket,
      strategy,
      status: 'pending',
      percentage: 0,
      startTime: Date.now()
    });
    
    // Iniciar upload baseado na estratégia
    if (strategy === 'presigned') {
      await startPresignedUpload(uploadId, file, bucket);
    } else {
      await startChunkedUpload(uploadId, file, bucket);
    }
    
  } catch (error) {
    console.error('❌ Erro ao iniciar upload:', error);
    await notifyClients({
      type: 'UPLOAD_ERROR',
      payload: {
        uploadId: payload.uploadId,
        error: error.message
      }
    });
  }
}

async function handleGetStatus(payload) {
  try {
    const { uploadId } = payload;
    const db = await openUploadDB();
    const upload = await getUploadFromDB(db, uploadId);
    
    if (upload) {
      await notifyClients({
        type: 'UPLOAD_STATUS',
        payload: upload
      });
    }
  } catch (error) {
    console.error('❌ Erro ao obter status:', error);
  }
}

async function handleCancelUpload(payload) {
  try {
    const { uploadId } = payload;
    const db = await openUploadDB();
    await removeUploadFromDB(db, uploadId);
    
    console.log('🗑️ Upload cancelado:', uploadId);
    
  } catch (error) {
    console.error('❌ Erro ao cancelar upload:', error);
  }
}

// Upload presigned (ultra-rápido)
async function startPresignedUpload(uploadId, file, bucket) {
  try {
    // Obter presigned URL
    const presignedResponse = await fetch('/api/admin/create-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_name: file.name,
        file_type: file.type,
        bucket
      })
    });

    if (!presignedResponse.ok) {
      throw new Error('Erro ao criar presigned URL');
    }

    const presignedResult = await presignedResponse.json();
    
    if (!presignedResult.success) {
      throw new Error(presignedResult.error);
    }

    // Upload direto para Supabase
    const fileBlob = await base64ToBlob(file.data, file.type);
    
    const uploadResponse = await fetch(presignedResult.signed_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: fileBlob
    });

    if (!uploadResponse.ok) {
      throw new Error('Upload falhou');
    }

    // Notificar sucesso
    await notifyClients({
      type: 'UPLOAD_COMPLETE',
      payload: {
        uploadId,
        publicUrl: presignedResult.public_url,
        strategy: 'presigned'
      }
    });

  } catch (error) {
    console.error('❌ Erro no upload presigned:', error);
    await notifyClients({
      type: 'UPLOAD_ERROR',
      payload: {
        uploadId,
        error: error.message
      }
    });
  }
}

// Upload chunked (para arquivos grandes)
async function startChunkedUpload(uploadId, file, bucket) {
  try {
    // Dividir arquivo em chunks
    const chunks = await fileToChunks(file.data, file.type, 2.8); // 2.8MB chunks
    
    // Iniciar upload no servidor
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
      throw new Error('Erro ao iniciar upload');
    }

    const initResult = await initResponse.json();
    
    if (!initResult.success) {
      throw new Error(initResult.error);
    }

    const serverUploadId = initResult.upload_id;

    // Enviar chunks
    for (let i = 0; i < chunks.length; i++) {
      const formData = new FormData();
      formData.append('action', 'chunk');
      formData.append('upload_id', serverUploadId);
      formData.append('chunk_index', i.toString());
      formData.append('total_chunks', chunks.length.toString());
      formData.append('chunk_file', chunks[i], `chunk_${i}`);

      const chunkResponse = await fetch('/api/admin/upload-direto-storage', {
        method: 'POST',
        body: formData
      });

      if (!chunkResponse.ok) {
        throw new Error(`Erro ao enviar chunk ${i}`);
      }

      // Atualizar progresso
      const percentage = Math.round(((i + 1) / chunks.length) * 90); // 90% para chunks
      await notifyClients({
        type: 'UPLOAD_PROGRESS',
        payload: {
          uploadId,
          percentage,
          strategy: 'chunked'
        }
      });
    }

    // Finalizar upload
    const finalizeResponse = await fetch('/api/admin/upload-direto-storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'finalize',
        upload_id: serverUploadId
      })
    });

    if (!finalizeResponse.ok) {
      throw new Error('Erro ao finalizar upload');
    }

    const finalizeResult = await finalizeResponse.json();
    
    if (!finalizeResult.success) {
      throw new Error(finalizeResult.error);
    }

    // Notificar sucesso
    await notifyClients({
      type: 'UPLOAD_COMPLETE',
      payload: {
        uploadId,
        publicUrl: finalizeResult.public_url,
        strategy: 'chunked'
      }
    });

  } catch (error) {
    console.error('❌ Erro no upload chunked:', error);
    await notifyClients({
      type: 'UPLOAD_ERROR',
      payload: {
        uploadId,
        error: error.message
      }
    });
  }
}

// Utilitários
async function base64ToBlob(base64, mimeType) {
  const response = await fetch(base64);
  return response.blob();
}

async function fileToChunks(base64, mimeType, chunkSizeMB) {
  const blob = await base64ToBlob(base64, mimeType);
  const chunkSize = chunkSizeMB * 1024 * 1024;
  const chunks = [];
  
  for (let offset = 0; offset < blob.size; offset += chunkSize) {
    chunks.push(blob.slice(offset, offset + chunkSize));
  }
  
  return chunks;
}

async function saveUploadToDB(db, upload) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['uploads'], 'readwrite');
    const store = transaction.objectStore('uploads');
    const request = store.put(upload);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getUploadFromDB(db, uploadId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['uploads'], 'readonly');
    const store = transaction.objectStore('uploads');
    const request = store.get(uploadId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeUploadFromDB(db, uploadId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['uploads'], 'readwrite');
    const store = transaction.objectStore('uploads');
    const request = store.delete(uploadId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Notificar clientes
async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  
  for (const client of clients) {
    client.postMessage(message);
  }
}

// Fetch - Interceptar requisições se necessário
self.addEventListener('fetch', (event) => {
  // Por enquanto, não interceptar requisições
  // Pode ser usado para cache de assets no futuro
});

