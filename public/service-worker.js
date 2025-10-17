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

